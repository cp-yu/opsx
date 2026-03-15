import { afterAll, describe, expect, it } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import { tmpdir } from 'os';
import { bootstrapInstructionsCommand, bootstrapStatusCommand } from '../../src/commands/bootstrap.js';
import { initBootstrap } from '../../src/utils/bootstrap-utils.js';

const tempRoots: string[] = [];

async function withCwd<T>(cwd: string, fn: () => Promise<T>): Promise<T> {
  const original = process.cwd();
  process.chdir(cwd);
  try {
    return await fn();
  } finally {
    process.chdir(original);
  }
}

async function captureJsonOutput(fn: () => Promise<void>): Promise<any> {
  const messages: string[] = [];
  const originalLog = console.log;
  console.log = (...args: unknown[]) => {
    messages.push(args.join(' '));
  };

  try {
    await fn();
  } finally {
    console.log = originalLog;
  }

  const output = messages.join('\n');
  const start = output.indexOf('{');
  if (start === -1) {
    throw new Error(`No JSON output captured: ${output}`);
  }
  return JSON.parse(output.slice(start));
}

async function createTempProject(): Promise<string> {
  const projectDir = await fs.mkdtemp(path.join(tmpdir(), 'openspec-bootstrap-phase1-'));
  tempRoots.push(projectDir);
  return projectDir;
}

async function writeFile(projectDir: string, relativePath: string, content: string): Promise<void> {
  const filePath = path.join(projectDir, relativePath);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, 'utf-8');
}

async function pathExists(projectDir: string, relativePath: string): Promise<boolean> {
  try {
    await fs.access(path.join(projectDir, relativePath));
    return true;
  } catch {
    return false;
  }
}

async function writeFormalOpsxBundle(projectDir: string): Promise<void> {
  await writeFile(projectDir, 'openspec/project.opsx.yaml', `schema_version: 1
project:
  id: project
  name: Project
domains: []
capabilities: []
`);
  await writeFile(projectDir, 'openspec/project.opsx.relations.yaml', `schema_version: 1
relations: []
`);
  await writeFile(projectDir, 'openspec/project.opsx.code-map.yaml', `schema_version: 1
generated_at: "2026-03-13T00:00:00.000Z"
nodes: []
`);
}

afterAll(async () => {
  await Promise.all(tempRoots.map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

describe('openspec bootstrap Phase 1', () => {
  it('returns structured pre-init status for a specs-only baseline', async () => {
    const projectDir = await createTempProject();
    await writeFile(projectDir, 'openspec/specs/auth/spec.md', '# Auth spec\n');

    const json = await withCwd(projectDir, () => captureJsonOutput(() => bootstrapStatusCommand({ json: true })));
    expect(json).toMatchObject({
      initialized: false,
      baselineType: 'specs-only',
      supported: true,
      allowedModes: ['full'],
      nextAction: 'init',
      reason: 'Repository has specs but no formal OPSX files.',
    });
  });

  it('returns structured pre-init status for an invalid partial OPSX baseline', async () => {
    const projectDir = await createTempProject();
    await writeFile(projectDir, 'openspec/project.opsx.yaml', `schema_version: 1
project:
  id: project
  name: Project
domains: []
capabilities: []
`);

    const json = await withCwd(projectDir, () => captureJsonOutput(() => bootstrapStatusCommand({ json: true })));
    expect(json).toMatchObject({
      initialized: false,
      baselineType: 'invalid-partial-opsx',
      supported: false,
      allowedModes: [],
      nextAction: null,
      reason: 'Bootstrap does not support repositories with partial or invalid formal OPSX files.',
    });
  });

  it('returns pre-init instructions JSON instead of an init-first exception', async () => {
    const projectDir = await createTempProject();

    const json = await withCwd(
      projectDir,
      () => captureJsonOutput(() => bootstrapInstructionsCommand('scan', { json: true }))
    );
    expect(json.initialized).toBe(false);
    expect(json.phase).toBe('init');
    expect(json.requestedPhase).toBe('scan');
    expect(json.currentPhase).toBeNull();
    expect(json.baselineType).toBe('no-spec');
    expect(json.supported).toBe(true);
    expect(json.allowedModes).toContain('full');
    expect(json.allowedModes).toContain('opsx-first');
    expect(json.instruction).toContain("requested phase 'scan' is unavailable before initialization");
    expect(json.instruction).toContain('openspec bootstrap init --mode');
  });

  it('rejects repositories with formal OPSX before creating openspec/bootstrap', async () => {
    const projectDir = await createTempProject();
    await writeFormalOpsxBundle(projectDir);

    await expect(initBootstrap(projectDir, { mode: 'full' })).rejects.toThrow(
      'Bootstrap does not support repositories with existing formal OPSX files.'
    );
    expect(await pathExists(projectDir, 'openspec/bootstrap')).toBe(false);
  });

  it('rejects unsupported baseline-to-mode combinations with valid modes in the error', async () => {
    const projectDir = await createTempProject();
    await writeFile(projectDir, 'openspec/specs/auth/spec.md', '# Auth spec\n');

    await expect(initBootstrap(projectDir, { mode: 'opsx-first' })).rejects.toThrow(
      "Bootstrap mode 'opsx-first' is not supported for baseline 'specs-only'. Valid modes: full"
    );
    expect(await pathExists(projectDir, 'openspec/bootstrap')).toBe(false);
  });
});
