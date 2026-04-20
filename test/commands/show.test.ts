import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import { runCLI } from '../helpers/run-cli.js';

describe('top-level show command', () => {
  const projectRoot = process.cwd();
  const testDir = path.join(projectRoot, 'test-show-command-tmp');
  const changesDir = path.join(testDir, 'openspec', 'changes');
  const specsDir = path.join(testDir, 'openspec', 'specs');

  beforeEach(async () => {
    await fs.mkdir(changesDir, { recursive: true });
    await fs.mkdir(specsDir, { recursive: true });

    const changeContent = `# Change: Demo\n\n## Why\nBecause reasons.\n\n## What Changes\n- **auth:** Add requirement\n`;
    await fs.mkdir(path.join(changesDir, 'demo'), { recursive: true });
    await fs.writeFile(path.join(changesDir, 'demo', 'proposal.md'), changeContent, 'utf-8');

    const specContent = `## Purpose\nAuth spec.\n\n## Requirements\n\n### Requirement: User Authentication\nText\n`;
    await fs.mkdir(path.join(specsDir, 'auth'), { recursive: true });
    await fs.writeFile(path.join(specsDir, 'auth', 'spec.md'), specContent, 'utf-8');
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it('prints hint and non-zero exit when no args and non-interactive', async () => {
    const result = await runCLI(['show'], {
      cwd: testDir,
      env: { OPEN_SPEC_INTERACTIVE: '0' },
    });
    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toContain('Nothing to show.');
    expect(result.stderr).toContain('openspec show <item>');
    expect(result.stderr).toContain('openspec change show');
    expect(result.stderr).toContain('openspec spec show');
  });

  it('auto-detects change id and supports --json', async () => {
    const result = await runCLI(['show', 'demo', '--json'], { cwd: testDir });
    expect(result.exitCode).toBe(0);
    const json = JSON.parse(result.stdout);
    expect(json.id).toBe('demo');
    expect(Array.isArray(json.deltas)).toBe(true);
  });

  it('auto-detects spec id and supports spec-only flags', async () => {
    const result = await runCLI(['show', 'auth', '--json', '--requirements'], { cwd: testDir });
    expect(result.exitCode).toBe(0);
    const json = JSON.parse(result.stdout);
    expect(json.id).toBe('auth');
    expect(Array.isArray(json.requirements)).toBe(true);
  });

  it('handles ambiguity and suggests --type', async () => {
    // create matching spec and change named 'foo'
    await fs.mkdir(path.join(changesDir, 'foo'), { recursive: true });
    await fs.writeFile(path.join(changesDir, 'foo', 'proposal.md'), '# Change: Foo\n\n## Why\n\n## What Changes\n', 'utf-8');
    await fs.mkdir(path.join(specsDir, 'foo'), { recursive: true });
    await fs.writeFile(path.join(specsDir, 'foo', 'spec.md'), '## Purpose\n\n## Requirements\n\n### Requirement: R\nX', 'utf-8');

    const result = await runCLI(['show', 'foo'], { cwd: testDir });
    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toContain('Ambiguous item');
    expect(result.stderr).toContain('--type change|spec');
  });

  it('prints nearest matches when not found', async () => {
    const result = await runCLI(['show', 'unknown-item'], { cwd: testDir });
    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toContain("Unknown item 'unknown-item'");
    expect(result.stderr).toContain('Did you mean:');
  });
});
