import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { randomUUID } from 'crypto';
import { bootstrapInstructionsCommand, bootstrapStatusCommand } from '../../src/commands/bootstrap.js';
import { initBootstrap } from '../../src/utils/bootstrap-utils.js';

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

describe('bootstrap command Phase 1 baseline contract', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = path.join(os.tmpdir(), `openspec-bootstrap-cli-${randomUUID()}`);
    await fs.mkdir(path.join(testDir, 'openspec'), { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it('returns structured pre-init status for specs-only repositories', async () => {
    await fs.mkdir(path.join(testDir, 'openspec', 'specs'), { recursive: true });

    const status = await withCwd(testDir, () => captureJsonOutput(() => bootstrapStatusCommand({ json: true })));
    expect(status).toMatchObject({
      initialized: false,
      baselineType: 'specs-only',
      supported: true,
      allowedModes: ['full'],
      nextAction: 'init',
    });
  });

  it('returns structured pre-init status for unsupported formal-opsx repositories', async () => {
    await fs.writeFile(path.join(testDir, 'openspec', 'project.opsx.yaml'), 'schema_version: 1\nproject:\n  id: demo\n  name: Demo\n');
    await fs.writeFile(path.join(testDir, 'openspec', 'project.opsx.relations.yaml'), 'schema_version: 1\nrelations: []\n');
    await fs.writeFile(path.join(testDir, 'openspec', 'project.opsx.code-map.yaml'), 'schema_version: 1\nnodes: []\n');

    const status = await withCwd(testDir, () => captureJsonOutput(() => bootstrapStatusCommand({ json: true })));
    expect(status).toMatchObject({
      initialized: false,
      baselineType: 'formal-opsx',
      supported: false,
      allowedModes: [],
      nextAction: null,
    });
    expect(status.reason).toContain('existing formal OPSX files');
  });

  it('returns pre-init instructions json instead of init-first error', async () => {
    await fs.mkdir(path.join(testDir, 'openspec', 'specs'), { recursive: true });

    const instructions = await withCwd(
      testDir,
      () => captureJsonOutput(() => bootstrapInstructionsCommand(undefined, { json: true }))
    );
    expect(instructions).toMatchObject({
      initialized: false,
      phase: 'init',
      currentPhase: null,
      baselineType: 'specs-only',
      supported: true,
      allowedModes: ['full'],
      nextAction: 'init',
    });
    expect(instructions.instruction).toContain('Run: openspec bootstrap init --mode full');
  });

  it('rejects unsupported baseline before creating bootstrap workspace', async () => {
    await fs.writeFile(path.join(testDir, 'openspec', 'project.opsx.yaml'), 'schema_version: 1\nproject:\n  id: demo\n  name: Demo\n');
    await fs.writeFile(path.join(testDir, 'openspec', 'project.opsx.relations.yaml'), 'schema_version: 1\nrelations: []\n');
    await fs.writeFile(path.join(testDir, 'openspec', 'project.opsx.code-map.yaml'), 'schema_version: 1\nnodes: []\n');

    await expect(initBootstrap(testDir, { mode: 'full' })).rejects.toThrow('existing formal OPSX files');
    await expect(fs.stat(path.join(testDir, 'openspec', 'bootstrap'))).rejects.toThrow();
  });

  it('rejects unsupported baseline-to-mode combinations with valid modes listed', async () => {
    await fs.mkdir(path.join(testDir, 'openspec', 'specs'), { recursive: true });

    await expect(initBootstrap(testDir, { mode: 'opsx-first' })).rejects.toThrow(
      "Bootstrap mode 'opsx-first' is not supported for baseline 'specs-only'. Valid modes: full"
    );
    await expect(fs.stat(path.join(testDir, 'openspec', 'bootstrap'))).rejects.toThrow();
  });

  it('persists baseline type and approved mode names on init', async () => {
    await initBootstrap(testDir, { mode: 'opsx-first' });
    const metadata = await fs.readFile(path.join(testDir, 'openspec', 'bootstrap', '.bootstrap.yaml'), 'utf-8');
    expect(metadata).toContain('baseline_type: no-spec');
    expect(metadata).toContain('mode: opsx-first');
  });
});
