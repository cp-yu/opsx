import { promises as fs } from 'fs';
import path from 'path';
import { execFile, spawn } from 'child_process';
import { promisify } from 'util';
import { getTaskProgressForChange, formatTaskStatus } from '../utils/task-progress.js';
import { Validator } from './validation/validator.js';
import chalk from 'chalk';
import {
  assessChangeSyncState,
  applyPreparedChangeSync,
  getPendingChangeSync,
  prepareChangeSync,
} from './change-sync.js';
import {
  checkArchiveCompatibility,
  checkFreshness,
  formatVerifyGateFailure,
} from './verify/freshness.js';
import { selectActiveChange } from './change-utils.js';
import { readProjectConfig } from './project-config.js';
import { generateMergeMessage, writeManualMergeMessageDraft } from './archive/merge-message.js';

const execFileAsync = promisify(execFile);

interface ApplyIsolationState {
  method?: 'branch' | 'worktree' | 'none';
  branchName?: string;
  worktreePath?: string;
  originalBranch?: string;
}

interface GitCommandResult {
  stdout: string;
  stderr: string;
  code: number;
}

/**
 * Recursively copy a directory. Used when fs.rename fails (e.g. EPERM on Windows).
 */
async function copyDirRecursive(src: string, dest: string): Promise<void> {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      await copyDirRecursive(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
}

/**
 * Move a directory from src to dest. On Windows, fs.rename() often fails with
 * EPERM when the directory is non-empty or another process has it open (IDE,
 * file watcher, antivirus). Fall back to copy-then-remove when rename fails
 * with EPERM or EXDEV.
 */
async function moveDirectory(src: string, dest: string): Promise<void> {
  try {
    await fs.rename(src, dest);
  } catch (err: any) {
    const code = err?.code;
    if (code === 'EPERM' || code === 'EXDEV') {
      await copyDirRecursive(src, dest);
      await fs.rm(src, { recursive: true, force: true });
    } else {
      throw err;
    }
  }
}

async function readApplyIsolationState(changeDir: string): Promise<ApplyIsolationState | null> {
  try {
    const content = await fs.readFile(path.join(changeDir, '.apply-isolation.json'), 'utf-8');
    const parsed = JSON.parse(content) as ApplyIsolationState;
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function toPosixProjectPath(projectRoot: string, filePath: string): string {
  return path.relative(projectRoot, filePath).split(path.sep).join('/');
}

async function runGit(projectRoot: string, args: string[], input?: string): Promise<GitCommandResult> {
  return await new Promise((resolve, reject) => {
    const child = spawn('git', args, { cwd: projectRoot, windowsHide: true });
    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (chunk) => {
      stdout += chunk;
    });
    child.stderr?.on('data', (chunk) => {
      stderr += chunk;
    });
    child.on('error', reject);
    child.on('close', (code) => {
      resolve({ stdout, stderr, code: code ?? 0 });
    });

    if (input !== undefined) {
      child.stdin.end(input);
    } else {
      child.stdin.end();
    }
  });
}

async function isGitRepository(projectRoot: string): Promise<boolean> {
  const result = await runGit(projectRoot, ['rev-parse', '--is-inside-work-tree']);
  return result.code === 0;
}

async function resolveOriginalBranch(projectRoot: string, isolation: ApplyIsolationState | null): Promise<string | null> {
  if (isolation?.originalBranch) {
    return isolation.originalBranch;
  }

  const result = await runGit(projectRoot, ['symbolic-ref', 'refs/remotes/origin/HEAD', '--short']);
  if (result.code !== 0) {
    return null;
  }

  const branch = result.stdout.trim().replace(/^origin\//, '');
  return branch || null;
}

async function findArchivedChangePathAsync(archiveDir: string, changeName: string): Promise<string | null> {
  try {
    const entries = await fs.readdir(archiveDir, { withFileTypes: true });
    const matches = entries
      .filter((entry) => entry.isDirectory() && entry.name.endsWith(`-${changeName}`))
      .map((entry) => entry.name)
      .sort()
      .reverse();
    return matches[0] ? path.join(archiveDir, matches[0]) : null;
  } catch {
    return null;
  }
}

async function currentBranch(projectRoot: string): Promise<string | null> {
  const result = await runGit(projectRoot, ['branch', '--show-current']);
  if (result.code !== 0) {
    return null;
  }
  return result.stdout.trim() || null;
}

async function runArchiveCommit(projectRoot: string, changeName: string, archivePath: string): Promise<void> {
  const archiveRelativePath = toPosixProjectPath(projectRoot, archivePath);
  const addResult = await runGit(projectRoot, ['add', '--', archiveRelativePath]);
  if (addResult.code !== 0) {
    throw new Error(addResult.stderr.trim() || 'git add archive path failed');
  }

  const message = `docs(${changeName}): 归档变更制品

## Changes
- ${archiveRelativePath}/: 移动 change 目录到归档区
`;
  const result = await runGit(projectRoot, ['commit', '--only', '-F', '-', '--', archiveRelativePath], message);
  if (result.code !== 0) {
    throw new Error(result.stderr.trim() || 'git commit failed');
  }
}

async function runBranchCleanup(
  projectRoot: string,
  originalBranch: string,
  featureBranch: string,
  deleteAfterArchive: boolean | undefined,
  strategy: 'no-ff' | 'ff-only' | 'squash' | undefined
): Promise<void> {
  if (!deleteAfterArchive || strategy === 'squash') {
    return;
  }

  const merged = await runGit(projectRoot, ['branch', '--merged', originalBranch]);
  if (merged.code !== 0 || !merged.stdout.split('\n').some((line) => line.replace(/^[* ]\s*/, '').trim() === featureBranch)) {
    return;
  }

  const result = await runGit(projectRoot, ['branch', '-d', featureBranch]);
  if (result.code !== 0) {
    throw new Error(result.stderr.trim() || `git branch -d ${featureBranch} failed`);
  }
}

async function runArchiveMerge(
  projectRoot: string,
  archivePath: string,
  isolation: ApplyIsolationState | null,
  config: ReturnType<typeof readProjectConfig>
): Promise<void> {
  const originalBranch = await resolveOriginalBranch(projectRoot, isolation);
  if (!originalBranch) {
    return;
  }

  const projectConfig = config ?? readProjectConfig(projectRoot);
  const mergeConfig = projectConfig?.git?.merge ?? { strategy: 'no-ff' as const, messageFrom: 'artifacts' as const };
  const branchConfig = projectConfig?.git?.branch ?? { deleteAfterArchive: false };
  const featureBranch = isolation?.branchName ?? await currentBranch(projectRoot);

  if (!featureBranch || featureBranch === originalBranch) {
    return;
  }

  if (mergeConfig?.messageFrom === 'manual') {
    const draftPath = await writeManualMergeMessageDraft(archivePath);
    console.log(`Manual merge message draft written to ${draftPath}`);
    return;
  }

  const checkoutResult = await runGit(projectRoot, ['checkout', originalBranch]);
  if (checkoutResult.code !== 0) {
    throw new Error(checkoutResult.stderr.trim() || `Unable to checkout ${originalBranch}`);
  }

  if (mergeConfig?.strategy === 'ff-only') {
    const mergeResult = await runGit(projectRoot, ['merge', '--ff-only', featureBranch]);
    if (mergeResult.code !== 0) {
      throw new Error(mergeResult.stderr.trim() || 'git merge --ff-only failed');
    }
    await runBranchCleanup(projectRoot, originalBranch, featureBranch, branchConfig?.deleteAfterArchive, mergeConfig?.strategy);
    return;
  }

  if (mergeConfig?.strategy === 'squash') {
    const squashResult = await runGit(projectRoot, ['merge', '--squash', featureBranch]);
    if (squashResult.code !== 0) {
      throw new Error(squashResult.stderr.trim() || 'git merge --squash failed');
    }
    const message = await generateMergeMessage(archivePath);
    const commitResult = await runGit(projectRoot, ['commit', '-F', '-'], message.toString());
    if (commitResult.code !== 0) {
      throw new Error(commitResult.stderr.trim() || 'git commit failed');
    }
    await runBranchCleanup(projectRoot, originalBranch, featureBranch, branchConfig?.deleteAfterArchive, mergeConfig?.strategy);
    return;
  }

  const mergeMessage = await generateMergeMessage(archivePath);
  const mergeResult = await runGit(projectRoot, ['merge', '--no-ff', '--no-commit', featureBranch]);
  if (mergeResult.code !== 0) {
    await runGit(projectRoot, ['merge', '--abort']);
    const detail = (mergeResult.stderr || mergeResult.stdout).trim();
    throw new Error(`合并 originalBranch 时发生冲突；已 abort，请手动解决冲突后重跑 archive${detail ? `\n${detail}` : ''}`);
  }

  const commitCheck = await runGit(projectRoot, ['diff', '--cached', '--quiet']);
  if (commitCheck.code !== 0 && commitCheck.code !== 1) {
    throw new Error(commitCheck.stderr.trim() || 'git diff --cached failed');
  }
  if (commitCheck.code === 1) {
    const commitResult = await runGit(projectRoot, ['commit', '-F', '-'], mergeMessage.toString());
    if (commitResult.code !== 0) {
      throw new Error(commitResult.stderr.trim() || 'git commit failed');
    }
  }

  await runBranchCleanup(projectRoot, originalBranch, featureBranch, branchConfig?.deleteAfterArchive, mergeConfig?.strategy);
}

export class ArchiveCommand {
  async execute(
    changeName?: string,
    options: { yes?: boolean; skipSpecs?: boolean; noValidate?: boolean; validate?: boolean; noVerify?: boolean; verify?: boolean } = {}
  ): Promise<void> {
    const targetPath = '.';
    const changesDir = path.join(targetPath, 'openspec', 'changes');
    const archiveDir = path.join(changesDir, 'archive');
    // Check if changes directory exists
    try {
      await fs.access(changesDir);
    } catch {
      throw new Error("No OpenSpec changes directory found. Run 'openspec init' first.");
    }

    // Get change name interactively if not provided
    if (!changeName) {
      const selectedChange = await selectActiveChange(changesDir, {
        message: 'Select a change to archive',
      });
      if (!selectedChange) {
        console.log('No change selected. Aborting.');
        return;
      }
      changeName = selectedChange;
    }

    const changeDir = path.join(changesDir, changeName);
    const archivedChangePath = await findArchivedChangePathAsync(archiveDir, changeName);
    let archivePath = archivedChangePath;
    let isolationState: ApplyIsolationState | null = null;
    let activeChangeExists = false;

    // Verify change exists
    try {
      const stat = await fs.stat(changeDir);
      if (!stat.isDirectory()) {
        throw new Error(`Change '${changeName}' not found.`);
      }
      activeChangeExists = true;
      isolationState = await readApplyIsolationState(changeDir);
    } catch {
      if (!archivePath) {
        throw new Error(`Change '${changeName}' not found.`);
      }
      isolationState = await readApplyIsolationState(archivePath);
    }

    if (!activeChangeExists && archivePath) {
      const handledBranchSwitch = await this.runArchiveGitFlow(targetPath, changeName, archivePath, isolationState, false);
      await this.handleApplyIsolationCleanup(isolationState, targetPath, options, handledBranchSwitch);
      return;
    }

    const syncState = await assessChangeSyncState(targetPath, changeName);
    const pendingSync = syncState.requiresSync
      ? await getPendingChangeSync(targetPath, syncState)
      : null;

    const skipValidation = options.validate === false || options.noValidate === true;
    const skipVerify = options.verify === false || options.noVerify === true;
    if (!skipVerify) {
      const freshness = await checkFreshness(changeDir, targetPath);
      const compatibility = freshness.verifyResult
        ? checkArchiveCompatibility(freshness.verifyResult)
        : undefined;
      const failures: string[] = [];

      if (freshness.status !== 'FRESH' || !compatibility?.compatible) {
        failures.push(
          formatVerifyGateFailure(freshness, compatibility, {
            changeName,
            command: 'archive',
          })
        );
      }
      if (pendingSync && (pendingSync.specs > 0 || pendingSync.opsx)) {
        failures.push('Sync gate failed: pending delta specs or OPSX delta. Run openspec sync <change-name> first, or pass --no-verify to bypass.');
      }
      if (failures.length > 0) {
        throw new Error(failures.join('\n\n'));
      }
    }

    // Validate specs and change before archiving
    if (!skipValidation) {
      const validator = new Validator();
      let hasValidationErrors = false;

      // Validate proposal.md (non-blocking unless strict mode desired in future)
      const changeFile = path.join(changeDir, 'proposal.md');
      try {
        await fs.access(changeFile);
        const changeReport = await validator.validateChange(changeFile);
        // Proposal validation is informative only (do not block archive)
        if (!changeReport.valid) {
          console.log(chalk.yellow(`\nProposal warnings in proposal.md (non-blocking):`));
          for (const issue of changeReport.issues) {
            const symbol = issue.level === 'ERROR' ? '⚠' : (issue.level === 'WARNING' ? '⚠' : 'ℹ');
            console.log(chalk.yellow(`  ${symbol} ${issue.message}`));
          }
        }
      } catch {
        // Change file doesn't exist, skip validation
      }

      // Validate delta-formatted spec files under the change directory if present
      const changeSpecsDir = path.join(changeDir, 'specs');
      let hasDeltaSpecs = false;
      try {
        const candidates = await fs.readdir(changeSpecsDir, { withFileTypes: true });
        for (const c of candidates) {
          if (c.isDirectory()) {
            try {
              const candidatePath = path.join(changeSpecsDir, c.name, 'spec.md');
              await fs.access(candidatePath);
              const content = await fs.readFile(candidatePath, 'utf-8');
              if (/^##\s+(ADDED|MODIFIED|REMOVED|RENAMED)\s+Requirements/m.test(content)) {
                hasDeltaSpecs = true;
                break;
              }
            } catch {}
          }
        }
      } catch {}
      if (hasDeltaSpecs && (!pendingSync || pendingSync.specs > 0)) {
        const deltaReport = await validator.validateChangeDeltaSpecs(changeDir);
        if (!deltaReport.valid) {
          hasValidationErrors = true;
          console.log(chalk.red(`\nValidation errors in change delta specs:`));
          for (const issue of deltaReport.issues) {
            if (issue.level === 'ERROR') {
              console.log(chalk.red(`  ✗ ${issue.message}`));
            } else if (issue.level === 'WARNING') {
              console.log(chalk.yellow(`  ⚠ ${issue.message}`));
            }
          }
        }
      }

      if (hasValidationErrors) {
        console.log(chalk.red('\nValidation failed. Please fix the errors before archiving.'));
        console.log(chalk.yellow('To skip validation (not recommended), use --no-validate flag.'));
        return;
      }
    } else {
      // Log warning when validation is skipped
      const timestamp = new Date().toISOString();
      
      if (!options.yes) {
        const { confirm } = await import('@inquirer/prompts');
        const proceed = await confirm({
          message: chalk.yellow('⚠️  WARNING: Skipping validation may archive invalid specs. Continue? (y/N)'),
          default: false
        });
        if (!proceed) {
          console.log('Archive cancelled.');
          return;
        }
      } else {
        console.log(chalk.yellow(`\n⚠️  WARNING: Skipping validation may archive invalid specs.`));
      }
      
      console.log(chalk.yellow(`[${timestamp}] Validation skipped for change: ${changeName}`));
      console.log(chalk.yellow(`Affected files: ${changeDir}`));
    }

    // Show progress and check for incomplete tasks
    const progress = await getTaskProgressForChange(changesDir, changeName);
    const status = formatTaskStatus(progress);
    console.log(`Task status: ${status}`);

    const incompleteTasks = Math.max(progress.total - progress.completed, 0);
    if (incompleteTasks > 0) {
      if (!options.yes) {
        const { confirm } = await import('@inquirer/prompts');
        const proceed = await confirm({
          message: `Warning: ${incompleteTasks} incomplete task(s) found. Continue?`,
          default: false
        });
        if (!proceed) {
          console.log('Archive cancelled.');
          return;
        }
      } else {
        console.log(`Warning: ${incompleteTasks} incomplete task(s) found. Continuing due to --yes flag.`);
      }
    }

    // Handle archive-time sync unless skipSpecs flag is set
    if (options.skipSpecs) {
      console.log('Skipping archive-time sync writes (--skip-specs flag provided).');
    } else {
      if (syncState.requiresSync) {
        try {
          const preparedSync = await prepareChangeSync(targetPath, syncState, { skipValidation });
          if (preparedSync.specs.writes.length === 0 && !preparedSync.opsx) {
            console.log('No archive-time sync required.');
          } else {
            const syncTargets: string[] = [];
            if (preparedSync.specs.writes.length > 0) {
              syncTargets.push(`${preparedSync.specs.writes.length} spec update(s)`);
            }
            if (preparedSync.opsx) {
              syncTargets.push('OPSX delta');
            }
            console.log(`Archive sync state: ${syncTargets.join(' + ')} pending.`);
            await applyPreparedChangeSync(targetPath, preparedSync);
          }
        } catch (err: any) {
          console.log(String(err.message || err));
          console.log('Aborted. No files were changed.');
          return;
        }
      } else {
        console.log('No archive-time sync required.');
      }
    }

    // Create archive directory with date prefix
    const archiveName = `${this.getArchiveDate()}-${changeName}`;
    archivePath = path.join(archiveDir, archiveName);

    // Check if archive already exists
    try {
      await fs.access(archivePath);
      throw new Error(`Archive '${archiveName}' already exists.`);
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }

    // Create archive directory if needed
    await fs.mkdir(archiveDir, { recursive: true });

    // Move change to archive (uses copy+remove on EPERM/EXDEV, e.g. Windows)
    await moveDirectory(changeDir, archivePath);

    console.log(`Change '${changeName}' archived as '${archiveName}'.`);

    const handledBranchSwitch = await this.runArchiveGitFlow(targetPath, changeName, archivePath, isolationState, true);
    await this.handleApplyIsolationCleanup(isolationState, targetPath, options, handledBranchSwitch);
  }

  private async runArchiveGitFlow(
    projectRoot: string,
    changeName: string,
    archivePath: string,
    isolation: ApplyIsolationState | null,
    createArchiveCommit: boolean
  ): Promise<boolean> {
    if (!await isGitRepository(projectRoot)) {
      return false;
    }

    if (createArchiveCommit) {
      await runArchiveCommit(projectRoot, changeName, archivePath);
    }
    await runArchiveMerge(projectRoot, archivePath, isolation, readProjectConfig(projectRoot));
    return Boolean(isolation?.originalBranch);
  }

  private async handleApplyIsolationCleanup(
    isolation: ApplyIsolationState | null,
    projectRoot: string,
    options: { yes?: boolean },
    branchSwitchHandled: boolean
  ): Promise<void> {
    if (!isolation) {
      return;
    }

    if (isolation.method === 'worktree' && isolation.worktreePath) {
      const normalizedWorktreePath = path.normalize(path.resolve(projectRoot, isolation.worktreePath));
      if (options.yes) {
        console.log(`Worktree cleanup skipped under --yes: ${normalizedWorktreePath}`);
      } else {
        const { confirm } = await import('@inquirer/prompts');
        const removeWorktree = await confirm({
          message: `Delete worktree directory ${normalizedWorktreePath}?`,
          default: false,
        });
        if (removeWorktree) {
          await execFileAsync('git', ['worktree', 'remove', normalizedWorktreePath], { cwd: projectRoot });
          console.log(`Removed worktree: ${normalizedWorktreePath}`);
        }
      }
    }

    if (isolation.originalBranch && !branchSwitchHandled) {
      if (options.yes) {
        console.log(`Branch switch skipped under --yes: ${isolation.originalBranch}`);
      } else {
        const { confirm } = await import('@inquirer/prompts');
        const switchBack = await confirm({
          message: `Switch back to original branch ${isolation.originalBranch}?`,
          default: false,
        });
        if (switchBack) {
          await execFileAsync('git', ['checkout', isolation.originalBranch], { cwd: projectRoot });
          console.log(`Switched back to branch: ${isolation.originalBranch}`);
        }
      }
    }
  }

  private getArchiveDate(): string {
    // Returns date in YYYY-MM-DD format
    return new Date().toISOString().split('T')[0];
  }
}
