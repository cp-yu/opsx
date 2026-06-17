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
const FINGERPRINT_DETAIL_PREFIX = 'evidenceFingerprint mismatch — modified files: ';
const GIT_HEAD_DETAIL_PREFIX = 'gitHeadCommit changed: ';

interface VerifyGateFailureContext {
  changeName?: string;
  command?: 'sync' | 'archive';
}

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
    const relativePath = toPosixRelative(root, filePath);
    if (path.basename(filePath) === '.verify-result.json') {
      skippedFiles.push(relativePath);
      continue;
    }

    try {
      const content = await fs.readFile(filePath);
      entries.push({
        path: relativePath,
        hash: createHash('sha256').update(content).digest('hex'),
      });
    } catch (error: any) {
      if (error?.code === 'ENOENT' || error?.code === 'EISDIR') {
        skippedFiles.push(relativePath);
        continue;
      }
      throw error;
    }
  }

  entries.sort((a, b) => a.path.localeCompare(b.path));
  return {
    hash: computeEntriesFingerprint(entries),
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

export async function refreshVerifyEvidenceAfterSync(
  changeDir: string,
  projectRoot: string,
  syncedFiles: string[]
): Promise<void> {
  if (syncedFiles.length === 0) {
    return;
  }

  const result = await readVerifyResult(changeDir);
  const recordedEntries = result?.verificationContext?.evidenceFingerprintEntries;
  if (!result || !Array.isArray(recordedEntries) || recordedEntries.length === 0) {
    return;
  }

  const root = path.resolve(projectRoot);
  const syncedPaths = new Set(
    syncedFiles.map((filePath) => normalizeEvidencePath(root, filePath))
  );

  let changed = false;
  const refreshedEntries = await Promise.all(
    recordedEntries.map(async (entry) => {
      if (!syncedPaths.has(normalizeEvidencePath(root, entry.path))) {
        return entry;
      }

      const nextHash = await hashEvidenceFile(root, entry.path);
      if (nextHash !== entry.hash) {
        changed = true;
      }
      return { ...entry, hash: nextHash };
    })
  );

  if (!changed) {
    return;
  }

  refreshedEntries.sort((a, b) => a.path.localeCompare(b.path));
  result.verificationContext.evidenceFingerprintEntries = refreshedEntries;
  result.verificationContext.evidenceFingerprint = computeEntriesFingerprint(refreshedEntries);
  await fs.writeFile(
    path.join(changeDir, '.verify-result.json'),
    `${JSON.stringify(result, null, 2)}\n`,
    'utf-8'
  );
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
  baseChecks.tasksFileHash = true;

  const evidenceFiles = Array.isArray(result.verificationContext?.evidenceFiles)
    ? result.verificationContext.evidenceFiles
    : [];
  const fingerprint = await computeEvidenceFingerprint(evidenceFiles, projectRoot);
  baseChecks.evidenceFingerprint =
    fingerprint.hash === result.verificationContext?.evidenceFingerprint;
  if (!baseChecks.evidenceFingerprint) {
    details.push(describeFingerprintMismatch(result, fingerprint));
  }

  baseChecks.contractVersion = result.verificationContext?.contractVersion === '1.0';
  if (!baseChecks.contractVersion) {
    details.push('verificationContext.contractVersion must be "1.0"');
  }

  const currentGitHead = await getCurrentGitHead(projectRoot);
  baseChecks.gitHeadCommit = matchesGitHead(result.verificationContext?.gitHeadCommit, currentGitHead);
  if (!baseChecks.gitHeadCommit) {
    details.push(
      `${GIT_HEAD_DETAIL_PREFIX}${result.verificationContext?.gitHeadCommit ?? 'unknown'} → ${currentGitHead ?? 'unknown'}`
    );
  }

  baseChecks.resultAcceptable = ACCEPTABLE_RESULTS.has(result.result);
  if (!baseChecks.resultAcceptable) {
    details.push('result must be PASS or PASS_WITH_WARNINGS');
  }

  const fresh =
    baseChecks.fileExists &&
    baseChecks.tasksFileHash &&
    baseChecks.evidenceFingerprint &&
    baseChecks.contractVersion &&
    baseChecks.resultAcceptable;
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
  archiveCompatibility?: ArchiveCompatibility,
  context: VerifyGateFailureContext = {}
): string {
  const changeName = context.changeName ?? '<change-name>';
  const command = context.command ?? 'sync';
  const fingerprintFiles = parseFingerprintFiles(freshness.details);
  const gitHeadChange = parseGitHeadChange(freshness.details);
  const otherDetails = freshness.details.filter(
    (detail) =>
      !detail.startsWith(FINGERPRINT_DETAIL_PREFIX) &&
      !detail.startsWith(GIT_HEAD_DETAIL_PREFIX)
  );
  const lines = [`✗ Verify gate failed — ${summarizeFailure(freshness, archiveCompatibility)}`];

  if (fingerprintFiles.length > 0) {
    lines.push('', '  证据文件指纹不匹配:');
    for (const file of fingerprintFiles) {
      lines.push(`    - ${file}`);
    }
  }

  if (gitHeadChange) {
    lines.push('', '  Git HEAD:', `    ${gitHeadChange}`);
  }

  if (archiveCompatibility && !archiveCompatibility.compatible) {
    lines.push('', '  Archive compatibility:', `    ${archiveCompatibility.blockReason}`);
  }

  if (otherDetails.length > 0) {
    lines.push('', '  其他诊断:');
    for (const detail of otherDetails) {
      lines.push(`    - ${detail}`);
    }
  }

  lines.push(
    '',
    '  建议操作:',
    `    openspec verify phase1 ${changeName}`,
    `    openspec ${command} ${changeName} --no-verify`
  );
  return lines.join('\n');
}

export function hasPendingOptimization(optimization?: VerifyOptimization): boolean {
  return optimization?.status === 'PENDING_VERIFICATION';
}

function matchesGitHead(recorded?: string, current?: string): boolean {
  if (!recorded || !current) {
    return true;
  }
  return current === recorded;
}

async function getCurrentGitHead(projectRoot: string): Promise<string | undefined> {
  try {
    const { stdout } = await execFileAsync('git', ['rev-parse', 'HEAD'], { cwd: projectRoot });
    return stdout.trim() || undefined;
  } catch {
    return undefined;
  }
}

function describeFingerprintMismatch(
  result: VerifyResult,
  fingerprint: EvidenceFingerprint
): string {
  const modifiedFiles = collectModifiedEvidenceFiles(result, fingerprint);
  if (modifiedFiles.length === 0) {
    return `${FINGERPRINT_DETAIL_PREFIX}unable to determine from legacy verify result`;
  }
  return `${FINGERPRINT_DETAIL_PREFIX}${modifiedFiles.join(', ')}`;
}

function collectModifiedEvidenceFiles(
  result: VerifyResult,
  fingerprint: EvidenceFingerprint
): string[] {
  const modifiedFiles = new Set<string>();
  const recordedEntries = result.verificationContext?.evidenceFingerprintEntries ?? [];
  const currentEntries = new Map(fingerprint.entries.map((entry) => [entry.path, entry.hash]));

  if (recordedEntries.length > 0) {
    const recordedMap = new Map(recordedEntries.map((entry) => [entry.path, entry.hash]));
    for (const [filePath, recordedHash] of recordedMap) {
      if (currentEntries.get(filePath) !== recordedHash) {
        modifiedFiles.add(filePath);
      }
    }
    for (const filePath of currentEntries.keys()) {
      if (!recordedMap.has(filePath)) {
        modifiedFiles.add(filePath);
      }
    }
  }

  for (const skippedFile of fingerprint.skippedFiles) {
    modifiedFiles.add(skippedFile);
  }

  if (modifiedFiles.size === 0 && recordedEntries.length === 0) {
    for (const filePath of result.verificationContext?.evidenceFiles ?? []) {
      modifiedFiles.add(filePath.split(/[/\\]+/).join('/'));
    }
  }

  return [...modifiedFiles].sort();
}

function summarizeFailure(
  freshness: FreshnessResult,
  archiveCompatibility?: ArchiveCompatibility
): string {
  if (freshness.status === 'MISSING') {
    return '.verify-result.json is missing';
  }
  if (archiveCompatibility && !archiveCompatibility.compatible) {
    return 'verification is stale or Phase 2 is not ready for archive';
  }
  if (freshness.status === 'STALE') {
    return 'workspace changed since the last verify';
  }
  return freshness.status;
}

function parseFingerprintFiles(details: string[]): string[] {
  const files = new Set<string>();
  for (const detail of details) {
    if (!detail.startsWith(FINGERPRINT_DETAIL_PREFIX)) {
      continue;
    }
    const raw = detail.slice(FINGERPRINT_DETAIL_PREFIX.length).trim();
    for (const file of raw.split(',').map((part) => part.trim()).filter(Boolean)) {
      files.add(file);
    }
  }
  return [...files];
}

function parseGitHeadChange(details: string[]): string | null {
  const detail = details.find((item) => item.startsWith(GIT_HEAD_DETAIL_PREFIX));
  if (!detail) {
    return null;
  }
  return detail.slice(GIT_HEAD_DETAIL_PREFIX.length).trim();
}

function computeEntriesFingerprint(entries: EvidenceFingerprint['entries']): string {
  return createHash('sha256').update(JSON.stringify(entries)).digest('hex');
}

async function hashEvidenceFile(projectRoot: string, filePath: string): Promise<string> {
  const content = await fs.readFile(resolveEvidencePath(projectRoot, filePath));
  return createHash('sha256').update(content).digest('hex');
}

function normalizeEvidencePath(projectRoot: string, filePath: string): string {
  return toPosixRelative(projectRoot, resolveEvidencePath(projectRoot, filePath));
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
