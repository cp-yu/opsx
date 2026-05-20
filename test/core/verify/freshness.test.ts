import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import {
  checkArchiveCompatibility,
  checkFreshness,
  computeEvidenceFingerprint,
  computeTasksFileHash,
  refreshVerifyEvidenceAfterSync,
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
      expect.objectContaining({ path: 'src/a.ts', hash: expect.stringMatching(/^[a-f0-9]{64}$/) }),
    ]);
    expect(fingerprint.skippedFiles).toEqual(['missing.ts']);
  });

  it('keeps evidence fingerprint stable when only file mtime changes', async () => {
    await fs.mkdir(path.join(tempDir, 'src'), { recursive: true });
    const evidencePath = path.join(tempDir, 'src', 'a.ts');
    await fs.writeFile(evidencePath, 'a', 'utf-8');

    const before = await computeEvidenceFingerprint(['src/a.ts'], tempDir);
    const future = new Date(Date.now() + 60_000);
    await fs.utimes(evidencePath, future, future);
    const after = await computeEvidenceFingerprint(['src/a.ts'], tempDir);

    expect(after.hash).toBe(before.hash);
    expect(after.entries).toEqual(before.entries);
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
    expect((await checkFreshness(changeDir, changeDir)).status).toBe('FRESH');

    await fs.writeFile(evidencePath, 'changed', 'utf-8');
    const stale = await checkFreshness(changeDir, changeDir);
    expect(stale.status).toBe('STALE');
    expect(stale.details.some((detail) => detail.startsWith('evidenceFingerprint mismatch'))).toBe(true);
  });

  it('refreshes matching evidence entries after sync and keeps freshness fresh', async () => {
    const changeDir = path.join(tempDir, 'openspec', 'changes', 'c1');
    const mainOpsxPath = path.join(tempDir, 'openspec', 'project.opsx.yaml');
    const changeSpecPath = path.join(changeDir, 'specs', 'auth', 'spec.md');
    await fs.mkdir(path.dirname(mainOpsxPath), { recursive: true });
    await fs.mkdir(path.dirname(changeSpecPath), { recursive: true });
    await fs.writeFile(path.join(changeDir, 'tasks.md'), '- [x] task\n', 'utf-8');
    await fs.writeFile(mainOpsxPath, 'version: 1\n', 'utf-8');
    await fs.writeFile(changeSpecPath, 'change spec\n', 'utf-8');

    const before = await computeEvidenceFingerprint(
      ['openspec/project.opsx.yaml', 'openspec/changes/c1/specs/auth/spec.md'],
      tempDir
    );
    const result: VerifyResult = {
      timestamp: new Date().toISOString(),
      result: 'PASS',
      issues: [],
      tasksFileHash: (await computeTasksFileHash(path.join(changeDir, 'tasks.md')))!,
      verificationContext: {
        contractVersion: '1.0',
        evidenceFiles: ['openspec/project.opsx.yaml', 'openspec/changes/c1/specs/auth/spec.md'],
        evidenceFingerprint: before.hash,
        evidenceFingerprintEntries: before.entries,
      },
      optimization: { status: 'NOT_NEEDED', attempts: [] },
    };
    await fs.writeFile(path.join(changeDir, '.verify-result.json'), `${JSON.stringify(result, null, 2)}\n`, 'utf-8');

    await fs.writeFile(mainOpsxPath, 'version: 2\n', 'utf-8');
    const staleBeforeRefresh = await checkFreshness(changeDir, tempDir);
    expect(staleBeforeRefresh.status).toBe('STALE');

    await refreshVerifyEvidenceAfterSync(changeDir, tempDir, ['openspec/project.opsx.yaml']);

    const refreshed = JSON.parse(
      await fs.readFile(path.join(changeDir, '.verify-result.json'), 'utf-8')
    ) as VerifyResult;
    expect(refreshed.verificationContext.evidenceFingerprint).not.toBe(before.hash);
    expect(refreshed.verificationContext.evidenceFingerprintEntries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: 'openspec/project.opsx.yaml' }),
        expect.objectContaining({ path: 'openspec/changes/c1/specs/auth/spec.md' }),
      ])
    );
    const refreshedOpsxEntry = refreshed.verificationContext.evidenceFingerprintEntries?.find(
      (entry) => entry.path === 'openspec/project.opsx.yaml'
    );
    const unchangedChangeSpecEntry = refreshed.verificationContext.evidenceFingerprintEntries?.find(
      (entry) => entry.path === 'openspec/changes/c1/specs/auth/spec.md'
    );
    expect(refreshedOpsxEntry?.hash).not.toBe(
      before.entries.find((entry) => entry.path === 'openspec/project.opsx.yaml')?.hash
    );
    expect(unchangedChangeSpecEntry?.hash).toBe(
      before.entries.find((entry) => entry.path === 'openspec/changes/c1/specs/auth/spec.md')?.hash
    );
    expect((await checkFreshness(changeDir, tempDir)).status).toBe('FRESH');
  });

  it('skips refresh when no synced paths match evidence entries', async () => {
    const changeDir = path.join(tempDir, 'openspec', 'changes', 'c1');
    const evidencePath = path.join(tempDir, 'openspec', 'project.opsx.yaml');
    await fs.mkdir(path.dirname(evidencePath), { recursive: true });
    await fs.mkdir(changeDir, { recursive: true });
    await fs.writeFile(path.join(changeDir, 'tasks.md'), '- [x] task\n', 'utf-8');
    await fs.writeFile(evidencePath, 'version: 1\n', 'utf-8');

    const before = await computeEvidenceFingerprint(['openspec/project.opsx.yaml'], tempDir);
    const result: VerifyResult = {
      timestamp: new Date().toISOString(),
      result: 'PASS',
      issues: [],
      tasksFileHash: (await computeTasksFileHash(path.join(changeDir, 'tasks.md')))!,
      verificationContext: {
        contractVersion: '1.0',
        evidenceFiles: ['openspec/project.opsx.yaml'],
        evidenceFingerprint: before.hash,
        evidenceFingerprintEntries: before.entries,
      },
      optimization: { status: 'NOT_NEEDED', attempts: [] },
    };
    const verifyPath = path.join(changeDir, '.verify-result.json');
    await fs.writeFile(verifyPath, `${JSON.stringify(result, null, 2)}\n`, 'utf-8');
    const originalContent = await fs.readFile(verifyPath, 'utf-8');

    await refreshVerifyEvidenceAfterSync(changeDir, tempDir, ['openspec/specs/auth/spec.md']);

    expect(await fs.readFile(verifyPath, 'utf-8')).toBe(originalContent);
  });

  it('skips refresh when verify result is missing or legacy entries are absent', async () => {
    const changeDir = path.join(tempDir, 'openspec', 'changes', 'c1');
    const evidencePath = path.join(tempDir, 'openspec', 'project.opsx.yaml');
    await fs.mkdir(path.dirname(evidencePath), { recursive: true });
    await fs.mkdir(changeDir, { recursive: true });
    await fs.writeFile(evidencePath, 'version: 1\n', 'utf-8');

    await expect(
      refreshVerifyEvidenceAfterSync(changeDir, tempDir, ['openspec/project.opsx.yaml'])
    ).resolves.toBeUndefined();

    const legacy: VerifyResult = {
      timestamp: new Date().toISOString(),
      result: 'PASS',
      issues: [],
      tasksFileHash: 'a'.repeat(64),
      verificationContext: {
        contractVersion: '1.0',
        evidenceFiles: ['openspec/project.opsx.yaml'],
        evidenceFingerprint: 'b'.repeat(64),
      },
      optimization: { status: 'NOT_NEEDED', attempts: [] },
    };
    const verifyPath = path.join(changeDir, '.verify-result.json');
    await fs.writeFile(verifyPath, `${JSON.stringify(legacy, null, 2)}\n`, 'utf-8');
    const originalContent = await fs.readFile(verifyPath, 'utf-8');

    await refreshVerifyEvidenceAfterSync(changeDir, tempDir, ['openspec/project.opsx.yaml']);

    expect(await fs.readFile(verifyPath, 'utf-8')).toBe(originalContent);
  });

  it('matches synced files using POSIX-normalized paths on Windows-style input', async () => {
    const changeDir = path.join(tempDir, 'openspec', 'changes', 'c1');
    const evidencePath = path.join(tempDir, 'openspec', 'project.opsx.yaml');
    await fs.mkdir(path.dirname(evidencePath), { recursive: true });
    await fs.mkdir(changeDir, { recursive: true });
    await fs.writeFile(path.join(changeDir, 'tasks.md'), '- [x] task\n', 'utf-8');
    await fs.writeFile(evidencePath, 'version: 1\n', 'utf-8');

    const before = await computeEvidenceFingerprint(['openspec/project.opsx.yaml'], tempDir);
    const result: VerifyResult = {
      timestamp: new Date().toISOString(),
      result: 'PASS',
      issues: [],
      tasksFileHash: (await computeTasksFileHash(path.join(changeDir, 'tasks.md')))!,
      verificationContext: {
        contractVersion: '1.0',
        evidenceFiles: ['openspec/project.opsx.yaml'],
        evidenceFingerprint: before.hash,
        evidenceFingerprintEntries: before.entries,
      },
      optimization: { status: 'NOT_NEEDED', attempts: [] },
    };
    await fs.writeFile(path.join(changeDir, '.verify-result.json'), `${JSON.stringify(result, null, 2)}\n`, 'utf-8');
    await fs.writeFile(evidencePath, 'version: 2\n', 'utf-8');

    await refreshVerifyEvidenceAfterSync(changeDir, tempDir, ['openspec\\project.opsx.yaml']);

    expect((await checkFreshness(changeDir, tempDir)).status).toBe('FRESH');
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
