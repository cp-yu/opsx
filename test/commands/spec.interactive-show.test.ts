import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import { runCLI } from '../helpers/run-cli.js';

describe('spec show (interactive behavior)', () => {
  const projectRoot = process.cwd();
  const testDir = path.join(projectRoot, 'test-spec-show-tmp');
  const specsDir = path.join(testDir, 'openspec', 'specs');

  beforeEach(async () => {
    await fs.mkdir(specsDir, { recursive: true });
    const content = `## Purpose\nX\n\n## Requirements\n\n### Requirement: R\nText`;
    await fs.mkdir(path.join(specsDir, 's1'), { recursive: true });
    await fs.writeFile(path.join(specsDir, 's1', 'spec.md'), content, 'utf-8');
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it('errors when no arg and non-interactive', async () => {
    const result = await runCLI(['spec', 'show'], {
      cwd: testDir,
      env: { OPEN_SPEC_INTERACTIVE: '0' },
    });
    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toContain('Missing required argument <spec-id>');
  });
});
