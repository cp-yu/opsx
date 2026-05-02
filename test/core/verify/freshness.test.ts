import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import {
  checkArchiveCompatibility,
  checkFreshness,
  computeEvidenceFingerprint,
  computeTasksFileHash,
} from '../../../src/core/verify/freshness.js';
import type { VerifyResult } from '../../../src/core/verify/types.js';

describe('verify freshness engine', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-verify-freshness-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('computes tasks.md sha256 and returns null for missing files', async () => {
    const tasksPath = path.join(tempDir, 'tasks.md');
    await fs.writeFile(tasksPath, '- [x] done\n', 'utf-8');

    expect(await computeTasksFileHash(tasksPath)).toMatch(/^[a-f0-9]{64}$/);
    expect(await computeTasksFileHash(path.join(tempDir, 'missing.md'))).toBeNull();
  });

  it('computes evidence fingerprint with normalized relative POSIX paths', async () => {
    await fs.mkdir(path.join(tempDir, 'src'), { recursive: true });
    await fs.writeFile(path.join(tempDir, 'src', 'a.ts'), 'a', 'utf-8');

    const fingerprint = await computeEvidenceFingerprint(['src\\a.ts', 'missing.ts'], tempDir);

    expect(fingerprint.hash).toMatch(/^[a-f0-9]{64}$/);
    expect(fingerprint.entries).toEqual([
      expect.objectContaining({ path: 'src/a.ts', size: 1 }),
    ]);
    expect(fingerprint.skippedFiles).toEqual(['missing.ts']);
  });

  it('excludes .verify-result.json from evidence fingerprint entries', async () => {
    await fs.mkdir(path.join(tempDir, 'src'), { recursive: true });
    await fs.writeFile(path.join(tempDir, 'src', 'a.ts'), 'a', 'utf-8');
    await fs.writeFile(path.join(tempDir, '.verify-result.json'), JSON.stringify({ result: 'PASS' }), 'utf-8');

    const fingerprint = await computeEvidenceFingerprint(
      ['src/a.ts', '.verify-result.json'],
      tempDir
    );

    expect(fingerprint.entries).toHaveLength(1);
    expect(fingerprint.entries[0]).toEqual(expect.objectContaining({ path: 'src/a.ts' }));
    expect(fingerprint.skippedFiles).toContain('.verify-result.json');
  });

  it('skips missing .verify-result.json (ENOENT) without error', async () => {
    const fingerprint = await computeEvidenceFingerprint(
      ['.verify-result.json'],
      tempDir
    );

    expect(fingerprint.entries).toHaveLength(0);
    expect(fingerprint.skippedFiles).toContain('.verify-result.json');
  });

  it('classifies fresh, stale, and missing verify results', async () => {
    const changeDir = path.join(tempDir, 'openspec', 'changes', 'c1');
    await fs.mkdir(path.join(changeDir, 'src'), { recursive: true });
    const tasksPath = path.join(changeDir, 'tasks.md');
    const evidencePath = path.join(changeDir, 'src', 'a.ts');
    await fs.writeFile(tasksPath, '- [x] task\n', 'utf-8');
    await fs.writeFile(evidencePath, 'a', 'utf-8');

    const missing = await checkFreshness(changeDir, changeDir);
    expect(missing.status).toBe('MISSING');

    const result: VerifyResult = {
      timestamp: new Date().toISOString(),
      result: 'PASS',
      issues: [],
      tasksFileHash: (await computeTasksFileHash(tasksPath))!,
      verificationContext: {
        contractVersion: '1.0',
        evidenceFiles: ['src/a.ts'],
        evidenceFingerprint: (await computeEvidenceFingerprint(['src/a.ts'], changeDir)).hash,
      },
      optimization: { status: 'NOT_NEEDED', attempts: [] },
    };
    await fs.writeFile(path.join(changeDir, '.verify-result.json'), JSON.stringify(result), 'utf-8');

    expect((await checkFreshness(changeDir, changeDir)).status).toBe('FRESH');

    await fs.writeFile(tasksPath, '- [ ] task\n', 'utf-8');
    const stale = await checkFreshness(changeDir, changeDir);
    expect(stale.status).toBe('STALE');
    expect(stale.details).toContain('tasksFileHash does not match current tasks.md');
  });

  it('checks archive compatibility for optimization terminal states', () => {
    const base: VerifyResult = {
      timestamp: '2026-05-01T00:00:00.000Z',
      result: 'PASS',
      issues: [],
      tasksFileHash: 'a'.repeat(64),
      verificationContext: {
        contractVersion: '1.0',
        evidenceFiles: [],
        evidenceFingerprint: 'b'.repeat(64),
      },
    };

    expect(checkArchiveCompatibility(base).compatible).toBe(true);
    expect(checkArchiveCompatibility({ ...base, optimization: { status: 'IMPROVED', attempts: [] } }).compatible).toBe(true);
    expect(checkArchiveCompatibility({ ...base, optimization: { status: 'PENDING_VERIFICATION', attempts: [] } })).toEqual({
      compatible: false,
      blockReason: 'PENDING_VERIFICATION',
    });
    expect(checkArchiveCompatibility({ ...base, optimization: { status: 'ABORTED_UNSAFE', attempts: [] } })).toEqual({
      compatible: false,
      blockReason: 'ABORTED_UNSAFE',
    });
  });
});
