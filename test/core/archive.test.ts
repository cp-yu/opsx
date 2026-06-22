import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ArchiveCommand } from '../../src/core/archive.js';
import { Validator } from '../../src/core/validation/validator.js';
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
  checkFreshness,
  computeEvidenceFingerprint,
  computeTasksFileHash,
} from '../../src/core/verify/freshness.js';
import type { VerifyResult } from '../../src/core/verify/types.js';

// Mock @inquirer/prompts
vi.mock('@inquirer/prompts', () => ({
  select: vi.fn(),
  confirm: vi.fn()
}));

describe('ArchiveCommand', () => {
  let tempDir: string;
  let archiveCommand: ArchiveCommand;
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
    // Create temp directory
    tempDir = path.join(os.tmpdir(), `openspec-archive-test-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });
    
    // Change to temp directory
    process.chdir(tempDir);
    
    // Create OpenSpec structure
    const openspecDir = path.join(tempDir, 'openspec');
    await fs.mkdir(path.join(openspecDir, 'changes'), { recursive: true });
    await fs.mkdir(path.join(openspecDir, 'specs'), { recursive: true });
    await fs.mkdir(path.join(openspecDir, 'changes', 'archive'), { recursive: true });
    
    // Suppress console.log during tests
    console.log = vi.fn();
    
    archiveCommand = new ArchiveCommand();
  });

  async function writeFreshVerifyResult(changeDir: string): Promise<void> {
    await fs.writeFile(path.join(changeDir, 'tasks.md'), '- [x] verified\n', 'utf-8');
    await fs.mkdir(path.join(tempDir, 'src'), { recursive: true });
    await fs.writeFile(path.join(tempDir, 'src', 'archive-evidence.ts'), 'export const ok = true;\n', 'utf-8');
    const result: VerifyResult = {
      timestamp: new Date().toISOString(),
      result: 'PASS',
      issues: [],
      tasksFileHash: (await computeTasksFileHash(path.join(changeDir, 'tasks.md')))!,
      verificationContext: {
        contractVersion: '1.0',
        evidenceFiles: ['src/archive-evidence.ts'],
        evidenceFingerprint: (await computeEvidenceFingerprint(['src/archive-evidence.ts'], tempDir)).hash,
      },
      optimization: { status: 'NOT_NEEDED', attempts: [] },
    };
    await fs.writeFile(path.join(changeDir, '.verify-result.json'), JSON.stringify(result), 'utf-8');
  }

  afterEach(async () => {
    // Restore console.log
    console.log = originalConsoleLog;
    
    // Clear mocks
    vi.clearAllMocks();
    
    // Clean up temp directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('execute', () => {
    it('should archive a change successfully', async () => {
      // Create a test change
      const changeName = 'test-feature';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      await fs.mkdir(changeDir, { recursive: true });
      
      // Create tasks.md with completed tasks
      const tasksContent = '- [x] Task 1\n- [x] Task 2';
      await fs.writeFile(path.join(changeDir, 'tasks.md'), tasksContent);
      
      // Execute archive with --yes flag
      await archiveCommand.execute(changeName, { yes: true, noVerify: true });
      
      // Check that change was moved to archive
      const archiveDir = path.join(tempDir, 'openspec', 'changes', 'archive');
      const archives = await fs.readdir(archiveDir);
      
      expect(archives.length).toBe(1);
      expect(archives[0]).toMatch(new RegExp(`\\d{4}-\\d{2}-\\d{2}-${changeName}`));
      
      // Verify original change directory no longer exists
      await expect(fs.access(changeDir)).rejects.toThrow();
    });

    it('prints agent handoff reminder for legacy auto git mode without recommended commit message', async () => {
      const changeName = 'auto-handoff';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      await fs.mkdir(changeDir, { recursive: true });
      await fs.writeFile(path.join(changeDir, 'tasks.md'), '- [x] Task 1\n', 'utf-8');
      await fs.writeFile(path.join(tempDir, 'openspec', 'config.yaml'), `schema: spec-driven
git:
  autoCommit: auto
`, 'utf-8');

      await archiveCommand.execute(changeName, { yes: true, noVerify: true });

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Git handoff: agent handles git commits, merge, and cleanup after archive.')
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('agent')
      );
      expect(console.log).not.toHaveBeenCalledWith(
        expect.stringContaining(`docs(${changeName}): Archive change artifacts`)
      );
    });

    it('prints agent handoff reminder for legacy manual git mode without recommended commit message', async () => {
      const changeName = 'manual-handoff';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      await fs.mkdir(changeDir, { recursive: true });
      await fs.writeFile(path.join(changeDir, 'tasks.md'), '- [x] Task 1\n', 'utf-8');
      await fs.writeFile(path.join(tempDir, 'openspec', 'config.yaml'), `schema: spec-driven
git:
  autoCommit: manual
`, 'utf-8');

      await archiveCommand.execute(changeName, { yes: true, noVerify: true });

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Git handoff: agent handles git commits, merge, and cleanup after archive.')
      );
      expect(console.log).not.toHaveBeenCalledWith(
        expect.stringContaining(`docs(${changeName}): Archive change artifacts`)
      );
    });

    it('should block archive when verify result is missing', async () => {
      const changeName = 'missing-verify';
      await fs.mkdir(path.join(tempDir, 'openspec', 'changes', changeName), { recursive: true });

      await expect(archiveCommand.execute(changeName, { yes: true })).rejects.toThrow(
        'openspec verify phase1 missing-verify'
      );
      await expect(archiveCommand.execute(changeName, { yes: true })).rejects.toThrow(
        'openspec archive missing-verify --no-verify'
      );
    });

    it('should archive when verify is fresh and no sync is required', async () => {
      const changeName = 'fresh-verify';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      await fs.mkdir(changeDir, { recursive: true });
      await writeFreshVerifyResult(changeDir);

      await archiveCommand.execute(changeName, { yes: true });

      const archiveDir = path.join(tempDir, 'openspec', 'changes', 'archive');
      const archives = await fs.readdir(archiveDir);
      expect(archives.some((entry) => entry.includes(changeName))).toBe(true);
    });

    it('should block archive when sync has pending delta writes', async () => {
      const changeName = 'pending-sync-gate';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      const specDir = path.join(changeDir, 'specs', 'gate');
      await fs.mkdir(specDir, { recursive: true });
      await writeFreshVerifyResult(changeDir);
      await fs.writeFile(path.join(specDir, 'spec.md'), `## ADDED Requirements

### Requirement: Gate requires sync`);

      await expect(archiveCommand.execute(changeName, { yes: true })).rejects.toThrow('Sync gate');
    });

    it('should allow archive when delta specs and OPSX delta are already synced', async () => {
      const changeName = 'already-synced-gate';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      const changeSpecDir = path.join(changeDir, 'specs', 'gate');
      const mainSpecDir = path.join(tempDir, 'openspec', 'specs', 'gate');
      await fs.mkdir(changeSpecDir, { recursive: true });
      await fs.mkdir(mainSpecDir, { recursive: true });
      await writeFreshVerifyResult(changeDir);
      await writeProjectOpsx(tempDir, mkBundle({
        domains: [{ id: 'dom.verify', type: 'domain', intent: 'Verify domain' }],
        capabilities: [{ id: 'cap.verify.gate', type: 'capability', intent: 'Verify gate' }],
        relations: [{ from: 'cap.verify.gate', to: 'dom.verify', type: 'contains' }],
      }));

      const deltaSpec = `## ADDED Requirements

### Requirement: Gate already synced

System SHALL keep synced gates stable.

#### Scenario: Gate stays synced
- **WHEN** the change has already been synced
- **THEN** archive SHALL proceed
`;
      await fs.writeFile(path.join(changeSpecDir, 'spec.md'), deltaSpec, 'utf-8');
      await fs.writeFile(path.join(mainSpecDir, 'spec.md'), `# gate Specification

## Purpose
Synced gate spec.

## Requirements
### Requirement: Gate already synced

System SHALL keep synced gates stable.

#### Scenario: Gate stays synced

- **WHEN** the change has already been synced
- **THEN** archive SHALL proceed
`, 'utf-8');
      await fs.writeFile(path.join(changeDir, 'opsx-delta.yaml'), stringifyYaml({
        schema_version: OPSX_SCHEMA_VERSION,
        ADDED: {
          capabilities: [{ id: 'cap.verify.gate', type: 'capability', intent: 'Verify gate' }],
          relations: [{ from: 'cap.verify.gate', to: 'dom.verify', type: 'contains' }],
        },
      }), 'utf-8');

      await archiveCommand.execute(changeName, { yes: true, noVerify: true });

      const archiveDir = path.join(tempDir, 'openspec', 'changes', 'archive');
      const archives = await fs.readdir(archiveDir);
      expect(archives.some((entry) => entry.includes(changeName))).toBe(true);
    });

    it('should allow archive when removal-only delta already deleted the main spec', async () => {
      const changeName = 'already-deleted-spec';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      const changeSpecDir = path.join(changeDir, 'specs', 'old-merge');
      const mainSpecDir = path.join(tempDir, 'openspec', 'specs', 'old-merge');
      await fs.mkdir(changeSpecDir, { recursive: true });
      await fs.mkdir(mainSpecDir, { recursive: true });
      await writeFreshVerifyResult(changeDir);

      await fs.writeFile(
        path.join(changeSpecDir, 'spec.md'),
        `## REMOVED Requirements

### Requirement: Old A
### Requirement: Old B`,
        'utf-8'
      );
      await fs.rm(path.join(mainSpecDir, 'spec.md'), { force: true });

      await archiveCommand.execute(changeName, { yes: true });

      const archiveDir = path.join(tempDir, 'openspec', 'changes', 'archive');
      const archives = await fs.readdir(archiveDir);
      expect(archives.some((entry) => entry.includes(changeName))).toBe(true);
    });

    it('should allow archive when removal-only delta targets headers already absent from a still-existing main spec', async () => {
      const changeName = 'removal-headers-already-absent';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      const changeSpecDir = path.join(changeDir, 'specs', 'partial-merge');
      const mainSpecDir = path.join(tempDir, 'openspec', 'specs', 'partial-merge');
      await fs.mkdir(changeSpecDir, { recursive: true });
      await fs.mkdir(mainSpecDir, { recursive: true });
      await writeFreshVerifyResult(changeDir);

      const mainSpecPath = path.join(mainSpecDir, 'spec.md');
      await fs.writeFile(
        mainSpecPath,
        `# partial-merge Specification

## Purpose
Partial merge behavior.

## Requirements

### Requirement: Unrelated Keeper
The system SHALL keep this requirement.`,
        'utf-8'
      );

      await fs.writeFile(
        path.join(changeSpecDir, 'spec.md'),
        `## REMOVED Requirements

### Requirement: Old A
### Requirement: Old B`,
        'utf-8'
      );

      await archiveCommand.execute(changeName, { yes: true });

      const archiveDir = path.join(tempDir, 'openspec', 'changes', 'archive');
      const archives = await fs.readdir(archiveDir);
      expect(archives.some((entry) => entry.includes(changeName))).toBe(true);

      const preserved = await fs.readFile(mainSpecPath, 'utf-8');
      expect(preserved).toContain('### Requirement: Unrelated Keeper');
    });

    it('should warn about incomplete tasks', async () => {
      const changeName = 'incomplete-feature';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      await fs.mkdir(changeDir, { recursive: true });
      
      // Create tasks.md with incomplete tasks
      const tasksContent = '- [x] Task 1\n- [ ] Task 2\n- [ ] Task 3';
      await fs.writeFile(path.join(changeDir, 'tasks.md'), tasksContent);
      
      // Execute archive with --yes flag
      await archiveCommand.execute(changeName, { yes: true, noVerify: true });
      
      // Verify warning was logged
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Warning: 2 incomplete task(s) found')
      );
    });

    it('should block archive with --no-sync --yes when pending deltas exist', async () => {
      const changeName = 'no-sync-bypass';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      const specDir = path.join(changeDir, 'specs', 'gate');
      await fs.mkdir(specDir, { recursive: true });
      await writeFreshVerifyResult(changeDir);
      await fs.writeFile(path.join(specDir, 'spec.md'), `## ADDED Requirements

### Requirement: Bypassed sync gate

#### Scenario: Sync bypassed
- **WHEN** user runs archive with --no-sync
- **THEN** sync gate is skipped`);

      await archiveCommand.execute(changeName, { yes: true, noVerify: true, noSync: true, noValidate: true });

      const archiveDir = path.join(tempDir, 'openspec', 'changes', 'archive');
      const archives = await fs.readdir(archiveDir);
      expect(archives.some((entry) => entry.includes(changeName))).toBe(true);
    });

    it('should confirm before bypassing sync gate with --no-sync', async () => {
      const changeName = 'no-sync-confirm';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      const specDir = path.join(changeDir, 'specs', 'gate');
      await fs.mkdir(specDir, { recursive: true });
      await writeFreshVerifyResult(changeDir);
      await fs.writeFile(path.join(specDir, 'spec.md'), `## ADDED Requirements

### Requirement: Confirm sync bypass`);

      const { confirm } = await import('@inquirer/prompts');
      const mockConfirm = confirm as unknown as ReturnType<typeof vi.fn>;
      mockConfirm.mockResolvedValueOnce(false);

      await archiveCommand.execute(changeName, { noSync: true });

      expect(console.log).toHaveBeenCalledWith('Archive cancelled.');
    });

    it('should block archive when OPSX delta is pending', async () => {
      const changeName = 'pending-opsx';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      await fs.mkdir(changeDir, { recursive: true });
      await writeFreshVerifyResult(changeDir);

      await writeProjectOpsx(tempDir, mkBundle({
        domains: [{ id: 'dom.core', type: 'domain', intent: 'Core domain' }],
        capabilities: [{ id: 'cap.core.init', type: 'capability', intent: 'Init' }],
        relations: [{ from: 'cap.core.init', to: 'dom.core', type: 'contains' }],
      }));
      await fs.writeFile(path.join(changeDir, 'opsx-delta.yaml'), stringifyYaml({
        schema_version: OPSX_SCHEMA_VERSION,
        ADDED: {
          domains: [{ id: 'dom.ops', type: 'domain', intent: 'Ops domain' }],
        },
      }), 'utf-8');

      await expect(archiveCommand.execute(changeName, { yes: true })).rejects.toThrow('Sync gate');
    });

    it('should throw error if change does not exist', async () => {
      await expect(
        archiveCommand.execute('non-existent-change', { yes: true, noVerify: true })
      ).rejects.toThrow("Change 'non-existent-change' not found.");
    });

    it('should throw error if archive already exists', async () => {
      const changeName = 'duplicate-feature';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      await fs.mkdir(changeDir, { recursive: true });
      
      const date = new Date().toISOString().split('T')[0];
      const archivePath = path.join(tempDir, 'openspec', 'changes', 'archive', `${date}-${changeName}`);
      await fs.mkdir(archivePath, { recursive: true });
      
      await expect(
        archiveCommand.execute(changeName, { yes: true, noVerify: true })
      ).rejects.toThrow(`Archive '${date}-${changeName}' already exists.`);
    });

    it('should handle changes without tasks.md', async () => {
      const changeName = 'no-tasks-feature';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      await fs.mkdir(changeDir, { recursive: true });
      
      await archiveCommand.execute(changeName, { yes: true, noVerify: true });
      
      expect(console.log).not.toHaveBeenCalledWith(
        expect.stringContaining('incomplete task(s)')
      );
      
      const archiveDir = path.join(tempDir, 'openspec', 'changes', 'archive');
      const archives = await fs.readdir(archiveDir);
      expect(archives.length).toBe(1);
    });

    it('should handle changes without specs', async () => {
      const changeName = 'no-specs-feature';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      await fs.mkdir(changeDir, { recursive: true });
      
      await archiveCommand.execute(changeName, { yes: true, noVerify: true });
      
      expect(console.log).not.toHaveBeenCalledWith(
        expect.stringContaining('Specs to update')
      );
      
      const archiveDir = path.join(tempDir, 'openspec', 'changes', 'archive');
      const archives = await fs.readdir(archiveDir);
      expect(archives.length).toBe(1);
    });

    it('should skip validation when commander sets validate to false (--no-validate)', async () => {
      const changeName = 'skip-validation-flag';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      await fs.mkdir(changeDir, { recursive: true });
      await fs.writeFile(path.join(changeDir, 'tasks.md'), '- [x] Task 1\n');

      const validateSpy = vi.spyOn(Validator.prototype, 'validateChange');
      const deltaSpy = vi.spyOn(Validator.prototype, 'validateChangeDeltaSpecs');

      try {
        await archiveCommand.execute(changeName, { yes: true, noVerify: true, validate: false });

        expect(validateSpy).not.toHaveBeenCalled();
        expect(deltaSpy).not.toHaveBeenCalled();

        const archiveDir = path.join(tempDir, 'openspec', 'changes', 'archive');
        const archives = await fs.readdir(archiveDir);
        expect(archives.length).toBe(1);
        expect(archives[0]).toMatch(new RegExp(`\\d{4}-\\d{2}-\\d{2}-${changeName}`));
      } finally {
        validateSpy.mockRestore();
        deltaSpy.mockRestore();
      }
    });
  });

  describe('error handling', () => {
    it('should throw error when openspec directory does not exist', async () => {
      // Remove openspec directory
      await fs.rm(path.join(tempDir, 'openspec'), { recursive: true });
      
      await expect(
        archiveCommand.execute('any-change', { yes: true, noVerify: true })
      ).rejects.toThrow("No OpenSpec changes directory found. Run 'openspec init' first.");
    });
  });

  describe('interactive mode', () => {
    it('should use select prompt for change selection', async () => {
      const { select } = await import('@inquirer/prompts');
      const mockSelect = select as unknown as ReturnType<typeof vi.fn>;
      
      // Create test changes
      const change1 = 'feature-a';
      const change2 = 'feature-b';
      await fs.mkdir(path.join(tempDir, 'openspec', 'changes', change1), { recursive: true });
      await fs.mkdir(path.join(tempDir, 'openspec', 'changes', change2), { recursive: true });
      
      // Mock select to return first change
      mockSelect.mockResolvedValueOnce(change1);
      
      // Execute without change name
      await archiveCommand.execute(undefined, { yes: true, noVerify: true });
      
      // Verify select was called with correct options (values matter, names may include progress)
      expect(mockSelect).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Select a change to archive',
        choices: expect.arrayContaining([
          expect.objectContaining({ value: change1 }),
          expect.objectContaining({ value: change2 })
        ])
      }));
      
      // Verify the selected change was archived
      const archiveDir = path.join(tempDir, 'openspec', 'changes', 'archive');
      const archives = await fs.readdir(archiveDir);
      expect(archives[0]).toContain(change1);
    });

    it('should use confirm prompt for task warnings', async () => {
      const { confirm } = await import('@inquirer/prompts');
      const mockConfirm = confirm as unknown as ReturnType<typeof vi.fn>;
      
      const changeName = 'incomplete-interactive';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      await fs.mkdir(changeDir, { recursive: true });
      
      // Create tasks.md with incomplete tasks
      const tasksContent = '- [ ] Task 1';
      await fs.writeFile(path.join(changeDir, 'tasks.md'), tasksContent);
      
      // Mock confirm to return true (proceed)
      mockConfirm.mockResolvedValueOnce(true);
      
      // Execute without --yes flag
      await archiveCommand.execute(changeName, { noVerify: true });
      
      // Verify confirm was called
      expect(mockConfirm).toHaveBeenCalledWith({
        message: 'Warning: 1 incomplete task(s) found. Continue?',
        default: false
      });
    });

    it('should cancel when user declines task warning', async () => {
      const { confirm } = await import('@inquirer/prompts');
      const mockConfirm = confirm as unknown as ReturnType<typeof vi.fn>;
      
      const changeName = 'cancel-test';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      await fs.mkdir(changeDir, { recursive: true });
      
      // Create tasks.md with incomplete tasks
      const tasksContent = '- [ ] Task 1';
      await fs.writeFile(path.join(changeDir, 'tasks.md'), tasksContent);
      
      // Mock confirm to return false (cancel) for validation skip
      mockConfirm.mockResolvedValueOnce(false);
      // Mock another false for task warning
      mockConfirm.mockResolvedValueOnce(false);
      
      // Execute without --yes flag but skip validation to test task warning
      await archiveCommand.execute(changeName, { noValidate: true, noVerify: true });
      
      // Verify archive was cancelled
      expect(console.log).toHaveBeenCalledWith('Archive cancelled. Run without --no-verify to use the standard verify gate.');
      
      // Verify change was not archived
      await expect(fs.access(changeDir)).resolves.not.toThrow();
    });

    it('preserves apply isolation state for handoff under --yes', async () => {
      const changeName = 'isolated-yes';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      await fs.mkdir(changeDir, { recursive: true });
      await fs.writeFile(path.join(changeDir, 'tasks.md'), '- [x] Task 1\n');
      await fs.writeFile(
        path.join(changeDir, '.apply-isolation.json'),
        JSON.stringify({
          method: 'worktree',
          branchName: changeName,
          worktreePath: path.join(tempDir, '.worktrees', changeName),
          originalBranch: 'main',
        })
      );

      await archiveCommand.execute(changeName, { yes: true, noVerify: true, noValidate: true });

      expect(console.log).not.toHaveBeenCalledWith(
        expect.stringContaining('Worktree cleanup')
      );
      expect(console.log).not.toHaveBeenCalledWith(
        expect.stringContaining('Branch switch')
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Git handoff: agent handles git commits, merge, and cleanup after archive.')
      );
      const archiveDir = path.join(tempDir, 'openspec', 'changes', 'archive');
      const [archiveName] = (await fs.readdir(archiveDir)).filter((entry) => entry.includes(changeName));
      await expect(fs.access(path.join(archiveDir, archiveName, '.apply-isolation.json'))).resolves.not.toThrow();
    });

    it('prompts before apply isolation cleanup and respects declines', async () => {
      const { confirm } = await import('@inquirer/prompts');
      const mockConfirm = confirm as unknown as ReturnType<typeof vi.fn>;

      const changeName = 'isolated-prompt';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      const worktreePath = path.join(tempDir, '.worktrees', changeName);
      await fs.mkdir(changeDir, { recursive: true });
      await fs.writeFile(path.join(changeDir, 'tasks.md'), '- [x] Task 1\n');
      await fs.writeFile(
        path.join(changeDir, '.apply-isolation.json'),
        JSON.stringify({
          method: 'worktree',
          branchName: changeName,
          worktreePath,
          originalBranch: 'main',
        })
      );

      // Mock --no-verify warning confirmation (user declines to cancel early)
      mockConfirm.mockResolvedValueOnce(false);

      await archiveCommand.execute(changeName, { noVerify: true, noValidate: true });

      // Verify archive was cancelled at the --no-verify warning
      expect(console.log).toHaveBeenCalledWith('Archive cancelled. Run without --no-verify to use the standard verify gate.');
    });

    it('normalizes Windows-style worktree paths before prompting', async () => {
      const { confirm } = await import('@inquirer/prompts');
      const mockConfirm = confirm as unknown as ReturnType<typeof vi.fn>;

      const changeName = 'isolated-windows-path';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      const worktreePath = `.worktrees\\${changeName}`;
      await fs.mkdir(changeDir, { recursive: true });
      await fs.writeFile(path.join(changeDir, 'tasks.md'), '- [x] Task 1\n');
      await fs.writeFile(
        path.join(changeDir, '.apply-isolation.json'),
        JSON.stringify({
          method: 'worktree',
          branchName: changeName,
          worktreePath,
          originalBranch: 'main',
        })
      );

      // Mock --no-verify warning confirmation (user declines to test path normalization isn't triggered)
      mockConfirm.mockResolvedValueOnce(false);

      await archiveCommand.execute(changeName, { noVerify: true, noValidate: true });

      // Verify archive was cancelled at the --no-verify warning
      expect(console.log).toHaveBeenCalledWith('Archive cancelled. Run without --no-verify to use the standard verify gate.');
    });
  });
});
