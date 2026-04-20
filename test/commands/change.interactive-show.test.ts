import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import { runCLI } from '../helpers/run-cli.js';

describe('change show (interactive behavior)', () => {
  const projectRoot = process.cwd();
  const testDir = path.join(projectRoot, 'test-change-show-tmp');
  const changesDir = path.join(testDir, 'openspec', 'changes');

  beforeEach(async () => {
    await fs.mkdir(changesDir, { recursive: true });
    const content = `# Change: Demo\n\n## Why\n\n## What Changes\n- x`;
    await fs.mkdir(path.join(changesDir, 'demo'), { recursive: true });
    await fs.writeFile(path.join(changesDir, 'demo', 'proposal.md'), content, 'utf-8');
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it('prints list hint and exits non-zero when no arg and non-interactive', async () => {
    const result = await runCLI(['change', 'show'], {
      cwd: testDir,
      env: { OPEN_SPEC_INTERACTIVE: '0' },
    });
    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toContain('Available IDs:');
    expect(result.stderr).toContain('openspec change list');
  });
});
