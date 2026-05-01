import { execFile } from 'child_process';
import { createHash } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import { promisify } from 'util';
import type {
  ArchiveCompatibility,
  EvidenceFingerprint,
  FreshnessResult,
  VerifyOptimization,
  VerifyResult,
} from './types.js';

const execFileAsync = promisify(execFile);
const ACCEPTABLE_RESULTS = new Set(['PASS', 'PASS_WITH_WARNINGS']);
const ARCHIVE_COMPATIBLE_STATUSES = new Set(['SKIPPED', 'NOT_NEEDED', 'IMPROVED', 'DEGRADED']);

export async function computeTasksFileHash(tasksPath: string): Promise<string | null> {
  try {
    const content = await fs.readFile(tasksPath);
    return createHash('sha256').update(content).digest('hex');
  } catch (error: any) {
    if (error?.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

export async function computeEvidenceFingerprint(
  evidenceFiles: string[],
  projectRoot: string
): Promise<EvidenceFingerprint> {
  const root = path.resolve(projectRoot);
  const skippedFiles: string[] = [];
  const entries: EvidenceFingerprint['entries'] = [];

  for (const original of [...evidenceFiles].sort()) {
    const filePath = resolveEvidencePath(root, original);
    try {
      const stat = await fs.stat(filePath);
      if (!stat.isFile()) {
        skippedFiles.push(toPosixRelative(root, filePath));
        continue;
      }
      entries.push({
        path: toPosixRelative(root, filePath),
        mtimeMs: stat.mtimeMs,
        size: stat.size,
      });
    } catch (error: any) {
      if (error?.code === 'ENOENT') {
        skippedFiles.push(toPosixRelative(root, filePath));
        continue;
      }
      throw error;
    }
  }

  entries.sort((a, b) => a.path.localeCompare(b.path));
  const hashInput = JSON.stringify(entries);
  return {
    hash: createHash('sha256').update(hashInput).digest('hex'),
    skippedFiles,
    entries,
  };
}

export async function readVerifyResult(changeDir: string): Promise<VerifyResult | null> {
  try {
    const content = await fs.readFile(path.join(changeDir, '.verify-result.json'), 'utf-8');
    return JSON.parse(content) as VerifyResult;
  } catch (error: any) {
    if (error?.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

export async function checkFreshness(
  changeDir: string,
  projectRoot: string
): Promise<FreshnessResult> {
  const result = await readVerifyResult(changeDir);
  const baseChecks = {
    fileExists: result !== null,
    tasksFileHash: false,
    evidenceFingerprint: false,
    contractVersion: false,
    gitHeadCommit: false,
    resultAcceptable: false,
  };

  if (!result) {
    return {
      status: 'MISSING',
      checks: baseChecks,
      details: ['.verify-result.json is missing'],
    };
  }

  const details: string[] = [];
  const tasksHash = await computeTasksFileHash(path.join(changeDir, 'tasks.md'));
  baseChecks.tasksFileHash = tasksHash !== null && tasksHash === result.tasksFileHash;
  if (!baseChecks.tasksFileHash) {
    details.push('tasksFileHash does not match current tasks.md');
  }

  const evidenceFiles = Array.isArray(result.verificationContext?.evidenceFiles)
    ? result.verificationContext.evidenceFiles
    : [];
  const fingerprint = await computeEvidenceFingerprint(evidenceFiles, projectRoot);
  baseChecks.evidenceFingerprint =
    fingerprint.hash === result.verificationContext?.evidenceFingerprint;
  if (!baseChecks.evidenceFingerprint) {
    details.push('evidenceFingerprint does not match current evidence files');
  }

  baseChecks.contractVersion = result.verificationContext?.contractVersion === '1.0';
  if (!baseChecks.contractVersion) {
    details.push('verificationContext.contractVersion must be "1.0"');
  }

  baseChecks.gitHeadCommit = await matchesGitHead(projectRoot, result.verificationContext?.gitHeadCommit);
  if (!baseChecks.gitHeadCommit) {
    details.push('gitHeadCommit does not match current HEAD');
  }

  baseChecks.resultAcceptable = ACCEPTABLE_RESULTS.has(result.result);
  if (!baseChecks.resultAcceptable) {
    details.push('result must be PASS or PASS_WITH_WARNINGS');
  }

  const fresh = Object.values(baseChecks).every(Boolean);
  return {
    status: fresh ? 'FRESH' : 'STALE',
    verifyResult: result,
    checks: baseChecks,
    details,
  };
}

export function checkArchiveCompatibility(verifyResult: VerifyResult): ArchiveCompatibility {
  const optimization = verifyResult.optimization;
  if (!optimization) {
    return { compatible: true };
  }

  if (optimization.status === 'PENDING_VERIFICATION') {
    return { compatible: false, blockReason: 'PENDING_VERIFICATION' };
  }
  if (optimization.status === 'ABORTED_UNSAFE') {
    return { compatible: false, blockReason: 'ABORTED_UNSAFE' };
  }
  if (!ARCHIVE_COMPATIBLE_STATUSES.has(optimization.status)) {
    return { compatible: false, blockReason: 'INVALID_OPTIMIZATION_STATUS' };
  }

  return { compatible: true };
}

export async function hashFiles(
  files: string[],
  projectRoot: string
): Promise<Record<string, string>> {
  const root = path.resolve(projectRoot);
  const hashes: Record<string, string> = {};
  for (const file of files) {
    const resolved = resolveEvidencePath(root, file);
    const content = await fs.readFile(resolved);
    hashes[toPosixRelative(root, resolved)] = createHash('sha256').update(content).digest('hex');
  }
  return hashes;
}

export function getOptimizationStatus(verifyResult?: VerifyResult | null): string {
  return verifyResult?.optimization?.status ?? 'LEGACY';
}

export function formatVerifyGateFailure(
  freshness: FreshnessResult,
  archiveCompatibility?: ArchiveCompatibility
): string {
  const lines = [
    `Verify gate failed: ${freshness.status}`,
    `result: ${freshness.verifyResult?.result ?? 'MISSING'}`,
    `optimization.status: ${getOptimizationStatus(freshness.verifyResult)}`,
  ];
  if (archiveCompatibility && !archiveCompatibility.compatible) {
    lines.push(`archiveCompatibility: ${archiveCompatibility.blockReason}`);
  }
  for (const detail of freshness.details) {
    lines.push(`- ${detail}`);
  }
  return lines.join('\n');
}

export function hasPendingOptimization(optimization?: VerifyOptimization): boolean {
  return optimization?.status === 'PENDING_VERIFICATION';
}

async function matchesGitHead(projectRoot: string, recorded?: string): Promise<boolean> {
  if (!recorded) {
    return true;
  }
  try {
    const { stdout } = await execFileAsync('git', ['rev-parse', 'HEAD'], { cwd: projectRoot });
    return stdout.trim() === recorded;
  } catch {
    return true;
  }
}

function resolveEvidencePath(projectRoot: string, filePath: string): string {
  const platformPath = filePath.split(/[/\\]+/).join(path.sep);
  return path.isAbsolute(platformPath)
    ? path.normalize(platformPath)
    : path.resolve(projectRoot, platformPath);
}

function toPosixRelative(projectRoot: string, filePath: string): string {
  const relative = path.relative(projectRoot, filePath);
  return relative.split(path.sep).join('/');
}
