import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { runCLI } from '../helpers/run-cli.js';

describe('openspec verify command', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-verify-cli-'));
    await fs.mkdir(path.join(tempDir, 'openspec', 'changes', 'c1'), { recursive: true });
    await fs.mkdir(path.join(tempDir, 'src'), { recursive: true });
    await fs.writeFile(path.join(tempDir, 'openspec', 'changes', 'c1', 'tasks.md'), '- [x] task\n', 'utf-8');
    await fs.writeFile(path.join(tempDir, 'src', 'a.ts'), 'const a = 1;\n', 'utf-8');
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
    expect(JSON.parse(phase1.stdout).nextStep).toBe('进入 Phase 2');

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
      JSON.stringify({ status: 'NO_OPTIMIZATION_NEEDED' }),
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
});
