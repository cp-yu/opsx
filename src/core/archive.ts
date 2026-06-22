import { promises as fs } from 'fs';
import path from 'path';
import { getTaskProgressForChange, formatTaskStatus } from '../utils/task-progress.js';
import { Validator } from './validation/validator.js';
import chalk from 'chalk';
import {
  assessChangeSyncState,
  getPendingChangeSync,
} from './change-sync.js';
import {
  checkArchiveCompatibility,
  checkFreshness,
  formatVerifyGateFailure,
} from './verify/freshness.js';
import { selectActiveChange } from './change-utils.js';

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

interface ArchiveOptions {
  yes?: boolean;
  noValidate?: boolean;
  validate?: boolean;
  noVerify?: boolean;
  verify?: boolean;
  noSync?: boolean;
  sync?: boolean;
}

export class ArchiveCommand {
  /**
   * Archive a completed change. Enforces verify gate, sync gate, validation gate,
   * and task gate before moving the change to archive. Does NOT write main specs
   * or OPSX files — sync is handled by `openspec sync`.
   */
  async execute(changeName?: string, options: ArchiveOptions = {}): Promise<void> {
    const targetPath = '.';
    const changesDir = path.join(targetPath, 'openspec', 'changes');
    const archiveDir = path.join(changesDir, 'archive');

    try {
      await fs.access(changesDir);
    } catch {
      throw new Error("No OpenSpec changes directory found. Run 'openspec init' first.");
    }

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
    let activeChangeExists = false;

    try {
      const stat = await fs.stat(changeDir);
      if (!stat.isDirectory()) {
        throw new Error(`Change '${changeName}' not found.`);
      }
      activeChangeExists = true;
    } catch {
      if (!archivedChangePath) {
        throw new Error(`Change '${changeName}' not found.`);
      }
    }

    if (!activeChangeExists && archivedChangePath) {
      this.printGitHandoff();
      return;
    }

    // Pipeline: verify → sync → validation → task → move
    // Each gate returns false when user cancels (not an error)
    if (!(await this.runVerifyGate(changeDir, targetPath, changeName, options))) return;
    if (!(await this.runSyncGate(targetPath, changeName, options))) return;
    if (!(await this.runValidationGate(changeDir, options))) return;
    if (!(await this.runTaskGate(changesDir, changeName, options))) return;

    // Move change to archive
    const archiveName = `${this.getArchiveDate()}-${changeName}`;
    const archivePath = path.join(archiveDir, archiveName);

    try {
      await fs.access(archivePath);
      throw new Error(`Archive '${archiveName}' already exists.`);
    } catch (error: any) {
      if (error.code !== 'ENOENT') throw error;
    }

    await fs.mkdir(archiveDir, { recursive: true });
    await moveDirectory(changeDir, archivePath);

    console.log(`Change '${changeName}' archived as '${archiveName}'.`);
    this.printGitHandoff();
  }

  private async runVerifyGate(
    changeDir: string,
    targetPath: string,
    changeName: string,
    options: ArchiveOptions,
  ): Promise<boolean> {
    const skipVerify = options.verify === false || options.noVerify === true;

    if (skipVerify) {
      if (!options.yes) {
        const { confirm } = await import('@inquirer/prompts');
        const proceed = await confirm({
          message: chalk.yellow(
            '⚠️  WARNING: Skipping the full verify gate bypasses critical quality checks.\n' +
            '   This may archive unverified implementations with correctness, completeness, or coherence issues.\n' +
            '   Continue with --no-verify? (y/N)'
          ),
          default: false,
        });
        if (!proceed) {
          console.log('Archive cancelled. Run without --no-verify to use the standard verify gate.');
          return false;
        }
      }
      console.log(chalk.yellow('[AUTHORIZED] User explicitly authorized --no-verify bypass.'));
      return true;
    }

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
        }),
      );
    }

    if (failures.length > 0) {
      throw new Error(failures.join('\n\n'));
    }
    return true;
  }

  private async runSyncGate(
    targetPath: string,
    changeName: string,
    options: ArchiveOptions,
  ): Promise<boolean> {
    const skipSync = options.sync === false || options.noSync === true;

    if (skipSync) {
      if (!options.yes) {
        const { confirm } = await import('@inquirer/prompts');
        const proceed = await confirm({
          message: chalk.yellow(
            '⚠️  WARNING: Skipping the sync gate may leave main specs out of sync with the change deltas.\n' +
            '   Continue with --no-sync? (y/N)'
          ),
          default: false,
        });
        if (!proceed) {
          console.log('Archive cancelled.');
          return false;
        }
      }
      console.log(chalk.yellow('[AUTHORIZED] User explicitly authorized --no-sync bypass.'));
      return true;
    }

    const syncState = await assessChangeSyncState(targetPath, changeName);
    if (!syncState.requiresSync) return true;

    const pendingSync = await getPendingChangeSync(targetPath, syncState);
    if (pendingSync.specs > 0) {
      throw new Error(
        `Sync gate failed: ${pendingSync.specs} pending delta spec(s).\n` +
        `Run openspec sync ${changeName} first, or pass --no-sync to bypass.`,
      );
    }
    if (pendingSync.opsx) {
      throw new Error(
        `Sync gate failed: pending OPSX delta.\n` +
        `Run openspec sync ${changeName} first, or pass --no-sync to bypass.`,
      );
    }
    return true;
  }

  private async runValidationGate(
    changeDir: string,
    options: ArchiveOptions,
  ): Promise<boolean> {
    const skipValidation = options.validate === false || options.noValidate === true;

    if (skipValidation) {
      if (!options.yes) {
        const { confirm } = await import('@inquirer/prompts');
        const proceed = await confirm({
          message: chalk.yellow('⚠️  WARNING: Skipping validation may archive invalid specs. Continue? (y/N)'),
          default: false,
        });
        if (!proceed) {
          console.log('Archive cancelled.');
          return false;
        }
      }
      const timestamp = new Date().toISOString();
      console.log(chalk.yellow(`[${timestamp}] Validation skipped: ${path.basename(changeDir)}`));
      return true;
    }

    const validator = new Validator();
    let hasValidationErrors = false;

    const changeFile = path.join(changeDir, 'proposal.md');
    try {
      await fs.access(changeFile);
      const changeReport = await validator.validateChange(changeFile);
      if (!changeReport.valid) {
        console.log(chalk.yellow('\nProposal warnings in proposal.md (non-blocking):'));
        for (const issue of changeReport.issues) {
          console.log(chalk.yellow(`  ⚠ ${issue.message}`));
        }
      }
    } catch {
      // proposal.md may not exist
    }

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

    if (hasDeltaSpecs) {
      const syncState = await assessChangeSyncState('.', path.basename(changeDir));
      const pendingSync = syncState.requiresSync ? await getPendingChangeSync('.', syncState) : null;
      if (!pendingSync || pendingSync.specs > 0) {
        const deltaReport = await validator.validateChangeDeltaSpecs(changeDir);
        if (!deltaReport.valid) {
          hasValidationErrors = true;
          console.log(chalk.red('\nValidation errors in change delta specs:'));
          for (const issue of deltaReport.issues) {
            if (issue.level === 'ERROR') {
              console.log(chalk.red(`  ✗ ${issue.message}`));
            } else if (issue.level === 'WARNING') {
              console.log(chalk.yellow(`  ⚠ ${issue.message}`));
            }
          }
        }
      }
    }

    if (hasValidationErrors) {
      console.log(chalk.red('\nValidation failed. Please fix the errors before archiving.'));
      console.log(chalk.yellow('To skip validation (not recommended), use --no-validate flag.'));
      return false;
    }
    return true;
  }

  private async runTaskGate(
    changesDir: string,
    changeName: string,
    options: ArchiveOptions,
  ): Promise<boolean> {
    const progress = await getTaskProgressForChange(changesDir, changeName);
    console.log(`Task status: ${formatTaskStatus(progress)}`);

    const incompleteTasks = Math.max(progress.total - progress.completed, 0);
    if (incompleteTasks > 0) {
      if (!options.yes) {
        const { confirm } = await import('@inquirer/prompts');
        const proceed = await confirm({
          message: `Warning: ${incompleteTasks} incomplete task(s) found. Continue?`,
          default: false,
        });
        if (!proceed) {
          console.log('Archive cancelled.');
          return false;
        }
      } else {
        console.log(`Warning: ${incompleteTasks} incomplete task(s) found. Continuing due to --yes flag.`);
      }
    }
    return true;
  }

  private printGitHandoff(): void {
    console.log('Git handoff: agent handles git commits, merge, and cleanup after archive.');
  }

  private getArchiveDate(): string {
    // Returns date in YYYY-MM-DD format
    return new Date().toISOString().split('T')[0];
  }
}
