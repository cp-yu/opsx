import { afterAll, describe, expect, it } from 'vitest';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { runCLI } from '../helpers/run-cli.js';

const tempRoots: string[] = [];

async function createProject(): Promise<string> {
  const projectDir = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-spec-list-'));
  tempRoots.push(projectDir);
  return projectDir;
}

async function writeSpec(projectDir: string, id: string, content: string): Promise<void> {
  const specDir = path.join(projectDir, 'openspec', 'specs', id);
  await fs.mkdir(specDir, { recursive: true });
  await fs.writeFile(path.join(specDir, 'spec.md'), content, 'utf8');
}

afterAll(async () => {
  await Promise.all(tempRoots.map(dir => fs.rm(dir, { recursive: true, force: true })));
});

describe('openspec spec list', () => {
  it('includes capabilities in json output without removing existing fields', async () => {
    const projectDir = await createProject();
    await writeSpec(projectDir, 'archive', `---
capabilities:
  - cap.cli.archive
---
# Archive

## Purpose
Archive completed changes.

## Requirements

### Requirement: Archive
The system SHALL archive completed changes.

#### Scenario: Archive succeeds
- **WHEN** archive runs
- **THEN** the change is archived
`);
    await writeSpec(projectDir, 'legacy', `# Legacy

## Purpose
Legacy spec without frontmatter.

## Requirements
`);

    const result = await runCLI(['spec', 'list', '--json'], { cwd: projectDir });

    expect(result.exitCode).toBe(0);
    const output = JSON.parse(result.stdout);
    expect(result.stderr).toContain('deprecated');
    expect(output).toEqual([
      {
        id: 'archive',
        title: 'archive',
        requirementCount: 1,
        capabilities: ['cap.cli.archive'],
      },
      {
        id: 'legacy',
        title: 'legacy',
        requirementCount: 0,
        capabilities: [],
      },
    ]);
  });
});
