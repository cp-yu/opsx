import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { execFile } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { promisify } from 'util';
import { runCLI } from '../helpers/run-cli.js';

const execFileAsync = promisify(execFile);

describe('openspec verify command', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-verify-cli-'));
    await fs.mkdir(path.join(tempDir, 'openspec', 'changes', 'c1'), { recursive: true });
    await fs.mkdir(path.join(tempDir, 'src'), { recursive: true });
    await fs.writeFile(path.join(tempDir, 'openspec', 'changes', 'c1', 'tasks.md'), '- [x] task\n', 'utf-8');
    await fs.writeFile(path.join(tempDir, 'src', 'a.ts'), 'const a = 1;\n', 'utf-8');
    await execFileAsync('git', ['init'], { cwd: tempDir });
    await execFileAsync('git', ['config', 'user.name', 'OpenSpec Test'], { cwd: tempDir });
    await execFileAsync('git', ['config', 'user.email', 'test@example.com'], { cwd: tempDir });
    await execFileAsync('git', ['add', '.'], { cwd: tempDir });
    await execFileAsync('git', ['commit', '-m', 'init'], { cwd: tempDir });
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('persists Phase 1, seals, and reports status in JSON mode', async () => {
    const phase1 = await runCLI([
      'verify',
      'phase1',
      'c1',
      '--json',
      '--input',
      JSON.stringify({ result: 'PASS', issues: [], evidenceFiles: ['src/a.ts'] }),
    ], { cwd: tempDir });

    expect(phase1.exitCode).toBe(0);
    expect(JSON.parse(phase1.stdout).nextStep).toBe('Enter Phase 2');

    const pendingStatus = await runCLI(['verify', 'status', 'c1', '--json'], { cwd: tempDir });
    expect(pendingStatus.exitCode).toBe(1);
    expect(JSON.parse(pendingStatus.stdout).archiveCompatibility.blockReason).toBe('PENDING_VERIFICATION');

    const phase2 = await runCLI([
      'verify',
      'phase2',
      'c1',
      '--type=optimization',
      '--json',
      '--input',
      JSON.stringify({ status: 'NO_OPTIMIZATION_NEEDED', summary: 'No optimization opportunities found' }),
    ], { cwd: tempDir });
    expect(phase2.exitCode).toBe(0);

    const seal = await runCLI(['verify', 'seal', 'c1', '--json'], { cwd: tempDir });
    expect(seal.exitCode).toBe(0);
    expect(JSON.parse(seal.stdout).sealHash).toMatch(/^[a-f0-9]{64}$/);

    const status = await runCLI(['verify', 'status', 'c1', '--json'], { cwd: tempDir });
    expect(status.exitCode).toBe(0);
    expect(JSON.parse(status.stdout).ok).toBe(true);
  });

  it('rejects invalid Phase 1 input with exit code 2', async () => {
    const result = await runCLI([
      'verify',
      'phase1',
      'c1',
      '--json',
      '--input',
      JSON.stringify({ result: 'BAD', issues: [], evidenceFiles: [] }),
    ], { cwd: tempDir });

    expect(result.exitCode).toBe(2);
    expect(JSON.parse(result.stdout).errors).toContain(
      'result must be PASS, PASS_WITH_WARNINGS, or FAIL_NEEDS_REMEDIATION'
    );
  });

  it('reports modified evidence files when freshness becomes stale', async () => {
    await runCLI([
      'verify',
      'phase1',
      'c1',
      '--input',
      JSON.stringify({ result: 'PASS', issues: [], evidenceFiles: ['src/a.ts'] }),
    ], { cwd: tempDir });

    await fs.writeFile(path.join(tempDir, 'src', 'a.ts'), 'const a = 2;\n', 'utf-8');

    const status = await runCLI(['verify', 'status', 'c1'], { cwd: tempDir });

    expect(status.exitCode).toBe(1);
    expect(status.stdout).toContain('Evidence file fingerprint mismatch:');
    expect(status.stdout).toContain('- src/a.ts');
  });

  it('reports git HEAD transitions as warnings without making freshness stale', async () => {
    await runCLI([
      'verify',
      'phase1',
      'c1',
      '--input',
      JSON.stringify({ result: 'PASS', issues: [], evidenceFiles: ['src/a.ts'] }),
    ], { cwd: tempDir });
    await runCLI([
      'verify',
      'phase2',
      'c1',
      '--type=optimization',
      '--input',
      JSON.stringify({ status: 'NO_OPTIMIZATION_NEEDED', summary: 'No optimization needed' }),
    ], { cwd: tempDir });

    const phase1Result = JSON.parse(
      await fs.readFile(path.join(tempDir, 'openspec', 'changes', 'c1', '.verify-result.json'), 'utf-8')
    );
    await fs.writeFile(path.join(tempDir, 'notes.md'), 'head changed\n', 'utf-8');
    await execFileAsync('git', ['add', 'notes.md'], { cwd: tempDir });
    await execFileAsync('git', ['commit', '-m', 'head-change'], { cwd: tempDir });

    const status = await runCLI(['verify', 'status', 'c1'], { cwd: tempDir });
    const currentHead = (
      await execFileAsync('git', ['rev-parse', 'HEAD'], { cwd: tempDir })
    ).stdout.trim();

    expect(status.exitCode).toBe(0);
    expect(status.stdout).toContain('Verify gate passed.');
    expect(status.stdout).toContain('Warnings:');
    expect(status.stdout).toContain(
      `gitHeadCommit changed: ${phase1Result.verificationContext.gitHeadCommit} → ${currentHead}`
    );
  });

  it('formats verify gate failures with remediation guidance', async () => {
    await runCLI([
      'verify',
      'phase1',
      'c1',
      '--input',
      JSON.stringify({ result: 'PASS', issues: [], evidenceFiles: ['src/a.ts'] }),
    ], { cwd: tempDir });

    await fs.writeFile(path.join(tempDir, 'src', 'a.ts'), 'const a = 3;\n', 'utf-8');
    await fs.writeFile(path.join(tempDir, 'notes.md'), 'second head change\n', 'utf-8');
    await execFileAsync('git', ['add', 'notes.md'], { cwd: tempDir });
    await execFileAsync('git', ['commit', '-m', 'second-head-change'], { cwd: tempDir });

    const status = await runCLI(['verify', 'status', 'c1'], { cwd: tempDir });

    expect(status.exitCode).toBe(1);
    expect(status.stdout).toContain('Archive compatibility:');
    expect(status.stdout).toContain('PENDING_VERIFICATION');
    expect(status.stdout).toContain('Suggested actions:');
    expect(status.stdout).toContain('openspec verify phase1 c1');
    expect(status.stdout).toContain('openspec sync c1 --no-verify');
  });

  it('tracks optimization file hashes and rejects unapplied patches', async () => {
    await runCLI([
      'verify',
      'phase1',
      'c1',
      '--input',
      JSON.stringify({ result: 'PASS', issues: [], evidenceFiles: ['src/a.ts'] }),
    ], { cwd: tempDir });

    const optimization = await runCLI([
      'verify',
      'phase2',
      'c1',
      '--type=optimization',
      '--files',
      'src/a.ts',
      '--json',
      '--input',
      JSON.stringify({ status: 'OPTIMIZATION_PROPOSED', summary: 'simplify' }),
    ], { cwd: tempDir });
    expect(optimization.exitCode).toBe(0);

    const unchanged = await runCLI([
      'verify',
      'phase2',
      'c1',
      '--type=verification',
      '--json',
      '--input',
      JSON.stringify({ result: 'PASS', issues: [] }),
    ], { cwd: tempDir });
    expect(unchanged.exitCode).toBe(1);
    expect(JSON.parse(unchanged.stdout).reason).toBe('PATCH_NOT_APPLIED');

    await fs.writeFile(path.join(tempDir, 'src', 'a.ts'), 'const a = 2;\n', 'utf-8');
    const verified = await runCLI([
      'verify',
      'phase2',
      'c1',
      '--type=verification',
      '--json',
      '--input',
      JSON.stringify({ result: 'PASS', issues: [] }),
    ], { cwd: tempDir });

    expect(verified.exitCode).toBe(0);
    expect(JSON.parse(verified.stdout).result.optimization.status).toBe('IMPROVED');
  });

  it('allows SKIPPED to close Phase 2 when optimization is disabled', async () => {
    await fs.writeFile(
      path.join(tempDir, 'openspec', 'config.yaml'),
      'schema: spec-driven\noptimization:\n  enabled: false\n',
      'utf-8'
    );
    await runCLI([
      'verify',
      'phase1',
      'c1',
      '--input',
      JSON.stringify({ result: 'PASS', issues: [], evidenceFiles: ['src/a.ts'] }),
    ], { cwd: tempDir });

    const notNeeded = await runCLI([
      'verify',
      'phase2',
      'c1',
      '--type=optimization',
      '--json',
      '--input',
      JSON.stringify({ status: 'NO_OPTIMIZATION_NEEDED' }),
    ], { cwd: tempDir });
    expect(notNeeded.exitCode).toBe(1);
    expect(JSON.parse(notNeeded.stdout).reason).toBe('optimization.enabled is false');

    const skipped = await runCLI([
      'verify',
      'phase2',
      'c1',
      '--type=optimization',
      '--json',
      '--input',
      JSON.stringify({ status: 'SKIPPED', summary: 'optimization disabled by config' }),
    ], { cwd: tempDir });

    expect(skipped.exitCode).toBe(0);
    expect(JSON.parse(skipped.stdout).result.optimization.status).toBe('SKIPPED');

    const status = await runCLI(['verify', 'status', 'c1', '--json'], { cwd: tempDir });
    expect(status.exitCode).toBe(0);
    expect(JSON.parse(status.stdout).ok).toBe(true);
  });

  it('uses optRetries and preserves failedDirections across optimization retries', async () => {
    await fs.writeFile(
      path.join(tempDir, 'openspec', 'config.yaml'),
      'schema: spec-driven\noptimization:\n  enabled: true\n  optRetries: 2\n',
      'utf-8'
    );

    await runCLI([
      'verify',
      'phase1',
      'c1',
      '--input',
      JSON.stringify({ result: 'PASS', issues: [], evidenceFiles: ['src/a.ts'] }),
    ], { cwd: tempDir });

    await runCLI([
      'verify',
      'phase2',
      'c1',
      '--type=optimization',
      '--files',
      'src/a.ts',
      '--input',
      JSON.stringify({ status: 'OPTIMIZATION_PROPOSED', summary: 'extract branch handling' }),
    ], { cwd: tempDir });
    await fs.writeFile(path.join(tempDir, 'src', 'a.ts'), 'const a = 2;\n', 'utf-8');

    const firstFailure = await runCLI([
      'verify',
      'phase2',
      'c1',
      '--type=verification',
      '--json',
      '--input',
      JSON.stringify({
        result: 'FAIL_NEEDS_REMEDIATION',
        issues: [],
        summary: 'extract branch handling',
        behaviorRetryCounter: 1,
      }),
    ], { cwd: tempDir });

    expect(firstFailure.exitCode).toBe(0);
    expect(JSON.parse(firstFailure.stdout).result.optimization.failedDirections).toEqual([
      'extract branch handling',
    ]);

    await runCLI([
      'verify',
      'phase2',
      'c1',
      '--type=optimization',
      '--files',
      'src/a.ts',
      '--input',
      JSON.stringify({ status: 'OPTIMIZATION_PROPOSED', summary: 'inline helper extraction' }),
    ], { cwd: tempDir });
    await fs.writeFile(path.join(tempDir, 'src', 'a.ts'), 'const a = 3;\n', 'utf-8');

    const degraded = await runCLI([
      'verify',
      'phase2',
      'c1',
      '--type=verification',
      '--json',
      '--input',
      JSON.stringify({
        result: 'FAIL_NEEDS_REMEDIATION',
        issues: [],
        summary: 'inline helper extraction',
        behaviorRetryCounter: 2,
      }),
    ], { cwd: tempDir });

    const parsed = JSON.parse(degraded.stdout);
    expect(degraded.exitCode).toBe(0);
    expect(parsed.result.result).toBe('PASS_WITH_WARNINGS');
    expect(parsed.result.optimization.status).toBe('DEGRADED');
    expect(parsed.result.optimization.failedDirections).toEqual([
      'extract branch handling',
      'inline helper extraction',
    ]);
  });

  it('recalculates evidenceFingerprint on Phase 2 verification PASS', async () => {
    await runCLI([
      'verify',
      'phase1',
      'c1',
      '--input',
      JSON.stringify({ result: 'PASS', issues: [], evidenceFiles: ['src/a.ts'] }),
    ], { cwd: tempDir });

    const phase1Result = JSON.parse(
      await fs.readFile(path.join(tempDir, 'openspec', 'changes', 'c1', '.verify-result.json'), 'utf-8')
    );
    const phase1Fingerprint = phase1Result.verificationContext.evidenceFingerprint;

    await runCLI([
      'verify',
      'phase2',
      'c1',
      '--type=optimization',
      '--files',
      'src/a.ts',
      '--input',
      JSON.stringify({ status: 'OPTIMIZATION_PROPOSED', summary: 'simplify' }),
    ], { cwd: tempDir });

    await fs.writeFile(path.join(tempDir, 'src', 'a.ts'), 'const optimized = true;\n', 'utf-8');

    await runCLI([
      'verify',
      'phase2',
      'c1',
      '--type=verification',
      '--json',
      '--input',
      JSON.stringify({ result: 'PASS', issues: [] }),
    ], { cwd: tempDir });

    const finalResult = JSON.parse(
      await fs.readFile(path.join(tempDir, 'openspec', 'changes', 'c1', '.verify-result.json'), 'utf-8')
    );
    expect(finalResult.verificationContext.evidenceFingerprint).not.toBe(phase1Fingerprint);
    expect(finalResult.verificationContext.evidenceFingerprintEntries).toEqual([
      expect.objectContaining({ path: 'src/a.ts' }),
    ]);
    expect(finalResult.optimization.status).toBe('IMPROVED');

    const status = await runCLI(['verify', 'status', 'c1', '--json'], { cwd: tempDir });
    expect(status.exitCode).toBe(0);
    expect(JSON.parse(status.stdout).freshness.status).toBe('FRESH');
  });

  it('does NOT recalculate evidenceFingerprint on DEGRADED path', async () => {
    await fs.writeFile(
      path.join(tempDir, 'openspec', 'config.yaml'),
      'schema: spec-driven\noptimization:\n  enabled: true\n  optRetries: 1\n',
      'utf-8'
    );

    await runCLI([
      'verify',
      'phase1',
      'c1',
      '--input',
      JSON.stringify({ result: 'PASS', issues: [], evidenceFiles: ['src/a.ts'] }),
    ], { cwd: tempDir });

    const phase1Result = JSON.parse(
      await fs.readFile(path.join(tempDir, 'openspec', 'changes', 'c1', '.verify-result.json'), 'utf-8')
    );
    const phase1Fingerprint = phase1Result.verificationContext.evidenceFingerprint;

    await runCLI([
      'verify',
      'phase2',
      'c1',
      '--type=optimization',
      '--files',
      'src/a.ts',
      '--input',
      JSON.stringify({ status: 'OPTIMIZATION_PROPOSED', summary: 'attempt' }),
    ], { cwd: tempDir });
    await fs.writeFile(path.join(tempDir, 'src', 'a.ts'), 'const changed = true;\n', 'utf-8');

    await runCLI([
      'verify',
      'phase2',
      'c1',
      '--type=verification',
      '--json',
      '--input',
      JSON.stringify({
        result: 'FAIL_NEEDS_REMEDIATION',
        issues: [],
        summary: 'attempt',
        behaviorRetryCounter: 1,
      }),
    ], { cwd: tempDir });

    const finalResult = JSON.parse(
      await fs.readFile(path.join(tempDir, 'openspec', 'changes', 'c1', '.verify-result.json'), 'utf-8')
    );
    expect(finalResult.optimization.status).toBe('DEGRADED');
    expect(finalResult.verificationContext.evidenceFingerprint).toBe(phase1Fingerprint);
  });
});
