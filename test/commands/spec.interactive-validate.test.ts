import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import { runCLI } from '../helpers/run-cli.js';

describe('spec validate (interactive behavior)', () => {
  const projectRoot = process.cwd();
  const testDir = path.join(projectRoot, 'test-spec-validate-tmp');
  const specsDir = path.join(testDir, 'openspec', 'specs');

  beforeEach(async () => {
    await fs.mkdir(specsDir, { recursive: true });
    const content = `## Purpose\nValid spec for interactive test.\n\n## Requirements\n\n### Requirement: X\nText`;
    await fs.mkdir(path.join(specsDir, 's1'), { recursive: true });
    await fs.writeFile(path.join(specsDir, 's1', 'spec.md'), content, 'utf-8');
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it('errors when no arg and non-interactive', async () => {
    const result = await runCLI(['spec', 'validate'], {
      cwd: testDir,
      env: { OPEN_SPEC_INTERACTIVE: '0' },
    });
    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toContain('Missing required argument <spec-id>');
  });
});
