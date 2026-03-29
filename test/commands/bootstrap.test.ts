import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { randomUUID } from 'crypto';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import { bootstrapInstructionsCommand, bootstrapPromoteCommand, bootstrapStatusCommand } from '../../src/commands/bootstrap.js';
import {
  bootstrapInitCommand,
  bootstrapValidateCommand,
} from '../../src/commands/bootstrap.js';
import {
  getBootstrapStatus,
  initBootstrap,
  refreshBootstrapDerivedArtifacts,
} from '../../src/utils/bootstrap-utils.js';

vi.mock('@inquirer/prompts', () => ({
  select: vi.fn(),
}));

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

async function captureTextOutput(fn: () => Promise<void>): Promise<string> {
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

  return messages.join('\n');
}

async function setBootstrapPhase(projectDir: string, phase: string): Promise<void> {
  const metadataPath = path.join(projectDir, 'openspec', 'bootstrap', '.bootstrap.yaml');
  const metadata = parseYaml(await fs.readFile(metadataPath, 'utf-8')) as Record<string, unknown>;
  metadata.phase = phase;
  await fs.writeFile(metadataPath, stringifyYaml(metadata, { lineWidth: 0 }), 'utf-8');
}

describe('bootstrap command Phase 1 baseline contract', () => {
  let testDir: string;
  let originalIsTTY: boolean | undefined;

  beforeEach(async () => {
    testDir = path.join(os.tmpdir(), `openspec-bootstrap-cli-${randomUUID()}`);
    await fs.mkdir(path.join(testDir, 'openspec'), { recursive: true });
    originalIsTTY = (process.stdout as NodeJS.WriteStream & { isTTY?: boolean }).isTTY;
  });

  afterEach(async () => {
    (process.stdout as NodeJS.WriteStream & { isTTY?: boolean }).isTTY = originalIsTTY;
    await fs.rm(testDir, { recursive: true, force: true });
    vi.clearAllMocks();
  });

  it('returns structured pre-init status for raw repositories with an empty specs directory', async () => {
    await fs.mkdir(path.join(testDir, 'openspec', 'specs'), { recursive: true });

    const status = await withCwd(testDir, () => captureJsonOutput(() => bootstrapStatusCommand({ json: true })));
    expect(status).toMatchObject({
      initialized: false,
      baselineType: 'raw',
      supported: true,
      allowedModes: ['full', 'opsx-first'],
      nextAction: 'init',
    });
  });

  it('returns structured pre-init status for specs-based repositories', async () => {
    await fs.mkdir(path.join(testDir, 'openspec', 'specs', 'auth'), { recursive: true });
    await fs.writeFile(path.join(testDir, 'openspec', 'specs', 'auth', 'spec.md'), '# Auth\n', 'utf-8');

    const status = await withCwd(testDir, () => captureJsonOutput(() => bootstrapStatusCommand({ json: true })));
    expect(status).toMatchObject({
      initialized: false,
      baselineType: 'specs-based',
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
    await fs.mkdir(path.join(testDir, 'openspec', 'specs', 'auth'), { recursive: true });
    await fs.writeFile(path.join(testDir, 'openspec', 'specs', 'auth', 'spec.md'), '# Auth\n', 'utf-8');

    const instructions = await withCwd(
      testDir,
      () => captureJsonOutput(() => bootstrapInstructionsCommand(undefined, { json: true }))
    );
    expect(instructions).toMatchObject({
      initialized: false,
      phase: 'init',
      currentPhase: null,
      baselineType: 'specs-based',
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
    await fs.mkdir(path.join(testDir, 'openspec', 'specs', 'auth'), { recursive: true });
    await fs.writeFile(path.join(testDir, 'openspec', 'specs', 'auth', 'spec.md'), '# Auth\n', 'utf-8');

    await expect(initBootstrap(testDir, { mode: 'opsx-first' })).rejects.toThrow(
      "Bootstrap mode 'opsx-first' is not supported for baseline 'specs-based'. Valid modes: full"
    );
    await expect(fs.stat(path.join(testDir, 'openspec', 'bootstrap'))).rejects.toThrow();
  });

  it('persists baseline type and approved mode names on init', async () => {
    await initBootstrap(testDir, { mode: 'opsx-first' });
    const metadata = await fs.readFile(path.join(testDir, 'openspec', 'bootstrap', '.bootstrap.yaml'), 'utf-8');
    expect(metadata).toContain('baseline_type: raw');
    expect(metadata).toContain('mode: opsx-first');
  });

  it('prompts for bootstrap mode on TTY when --mode is omitted', async () => {
    const { select } = await import('@inquirer/prompts');
    const mockSelect = select as unknown as ReturnType<typeof vi.fn>;
    (process.stdout as NodeJS.WriteStream & { isTTY?: boolean }).isTTY = true;
    mockSelect.mockResolvedValueOnce('opsx-first');

    await withCwd(testDir, () => bootstrapInitCommand({}));

    expect(mockSelect).toHaveBeenCalledWith({
      message: 'Select bootstrap mode',
      choices: [
        { name: 'full', value: 'full' },
        { name: 'opsx-first', value: 'opsx-first' },
      ],
    });

    const metadata = await fs.readFile(path.join(testDir, 'openspec', 'bootstrap', '.bootstrap.yaml'), 'utf-8');
    expect(metadata).toContain('mode: opsx-first');
  });

  it('fails fast on non-TTY when --mode is omitted', async () => {
    const { select } = await import('@inquirer/prompts');
    const mockSelect = select as unknown as ReturnType<typeof vi.fn>;
    (process.stdout as NodeJS.WriteStream & { isTTY?: boolean }).isTTY = false;

    await expect(withCwd(testDir, () => bootstrapInitCommand({}))).rejects.toThrow(
      'Missing required option --mode in non-interactive mode.'
    );
    expect(mockSelect).not.toHaveBeenCalled();
    await expect(fs.stat(path.join(testDir, 'openspec', 'bootstrap'))).rejects.toThrow();
  });

  it('does not prompt on TTY when --mode is explicitly provided', async () => {
    const { select } = await import('@inquirer/prompts');
    const mockSelect = select as unknown as ReturnType<typeof vi.fn>;
    (process.stdout as NodeJS.WriteStream & { isTTY?: boolean }).isTTY = true;

    await withCwd(testDir, () => bootstrapInitCommand({ mode: 'full' }));

    expect(mockSelect).not.toHaveBeenCalled();
    const metadata = await fs.readFile(path.join(testDir, 'openspec', 'bootstrap', '.bootstrap.yaml'), 'utf-8');
    expect(metadata).toContain('mode: full');
  });

  it('allows explicit --mode on non-TTY without prompting', async () => {
    const { select } = await import('@inquirer/prompts');
    const mockSelect = select as unknown as ReturnType<typeof vi.fn>;
    (process.stdout as NodeJS.WriteStream & { isTTY?: boolean }).isTTY = false;

    await withCwd(testDir, () => bootstrapInitCommand({ mode: 'opsx-first' }));

    expect(mockSelect).not.toHaveBeenCalled();
    const metadata = await fs.readFile(path.join(testDir, 'openspec', 'bootstrap', '.bootstrap.yaml'), 'utf-8');
    expect(metadata).toContain('mode: opsx-first');
  });

  it('bootstrap validate restores current derived states after an invalid domain-map is fixed', async () => {
    const originalExitCode = process.exitCode;
    await initBootstrap(testDir, { mode: 'full' });

    await fs.mkdir(path.join(testDir, 'src', 'auth'), { recursive: true });
    await fs.writeFile(path.join(testDir, 'src', 'auth', 'index.ts'), 'export {};\n', 'utf-8');
    await fs.writeFile(
      path.join(testDir, 'openspec', 'bootstrap', 'evidence.yaml'),
      `domains:
  - id: dom.auth
    confidence: high
    sources:
      - code:src/auth/index.ts
    intent: Authentication
`,
      'utf-8'
    );
    await fs.writeFile(
      path.join(testDir, 'openspec', 'bootstrap', 'domain-map', 'dom.auth.yaml'),
      `domain:
  id: dom.auth
  type: domain
  intent: Authentication boundary
capabilities:
  - id: cap.auth.login
    type: capability
    intent: Login users
    spec:
      folder: auth
      purpose: Login users purpose
      requirements:
        - title: Login
          text: The system SHALL authenticate users.
          scenarios:
            - title: Successful login
              steps:
                - keyword: WHEN
                  text: valid credentials are submitted
                - keyword: THEN
                  text: access is granted
relations:
  - from: cap.auth.login
    to: dom.auth
    type: contains
code_refs:
  - id: cap.auth.login
    refs:
      - path: src/auth/index.ts
        line_start: 1
`,
      'utf-8'
    );

    await refreshBootstrapDerivedArtifacts(testDir);
    await setBootstrapPhase(testDir, 'review');

    let status = await getBootstrapStatus(testDir);
    expect(status.initialized).toBe(true);
    if (!status.initialized) {
      throw new Error('Expected initialized bootstrap status');
    }
    expect(status.candidateState).toBe('current');
    expect(status.reviewState).toBe('current');

    await fs.writeFile(
      path.join(testDir, 'openspec', 'bootstrap', 'domain-map', 'dom.auth.yaml'),
      `domain:
  id: dom.auth
capabilities:
  - id: invalid-capability
    type: capability
    intent: broken
`,
      'utf-8'
    );

    status = await getBootstrapStatus(testDir);
    expect(status.initialized).toBe(true);
    if (!status.initialized) {
      throw new Error('Expected initialized bootstrap status');
    }
    expect(status.candidateState).toBe('stale');
    expect(status.reviewState).toBe('stale');

    await fs.writeFile(
      path.join(testDir, 'openspec', 'bootstrap', 'domain-map', 'dom.auth.yaml'),
      `domain:
  id: dom.auth
  type: domain
  intent: Authentication boundary
capabilities:
  - id: cap.auth.login
    type: capability
    intent: Login users
    spec:
      folder: auth
      purpose: Login users purpose
      requirements:
        - title: Login
          text: The system SHALL authenticate users.
          scenarios:
            - title: Successful login
              steps:
                - keyword: WHEN
                  text: valid credentials are submitted
                - keyword: THEN
                  text: access is granted
relations:
  - from: cap.auth.login
    to: dom.auth
    type: contains
code_refs:
  - id: cap.auth.login
    refs:
      - path: src/auth/index.ts
        line_start: 1
`,
      'utf-8'
    );

    process.exitCode = undefined;
    const validateResult = await withCwd(
      testDir,
      () => captureJsonOutput(() => bootstrapValidateCommand({ json: true }))
    );
    expect(validateResult.phase).toBe('review');

    status = await getBootstrapStatus(testDir);
    expect(status.initialized).toBe(true);
    if (!status.initialized) {
      throw new Error('Expected initialized bootstrap status');
    }
    expect(status.candidateState).toBe('current');
    expect(status.reviewState).toBe('current');
    process.exitCode = originalExitCode;
  });

  it('prints the retained bootstrap workspace notice after promote succeeds', async () => {
    await initBootstrap(testDir, { mode: 'full' });

    await fs.mkdir(path.join(testDir, 'src', 'auth'), { recursive: true });
    await fs.writeFile(path.join(testDir, 'src', 'auth', 'index.ts'), 'export {};\n', 'utf-8');
    await fs.writeFile(
      path.join(testDir, 'openspec', 'bootstrap', 'evidence.yaml'),
      `domains:
  - id: dom.auth
    confidence: high
    sources:
      - code:src/auth/index.ts
    intent: Authentication
`,
      'utf-8'
    );
    await fs.writeFile(
      path.join(testDir, 'openspec', 'bootstrap', 'domain-map', 'dom.auth.yaml'),
      `domain:
  id: dom.auth
  type: domain
  intent: Authentication boundary
capabilities:
  - id: cap.auth.login
    type: capability
    intent: Login users
    spec:
      folder: auth
      purpose: Login users purpose
      requirements:
        - title: Login
          text: The system SHALL authenticate users.
          scenarios:
            - title: Successful login
              steps:
                - keyword: WHEN
                  text: valid credentials are submitted
                - keyword: THEN
                  text: access is granted
relations:
  - from: cap.auth.login
    to: dom.auth
    type: contains
code_refs:
  - id: cap.auth.login
    refs:
      - path: src/auth/index.ts
        line_start: 1
`,
      'utf-8'
    );

    await refreshBootstrapDerivedArtifacts(testDir);

    const reviewPath = path.join(testDir, 'openspec', 'bootstrap', 'review.md');
    const review = await fs.readFile(reviewPath, 'utf-8');
    await fs.writeFile(reviewPath, review.replace(/- \[ \]/g, '- [x]'), 'utf-8');

    const output = await withCwd(testDir, () => captureTextOutput(() => bootstrapPromoteCommand({ yes: true })));

    expect(output).toContain(
      'Bootstrap workspace retained at openspec/bootstrap/. You may delete it manually once you no longer need it.'
    );
  });
});
