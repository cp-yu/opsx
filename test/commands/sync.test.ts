import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { stringify as stringifyYaml } from 'yaml';
import {
  OPSX_SCHEMA_VERSION,
  readProjectOpsx,
  writeProjectOpsx,
  type ProjectOpsxBundle,
} from '../../src/utils/opsx-utils.js';
import {
  computeEvidenceFingerprint,
  computeTasksFileHash,
} from '../../src/core/verify/freshness.js';
import type { VerifyResult } from '../../src/core/verify/types.js';

vi.mock('@inquirer/prompts', () => ({
  select: vi.fn(),
}));

describe('syncCommand', () => {
  let tempDir: string;
  const originalCwd = process.cwd();
  const originalConsoleLog = console.log;

  const mkBundle = (overrides: Partial<ProjectOpsxBundle> = {}): ProjectOpsxBundle => ({
    schema_version: OPSX_SCHEMA_VERSION,
    project: { id: 'test-project', name: 'test-project' },
    domains: [],
    capabilities: [],
    relations: [],
    code_map: [],
    ...overrides,
  });

  beforeEach(async () => {
    vi.resetModules();
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-sync-test-'));
    await fs.mkdir(path.join(tempDir, 'openspec', 'changes', 'archive'), { recursive: true });
    await fs.mkdir(path.join(tempDir, 'openspec', 'specs'), { recursive: true });
    process.chdir(tempDir);
    console.log = vi.fn();
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    console.log = originalConsoleLog;
    vi.clearAllMocks();
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  async function loadSyncCommand() {
    const mod = await import('../../src/commands/sync.js');
    return mod.syncCommand;
  }

  async function createChange(changeName: string): Promise<string> {
    const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
    await fs.mkdir(changeDir, { recursive: true });
    return changeDir;
  }

  async function writeFreshVerifyResult(changeDir: string): Promise<void> {
    await fs.writeFile(path.join(changeDir, 'tasks.md'), '- [x] verified\n', 'utf-8');
    await fs.mkdir(path.join(tempDir, 'src'), { recursive: true });
    await fs.writeFile(path.join(tempDir, 'src', 'sync-evidence.ts'), 'export const ok = true;\n', 'utf-8');
    const result: VerifyResult = {
      timestamp: new Date().toISOString(),
      result: 'PASS',
      issues: [],
      tasksFileHash: (await computeTasksFileHash(path.join(changeDir, 'tasks.md')))!,
      verificationContext: {
        contractVersion: '1.0',
        evidenceFiles: ['src/sync-evidence.ts'],
        evidenceFingerprint: (await computeEvidenceFingerprint(['src/sync-evidence.ts'], tempDir)).hash,
      },
      optimization: { status: 'NOT_NEEDED', attempts: [] },
    };
    await fs.writeFile(path.join(changeDir, '.verify-result.json'), JSON.stringify(result), 'utf-8');
  }

  it('supports syncing a directly specified change', async () => {
    const syncCommand = await loadSyncCommand();
    const changeDir = await createChange('direct-sync');
    const changeSpecDir = path.join(changeDir, 'specs', 'auth');
    await fs.mkdir(changeSpecDir, { recursive: true });
    await fs.writeFile(
      path.join(changeSpecDir, 'spec.md'),
      `# Auth - Changes

## ADDED Requirements

### Requirement: The system SHALL support login

#### Scenario: Login succeeds
Given valid credentials
When the user submits the form
Then the system signs the user in`
    );

    await syncCommand('direct-sync', { noValidate: true, noVerify: true });

    const mainSpec = await fs.readFile(
      path.join(tempDir, 'openspec', 'specs', 'auth', 'spec.md'),
      'utf-8'
    );
    expect(mainSpec).toContain('### Requirement: The system SHALL support login');
    await expect(fs.access(changeDir)).resolves.not.toThrow();
    expect(console.log).toHaveBeenCalledWith("Sync complete for 'direct-sync'.");
    expect(console.log).toHaveBeenCalledWith('opsx: no-delta');
  });

  it('blocks sync when the verify gate is missing', async () => {
    const syncCommand = await loadSyncCommand();
    await createChange('blocked-sync');

    await expect(syncCommand('blocked-sync', { noValidate: true })).rejects.toThrow(
      'openspec verify phase1 blocked-sync'
    );
    await expect(syncCommand('blocked-sync', { noValidate: true })).rejects.toThrow(
      'openspec sync blocked-sync --no-verify'
    );
  });

  it('allows sync when the verify gate is fresh and archive-compatible', async () => {
    const syncCommand = await loadSyncCommand();
    const changeDir = await createChange('verified-sync');
    await writeFreshVerifyResult(changeDir);
    const changeSpecDir = path.join(changeDir, 'specs', 'verified');
    await fs.mkdir(changeSpecDir, { recursive: true });
    await fs.writeFile(
      path.join(changeSpecDir, 'spec.md'),
      `# Verified - Changes

## ADDED Requirements

### Requirement: Verified sync works`
    );

    await syncCommand('verified-sync', { noValidate: true });

    const mainSpec = await fs.readFile(
      path.join(tempDir, 'openspec', 'specs', 'verified', 'spec.md'),
      'utf-8'
    );
    expect(mainSpec).toContain('### Requirement: Verified sync works');
  });

  it('uses runtime projection when creating a new formal spec skeleton', async () => {
    const syncCommand = await loadSyncCommand();
    await fs.writeFile(
      path.join(tempDir, 'openspec', 'config.yaml'),
      'schema: spec-driven\ndocLanguage: 中文\n'
    );
    const changeDir = await createChange('localized-sync');
    const changeSpecDir = path.join(changeDir, 'specs', 'auth');
    await fs.mkdir(changeSpecDir, { recursive: true });
    await fs.writeFile(
      path.join(changeSpecDir, 'spec.md'),
      `# Auth - Changes

## ADDED Requirements

### Requirement: The system SHALL support login

#### Scenario: Login succeeds
Given valid credentials
When the user submits the form
Then the system signs the user in`
    );

    await syncCommand('localized-sync', { noValidate: true, noVerify: true });

    const mainSpec = await fs.readFile(
      path.join(tempDir, 'openspec', 'specs', 'auth', 'spec.md'),
      'utf-8'
    );
    expect(mainSpec).toContain('## Purpose');
    expect(mainSpec).toContain('此规约记录变更 localized-sync 引入的行为');
    expect(mainSpec).toContain('### Requirement: The system SHALL support login');
    expect(mainSpec).not.toContain('TBD - created by archiving change');
  });

  it('supports interactive change selection when no name is provided', async () => {
    const syncCommand = await loadSyncCommand();
    const { select } = await import('@inquirer/prompts');
    const mockSelect = select as unknown as ReturnType<typeof vi.fn>;

    const selectedChange = 'selected-sync';
    await createChange(selectedChange);
    await createChange('other-sync');

    const changeSpecDir = path.join(tempDir, 'openspec', 'changes', selectedChange, 'specs', 'docs');
    await fs.mkdir(changeSpecDir, { recursive: true });
    await fs.writeFile(
      path.join(changeSpecDir, 'spec.md'),
      `# Docs - Changes

## ADDED Requirements

### Requirement: The system SHALL publish documentation`
    );

    mockSelect.mockResolvedValueOnce(selectedChange);

    await syncCommand(undefined, { noValidate: true, noVerify: true });

    expect(mockSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Select a change to sync',
        choices: expect.arrayContaining([
          expect.objectContaining({ value: selectedChange }),
          expect.objectContaining({ value: 'other-sync' }),
        ]),
      })
    );
    expect(console.log).toHaveBeenCalledWith(`Sync complete for '${selectedChange}'.`);
  });

  it('handles the no active change case without throwing', async () => {
    const syncCommand = await loadSyncCommand();

    await syncCommand(undefined, { noValidate: true, noVerify: true });

    expect(console.log).toHaveBeenCalledWith('No active changes found.');
    expect(console.log).toHaveBeenCalledWith('No change selected. Aborting.');
  });

  it('prints No sync required when a change has no delta artifacts', async () => {
    const syncCommand = await loadSyncCommand();
    const changeDir = await createChange('no-delta-change');
    await fs.writeFile(path.join(changeDir, 'tasks.md'), '## Tasks\n- [ ] Task 1');

    await syncCommand('no-delta-change', { noValidate: true, noVerify: true });

    expect(console.log).toHaveBeenCalledWith('No sync required.');
  });

  it('is idempotent across repeated sync runs', async () => {
    const syncCommand = await loadSyncCommand();
    const changeName = 'idempotent-sync';
    const changeDir = await createChange(changeName);
    const changeSpecDir = path.join(changeDir, 'specs', 'auth');
    await fs.mkdir(changeSpecDir, { recursive: true });

    await fs.writeFile(
      path.join(changeSpecDir, 'spec.md'),
      `# Auth - Changes

## ADDED Requirements

### Requirement: The system SHALL support login

#### Scenario: Login succeeds
Given valid credentials
When the user submits the form
Then the system signs the user in`
    );

    await writeProjectOpsx(
      tempDir,
      mkBundle({
        domains: [{ id: 'dom.core', type: 'domain', intent: 'Core domain' }],
        capabilities: [{ id: 'cap.core.init', type: 'capability', intent: 'Initialize app' }],
        relations: [{ from: 'cap.core.init', to: 'dom.core', type: 'contains' }],
      })
    );

    await fs.writeFile(
      path.join(changeDir, 'opsx-delta.yaml'),
      stringifyYaml({
        schema_version: OPSX_SCHEMA_VERSION,
        ADDED: {
          domains: [{ id: 'dom.auth', type: 'domain', intent: 'Authentication domain' }],
          capabilities: [{ id: 'cap.auth.login', type: 'capability', intent: 'User login' }],
          relations: [{ from: 'cap.auth.login', to: 'dom.auth', type: 'contains' }],
        },
      })
    );

    await syncCommand(changeName, { noValidate: true, noVerify: true });
    const specAfterFirst = await fs.readFile(
      path.join(tempDir, 'openspec', 'specs', 'auth', 'spec.md'),
      'utf-8'
    );
    const opsxAfterFirst = await readProjectOpsx(tempDir);

    await syncCommand(changeName, { noValidate: true, noVerify: true });
    const specAfterSecond = await fs.readFile(
      path.join(tempDir, 'openspec', 'specs', 'auth', 'spec.md'),
      'utf-8'
    );
    const opsxAfterSecond = await readProjectOpsx(tempDir);

    expect(specAfterSecond).toBe(specAfterFirst);
    expect(opsxAfterSecond).toEqual(opsxAfterFirst);
    expect(console.log).toHaveBeenCalledWith('No sync required.');
  });
});
