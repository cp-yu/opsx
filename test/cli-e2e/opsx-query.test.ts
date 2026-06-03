import { afterAll, describe, expect, it } from 'vitest';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { runCLI } from '../helpers/run-cli.js';

const tempRoots: string[] = [];

async function createProject(): Promise<string> {
  const projectDir = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-opsx-query-e2e-'));
  tempRoots.push(projectDir);
  await fs.mkdir(path.join(projectDir, 'openspec', 'specs', 'cli-list'), { recursive: true });
  await fs.writeFile(
    path.join(projectDir, 'openspec', 'project.opsx.yaml'),
    `schema_version: 1
project:
  id: proj.e2e
  name: E2E
domains:
  - id: dom.cli
    type: domain
    intent: CLI domain
    status: active
capabilities:
  - id: cap.cli.list
    type: capability
    intent: List items
    status: active
  - id: cap.cli.opsx-query
    type: capability
    intent: Query OPSX nodes
    status: active
`
  );
  await fs.writeFile(
    path.join(projectDir, 'openspec', 'project.opsx.relations.yaml'),
    `schema_version: 1
relations:
  - from: cap.cli.list
    to: dom.cli
    type: contains
  - from: cap.cli.opsx-query
    to: cap.cli.list
    type: depends_on
`
  );
  await fs.writeFile(
    path.join(projectDir, 'openspec', 'project.opsx.code-map.yaml'),
    `schema_version: 1
nodes:
  - id: cap.cli.list
    refs:
      - path: src/core/list.ts
`
  );
  await fs.writeFile(
    path.join(projectDir, 'openspec', 'specs', 'cli-list', 'spec.md'),
    `---
capabilities:
  - cap.cli.list
---
# cli-list

## Purpose
List specs.

## Requirements

### Requirement: JSON output
The system SHALL output JSON.
`
  );
  return projectDir;
}

afterAll(async () => {
  await Promise.all(tempRoots.map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

describe('openspec opsx query e2e', () => {
  it('queries an existing OPSX node as JSON', async () => {
    const projectDir = await createProject();

    const result = await runCLI(['opsx', 'query', 'cap.cli.list', '--json'], { cwd: projectDir });

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    const output = JSON.parse(result.stdout);
    expect(output.node.id).toBe('cap.cli.list');
    expect(output.relations.outgoing).toEqual([
      { from: 'cap.cli.list', to: 'dom.cli', type: 'contains' },
    ]);
    expect(output.codeMap).toEqual([{ path: 'src/core/list.ts' }]);
  });

  it('reports missing OPSX nodes with available node hints', async () => {
    const projectDir = await createProject();

    const result = await runCLI(['opsx', 'query', 'cap.missing', '--json'], { cwd: projectDir });

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("Node 'cap.missing' not found in OPSX");
    expect(result.stderr).toContain('cap.cli.list');
  });

  it('lists spec capabilities through list --specs --json', async () => {
    const projectDir = await createProject();

    const result = await runCLI(['list', '--specs', '--json'], { cwd: projectDir });

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    expect(JSON.parse(result.stdout)).toEqual([
      {
        id: 'cli-list',
        title: 'cli-list',
        requirementCount: 1,
        capabilities: ['cap.cli.list'],
      },
    ]);
  });
});
