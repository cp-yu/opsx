import { afterAll, describe, expect, it } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import { tmpdir } from 'os';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import { runCLI } from '../helpers/run-cli.js';

const tempRoots: string[] = [];

async function createTempProject(): Promise<string> {
  const projectDir = await fs.mkdtemp(path.join(tmpdir(), 'openspec-bootstrap-backfill-'));
  tempRoots.push(projectDir);
  return projectDir;
}

async function writeFile(projectDir: string, relativePath: string, content: string): Promise<void> {
  const filePath = path.join(projectDir, relativePath);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, 'utf-8');
}

async function readFile(projectDir: string, relativePath: string): Promise<string> {
  return fs.readFile(path.join(projectDir, relativePath), 'utf-8');
}

async function setBootstrapPhase(projectDir: string, phase: string): Promise<void> {
  const metadataPath = path.join(projectDir, 'openspec', 'bootstrap', '.bootstrap.yaml');
  const metadata = parseYaml(await fs.readFile(metadataPath, 'utf-8')) as Record<string, unknown>;
  metadata.phase = phase;
  await fs.writeFile(metadataPath, stringifyYaml(metadata, { lineWidth: 0 }), 'utf-8');
}

async function checkAllReviewBoxes(projectDir: string): Promise<void> {
  const reviewPath = path.join(projectDir, 'openspec', 'bootstrap', 'review.md');
  const review = await fs.readFile(reviewPath, 'utf-8');
  await fs.writeFile(reviewPath, review.replace(/- \[ \]/g, '- [x]'), 'utf-8');
}

async function writeOpsxAndSpecs(projectDir: string): Promise<void> {
  await writeFile(projectDir, 'openspec/project.opsx.yaml', `schema_version: 1
project:
  id: proj.test
  name: Test
capabilities:
  - id: cap.cli.archive
    type: capability
    intent: Archive changes
`);
  await writeFile(projectDir, 'openspec/project.opsx.relations.yaml', 'schema_version: 1\nrelations: []\n');
  await writeFile(projectDir, 'openspec/project.opsx.code-map.yaml', 'schema_version: 1\nnodes: []\n');
  await writeFile(projectDir, 'openspec/specs/cli-archive/spec.md', '# CLI Archive\n');
  await writeFile(projectDir, 'openspec/specs/unknown-area/spec.md', '# Unknown\n');
}

async function preparePromoteWorkspace(projectDir: string): Promise<void> {
  await writeFile(projectDir, 'src/cli/index.ts', 'export const cli = true;\n');

  expect((await runCLI(['bootstrap', 'init', '--mode', 'full'], { cwd: projectDir })).exitCode).toBe(0);
  await setBootstrapPhase(projectDir, 'scan');
  await writeFile(projectDir, 'openspec/bootstrap/evidence.yaml', `domains:
  - id: dom.cli
    confidence: high
    sources:
      - code:src/cli/index.ts
    intent: CLI command surface
`);
  expect((await runCLI(['bootstrap', 'validate'], { cwd: projectDir })).exitCode).toBe(0);
  await writeFile(projectDir, 'openspec/bootstrap/domain-map/dom.cli.yaml', `domain:
  id: dom.cli
  type: domain
  intent: CLI command surface
capabilities:
  - id: cap.cli.bootstrap
    type: capability
    intent: Bootstrap OPSX from an existing repository
    spec:
      folder: cli
      purpose: Bootstrap the repository into formal OPSX tracking.
      requirements:
        - title: Bootstrap workflow
          text: The system SHALL provide a bootstrap workflow.
          scenarios:
            - title: Bootstrap command runs
              steps:
                - keyword: WHEN
                  text: the user starts bootstrap
                - keyword: THEN
                  text: the workflow initializes correctly
relations:
  - from: cap.cli.bootstrap
    to: dom.cli
    type: contains
code_refs:
  - id: cap.cli.bootstrap
    refs:
      - path: src/cli/index.ts
        line_start: 1
`);
  expect((await runCLI(['bootstrap', 'validate'], { cwd: projectDir })).exitCode).toBe(0);
  expect((await runCLI(['bootstrap', 'validate'], { cwd: projectDir })).exitCode).toBe(1);
  await checkAllReviewBoxes(projectDir);
  expect((await runCLI(['bootstrap', 'validate'], { cwd: projectDir })).exitCode).toBe(0);
}

afterAll(async () => {
  await Promise.all(tempRoots.map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

describe('openspec bootstrap backfill-specs', () => {
  it('runs standalone and prints text statistics', async () => {
    const projectDir = await createTempProject();
    await writeOpsxAndSpecs(projectDir);

    const result = await runCLI(['bootstrap', 'backfill-specs'], { cwd: projectDir });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Backfill specs complete');
    expect(result.stdout).toContain('Written: 1');
    expect(result.stdout).toContain('Unmatched: 1');
    await expect(readFile(projectDir, 'openspec/specs/cli-archive/spec.md')).resolves.toContain('cap.cli.archive');
  });

  it('prints JSON output for standalone backfill', async () => {
    const projectDir = await createTempProject();
    await writeOpsxAndSpecs(projectDir);

    const result = await runCLI(['bootstrap', 'backfill-specs', '--json'], { cwd: projectDir });

    expect(result.exitCode).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual({
      written: [{ spec: 'cli-archive', caps: ['cap.cli.archive'] }],
      unmatched: ['unknown-area'],
    });
  });

  it('runs backfill after promote and reports statistics', async () => {
    const projectDir = await createTempProject();
    await preparePromoteWorkspace(projectDir);

    const result = await runCLI(['bootstrap', 'promote', '-y'], { cwd: projectDir });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Backfill specs: written 1, unmatched 0');
    await expect(readFile(projectDir, 'openspec/specs/cli/spec.md')).resolves.toContain('cap.cli.bootstrap');
  }, 30000);
});
