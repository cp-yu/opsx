import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { runCLI } from '../helpers/run-cli.js';
import { computeEvidenceFingerprint, computeTasksFileHash } from '../../src/core/verify/freshness.js';
import type { VerifyOptimization, VerifyResultStatus } from '../../src/core/verify/types.js';

describe('artifact-workflow CLI commands', () => {
  let tempDir: string;
  let changesDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-artifact-workflow-'));
    changesDir = path.join(tempDir, 'openspec', 'changes');
    await fs.mkdir(changesDir, { recursive: true });
  });

  afterEach(async () => {
    if (tempDir) {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });

  /**
   * Gets combined output from CLI result (ora outputs to stdout).
   */
  function getOutput(result: { stdout: string; stderr: string }): string {
    return result.stdout + result.stderr;
  }

  /**
   * Normalizes path separators to forward slashes for cross-platform assertions.
   */
  function normalizePaths(str: string): string {
    return str.replace(/\\/g, '/');
  }

  /**
   * Creates a test change with the specified artifacts completed.
   * Note: An "active" change requires at least a proposal.md file to be detected.
   * If no artifacts are specified, we create an empty proposal to make it detectable.
   */
  async function createTestChange(
    changeName: string,
    artifacts: ('proposal' | 'design' | 'specs' | 'opsx-delta' | 'tasks')[] = []
  ): Promise<string> {
    const changeDir = path.join(changesDir, changeName);
    await fs.mkdir(changeDir, { recursive: true });

    // Always create proposal.md for the change to be detected as active
    // Content varies based on whether 'proposal' is in artifacts list
    const proposalContent = artifacts.includes('proposal')
      ? '## Why\nTest proposal content that is long enough.\n\n## What Changes\n- **test:** Something'
      : '## Why\nMinimal proposal.\n\n## What Changes\n- **test:** Placeholder';
    await fs.writeFile(path.join(changeDir, 'proposal.md'), proposalContent);

    if (artifacts.includes('design')) {
      await fs.writeFile(path.join(changeDir, 'design.md'), '# Design\n\nTechnical design.');
    }

    if (artifacts.includes('specs')) {
      // specs artifact uses glob pattern "specs/*.md" - files directly in specs/ directory
      const specsDir = path.join(changeDir, 'specs');
      await fs.mkdir(specsDir, { recursive: true });
      await fs.writeFile(path.join(specsDir, 'test-spec.md'), '## Purpose\nTest spec.');
    }

    if (artifacts.includes('tasks')) {
      await fs.writeFile(path.join(changeDir, 'tasks.md'), '## Tasks\n- [ ] Task 1');
    }

    if (artifacts.includes('opsx-delta')) {
      await fs.writeFile(
        path.join(changeDir, 'opsx-delta.yaml'),
        'schema_version: 1\nADDED:\n  capabilities: []\n'
      );
    }

    return changeDir;
  }

  async function collectChangeFiles(changeDir: string): Promise<string[]> {
    const collected: string[] = [];

    async function walk(dir: string): Promise<void> {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          await walk(fullPath);
          continue;
        }
        if (entry.name !== '.verify-result.json') {
          collected.push(fullPath);
        }
      }
    }

    await walk(changeDir);
    return collected.sort();
  }

  async function writeVerifyResult(
    changeDir: string,
    options: {
      result?: VerifyResultStatus;
      optimization?: VerifyOptimization;
    } = {}
  ): Promise<void> {
    const evidenceFiles = (await collectChangeFiles(changeDir)).map((filePath) =>
      normalizePaths(path.relative(tempDir, filePath))
    );
    const fingerprint = await computeEvidenceFingerprint(evidenceFiles, tempDir);
    const tasksFileHash = await computeTasksFileHash(path.join(changeDir, 'tasks.md'));

    await fs.writeFile(
      path.join(changeDir, '.verify-result.json'),
      JSON.stringify(
        {
          timestamp: '2026-05-19T00:00:00.000Z',
          result: options.result ?? 'PASS',
          issues: [],
          tasksFileHash: tasksFileHash ?? '',
          verificationContext: {
            contractVersion: '1.0',
            evidenceFiles,
            evidenceFingerprint: fingerprint.hash,
          },
          optimization: options.optimization,
        },
        null,
        2
      )
    );
  }

  describe('status command', () => {
    it('shows status for scaffolded change without proposal.md', async () => {
      // Create empty change directory (no proposal.md)
      const changeDir = path.join(changesDir, 'scaffolded-change');
      await fs.mkdir(changeDir, { recursive: true });

      const result = await runCLI(['status', '--change', 'scaffolded-change'], { cwd: tempDir });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('scaffolded-change');
      expect(result.stdout).toContain('0/5 artifacts complete');
    });

    it('shows status for a change with proposal only', async () => {
      // createTestChange always creates proposal.md, so this has 1 artifact complete
      await createTestChange('minimal-change');

      const result = await runCLI(['status', '--change', 'minimal-change'], { cwd: tempDir });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('minimal-change');
      expect(result.stdout).toContain('spec-driven');
      expect(result.stdout).toContain('1/5 artifacts complete');
    });

    it('shows status for a change with proposal and design', async () => {
      await createTestChange('partial-change', ['proposal', 'design']);

      const result = await runCLI(['status', '--change', 'partial-change'], { cwd: tempDir });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('2/5 artifacts complete');
      expect(result.stdout).toContain('[x]');
    });

    it('outputs JSON when --json flag is used', async () => {
      await createTestChange('json-change', ['proposal', 'design']);

      const result = await runCLI(['status', '--change', 'json-change', '--json'], {
        cwd: tempDir,
      });
      expect(result.exitCode).toBe(0);
      expect(result.stderr).toBe('');

      const json = JSON.parse(result.stdout);
      expect(json.changeName).toBe('json-change');
      expect(json.schemaName).toBe('spec-driven');
      expect(json.isComplete).toBe(false);
      expect(Array.isArray(json.artifacts)).toBe(true);
      expect(json.artifacts).toHaveLength(5);

      const proposalArtifact = json.artifacts.find((a: any) => a.id === 'proposal');
      expect(proposalArtifact.status).toBe('done');
    });

    it('shows complete status when all artifacts are done', async () => {
      await createTestChange('complete-change', ['proposal', 'design', 'specs', 'opsx-delta', 'tasks']);

      const result = await runCLI(['status', '--change', 'complete-change'], { cwd: tempDir });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('5/5 artifacts complete');
      expect(result.stdout).toContain('All artifacts complete!');
    });

    it('exits gracefully when no changes exist', async () => {
      const result = await runCLI(['status'], { cwd: tempDir });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('No active changes');
      expect(result.stdout).toContain('openspec new change');
    });

    it('exits gracefully with JSON when no changes exist', async () => {
      const result = await runCLI(['status', '--json'], { cwd: tempDir });
      expect(result.exitCode).toBe(0);

      const json = JSON.parse(result.stdout);
      expect(json.changes).toEqual([]);
      expect(json.message).toBe('No active changes.');
    });

    it('errors when --change is missing and lists available changes', async () => {
      await createTestChange('some-change');

      const result = await runCLI(['status'], { cwd: tempDir });
      expect(result.exitCode).toBe(1);
      const output = getOutput(result);
      expect(output).toContain('Missing required option --change');
      expect(output).toContain('some-change');
    });

    it('errors for unknown change name and lists available changes', async () => {
      await createTestChange('existing-change');

      const result = await runCLI(['status', '--change', 'nonexistent'], { cwd: tempDir });
      expect(result.exitCode).toBe(1);
      const output = getOutput(result);
      expect(output).toContain("Change 'nonexistent' not found");
      expect(output).toContain('existing-change');
    });

    it('supports --schema option', async () => {
      await createTestChange('schema-change');

      const result = await runCLI(['status', '--change', 'schema-change', '--schema', 'spec-driven'], {
        cwd: tempDir,
      });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('spec-driven');
    });

    it('errors for unknown schema', async () => {
      await createTestChange('test-change');

      const result = await runCLI(['status', '--change', 'test-change', '--schema', 'unknown'], {
        cwd: tempDir,
      });
      expect(result.exitCode).toBe(1);
      const output = getOutput(result);
      expect(output).toContain("Schema 'unknown' not found");
    });

    it('rejects path traversal in change name', async () => {
      const result = await runCLI(['status', '--change', '../foo'], { cwd: tempDir });
      expect(result.exitCode).toBe(1);
      const output = getOutput(result);
      expect(output).toContain('Invalid change name');
    });

    it('rejects absolute path in change name', async () => {
      const result = await runCLI(['status', '--change', '/etc/passwd'], { cwd: tempDir });
      expect(result.exitCode).toBe(1);
      const output = getOutput(result);
      expect(output).toContain('Invalid change name');
    });

    it('rejects slashes in change name', async () => {
      const result = await runCLI(['status', '--change', 'foo/bar'], { cwd: tempDir });
      expect(result.exitCode).toBe(1);
      const output = getOutput(result);
      expect(output).toContain('Invalid change name');
    });
  });

  describe('instructions command', () => {
    it('shows instructions for proposal on scaffolded change', async () => {
      // Create empty change directory (no proposal.md)
      const changeDir = path.join(changesDir, 'scaffolded-change');
      await fs.mkdir(changeDir, { recursive: true });

      const result = await runCLI(['instructions', 'proposal', '--change', 'scaffolded-change'], {
        cwd: tempDir,
      });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('<artifact id="proposal"');
      expect(result.stdout).toContain('proposal.md');
      expect(result.stdout).toContain('<template>');
    });

    it('shows instructions for design artifact', async () => {
      await createTestChange('instr-change');

      const result = await runCLI(['instructions', 'design', '--change', 'instr-change'], {
        cwd: tempDir,
      });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('<artifact id="design"');
      expect(result.stdout).toContain('design.md');
      expect(result.stdout).toContain('<template>');
    });

    it('shows blocked warning for artifact with unmet dependencies', async () => {
      // tasks depends on design and specs, which are not done yet
      await createTestChange('blocked-change');

      const result = await runCLI(['instructions', 'tasks', '--change', 'blocked-change'], {
        cwd: tempDir,
      });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('<warning>');
      expect(result.stdout).toContain('status="missing"');
    });

    it('outputs JSON for instructions', async () => {
      await createTestChange('json-instr', ['proposal']);

      const result = await runCLI(['instructions', 'design', '--change', 'json-instr', '--json'], {
        cwd: tempDir,
      });
      expect(result.exitCode).toBe(0);
      expect(result.stderr).toBe('');

      const json = JSON.parse(result.stdout);
      expect(json.artifactId).toBe('design');
      expect(json.outputPath).toContain('design.md');
      expect(typeof json.template).toBe('string');
      expect(Array.isArray(json.dependencies)).toBe(true);
    });

    it('outputs the coarse task template for tasks instructions', async () => {
      await createTestChange('tasks-instr', ['proposal', 'design', 'specs']);

      const result = await runCLI(['instructions', 'tasks', '--change', 'tasks-instr', '--json'], {
        cwd: tempDir,
      });
      expect(result.exitCode).toBe(0);

      const json = JSON.parse(result.stdout);
      expect(json.artifactId).toBe('tasks');
      expect(json.template).toContain('### Task 1:');
      expect(json.template).toContain('**Goal**:');
      expect(json.template).toContain('**Files**:');
      expect(json.template).toContain('**Requirements**:');
      expect(json.template).toContain('#### Checks');
      expect(json.instruction).toContain('decompose into detailed TDD cycles');
      expect(json.instruction).toContain('Design Summary');
    });

    it('errors when artifact argument is missing', async () => {
      await createTestChange('test-change');

      const result = await runCLI(['instructions', '--change', 'test-change'], { cwd: tempDir });
      expect(result.exitCode).toBe(1);
      const output = getOutput(result);
      expect(output).toContain('Missing required argument <artifact>');
      expect(output).toContain('Valid artifacts');
    });

    it('errors for unknown artifact', async () => {
      await createTestChange('test-change');

      const result = await runCLI(['instructions', 'unknown-artifact', '--change', 'test-change'], {
        cwd: tempDir,
      });
      expect(result.exitCode).toBe(1);
      const output = getOutput(result);
      expect(output).toContain("Artifact 'unknown-artifact' not found");
      expect(output).toContain('Valid artifacts');
    });
  });

  describe('templates command', () => {
    it('shows template paths for default schema', async () => {
      const result = await runCLI(['templates'], { cwd: tempDir });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Schema: spec-driven');
      expect(result.stdout).toContain('proposal:');
      expect(result.stdout).toContain('design:');
      expect(result.stdout).toContain('specs:');
      expect(result.stdout).toContain('tasks:');
    });

    it('shows template paths for specified schema', async () => {
      const result = await runCLI(['templates', '--schema', 'spec-driven'], { cwd: tempDir });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Schema: spec-driven');
      expect(result.stdout).toContain('proposal:');
      expect(result.stdout).toContain('design:');
    });

    it('outputs JSON mapping of templates', async () => {
      const result = await runCLI(['templates', '--json'], { cwd: tempDir });
      expect(result.exitCode).toBe(0);
      expect(result.stderr).toBe('');

      const json = JSON.parse(result.stdout);
      expect(json.proposal).toBeDefined();
      expect(json.proposal.path).toContain('proposal.md');
      expect(json.proposal.source).toBe('package');
    });

    it('errors for unknown schema', async () => {
      const result = await runCLI(['templates', '--schema', 'nonexistent'], { cwd: tempDir });
      expect(result.exitCode).toBe(1);
      const output = getOutput(result);
      expect(output).toContain("Schema 'nonexistent' not found");
    });
  });

  describe('new change command', () => {
    it('creates a new change directory', async () => {
      const result = await runCLI(['new', 'change', 'my-new-feature'], { cwd: tempDir });
      expect(result.exitCode).toBe(0);
      const output = getOutput(result);
      expect(output).toContain("Created change 'my-new-feature'");

      const changeDir = path.join(changesDir, 'my-new-feature');
      const stat = await fs.stat(changeDir);
      expect(stat.isDirectory()).toBe(true);
    });

    it('creates README.md when --description is provided', async () => {
      const result = await runCLI(
        ['new', 'change', 'described-feature', '--description', 'This is a test feature'],
        { cwd: tempDir }
      );
      expect(result.exitCode).toBe(0);

      const readmePath = path.join(changesDir, 'described-feature', 'README.md');
      const content = await fs.readFile(readmePath, 'utf-8');
      expect(content).toContain('described-feature');
      expect(content).toContain('This is a test feature');
    });

    it('errors for invalid change name with spaces', async () => {
      const result = await runCLI(['new', 'change', 'invalid name'], { cwd: tempDir });
      expect(result.exitCode).toBe(1);
      const output = getOutput(result);
      expect(output).toContain('Error');
    });

    it('errors for duplicate change name', async () => {
      await createTestChange('existing-change');

      const result = await runCLI(['new', 'change', 'existing-change'], { cwd: tempDir });
      expect(result.exitCode).toBe(1);
      const output = getOutput(result);
      expect(output).toContain('exists');
    });

    it('errors when name argument is missing', async () => {
      const result = await runCLI(['new', 'change'], { cwd: tempDir });
      expect(result.exitCode).toBe(1);
    });
  });

  describe('instructions apply command', () => {
    it('shows apply instructions for spec-driven schema with tasks', async () => {
      await createTestChange('apply-change', ['proposal', 'design', 'specs', 'tasks']);

      const result = await runCLI(['instructions', 'apply', '--change', 'apply-change'], {
        cwd: tempDir,
      });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('## Apply: apply-change');
      expect(result.stdout).toContain('Schema: spec-driven');
      expect(result.stdout).toContain('### Context Files');
      expect(result.stdout).toContain('### Instruction');
    });

    it('shows blocked state when required artifacts are missing', async () => {
      // Only create proposal - missing tasks (required by spec-driven apply block)
      await createTestChange('blocked-apply', ['proposal']);

      const result = await runCLI(['instructions', 'apply', '--change', 'blocked-apply'], {
        cwd: tempDir,
      });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Blocked');
      expect(result.stdout).toContain('Missing artifacts: tasks');
    });

    it('outputs JSON for apply instructions', async () => {
      await createTestChange('json-apply', ['proposal', 'design', 'specs', 'tasks']);

      const result = await runCLI(
        ['instructions', 'apply', '--change', 'json-apply', '--json'],
        { cwd: tempDir }
      );
      expect(result.exitCode).toBe(0);
      expect(result.stderr).toBe('');

      const json = JSON.parse(result.stdout);
      const expectedProposalPath = await fs.realpath(path.join(changesDir, 'json-apply', 'proposal.md'));
      const expectedSpecPath = await fs.realpath(
        path.join(changesDir, 'json-apply', 'specs', 'test-spec.md')
      );
      expect(json.changeName).toBe('json-apply');
      expect(json.schemaName).toBe('spec-driven');
      expect(json.state).toBe('ready');
      expect(json.contextFiles).toBeDefined();
      expect(typeof json.contextFiles).toBe('object');
      expect(json.contextFiles.proposal).toEqual([expectedProposalPath]);
      expect(json.contextFiles.specs).toEqual([expectedSpecPath]);
    });

    it('parses coarse tasks as apply progress and task items', async () => {
      const changeDir = await createTestChange('coarse-apply', [
        'proposal',
        'design',
        'specs',
        'tasks',
      ]);
      await fs.writeFile(
        path.join(changeDir, 'tasks.md'),
        `### Task 1: Explore routing

**Goal**: Add the explore-to-propose routing instruction.

**Files**:
- Modify: \`src/core/templates/workflows/propose.ts\`
- Test: \`test/core/templates/propose-template.test.ts\`

**Requirements**:
- Reuse a confirmed Design Summary when present

#### Checks

- [x] C1 Verify Design Summary reuse
  - Verifies: \`specs/propose-smart-routing/spec.md\` / Requirement "Propose 必须检测 explore 上下文" / Scenario "同会话 explore"
  - Command: \`npm run test -- test/core/templates/propose-template.test.ts\`
  - Expect: template mentions Design Summary reuse

### Task 2: Apply decomposition

**Goal**: Parse coarse tasks during apply.

**Files**:
- Modify: \`src/commands/workflow/instructions.ts\`
- Test: \`test/commands/artifact-workflow.test.ts\`

**Requirements**:
- Keep unfinished tasks visible to apply

#### Checks

- [ ] C2 Verify pending coarse task
  - Verifies: \`specs/apply-task-decomposition/spec.md\` / Requirement "Master agent 必须拆解粗粒度任务为 TDD 步骤" / Scenario "读取粗粒度任务"
  - Command: \`npm run test -- test/commands/artifact-workflow.test.ts\`
  - Expect: apply progress reports one remaining task
`
      );

      const result = await runCLI(
        ['instructions', 'apply', '--change', 'coarse-apply', '--json'],
        { cwd: tempDir }
      );
      expect(result.exitCode).toBe(0);

      const json = JSON.parse(result.stdout);
      expect(json.progress).toEqual({ total: 2, complete: 1, remaining: 1 });
      expect(json.tasks).toEqual([
        { id: '1', description: 'Explore routing', done: true },
        { id: '2', description: 'Apply decomposition', done: false },
      ]);
      expect(json.instruction).toContain('directly implement each pending task');
      expect(json.instruction).toContain('mark nested checks complete as evidence passes');
    });

    it('keeps the explore-to-propose-to-apply instruction path coherent', async () => {
      const changeDir = await createTestChange('workflow-integration', [
        'proposal',
        'design',
        'specs',
        'tasks',
      ]);
      await fs.writeFile(
        path.join(changeDir, 'tasks.md'),
        `### Task 1: Implement confirmed design

**Goal**: Apply the design confirmed during explore.

**Files**:
- Modify: \`src/core/templates/workflows/apply-change.ts\`
- Test: \`test/core/templates/apply-change.test.ts\`

**Requirements**:
- Implement pending tasks directly
- Mark checks complete after evidence passes

#### Checks

- [ ] C1 Verify direct apply
  - Verifies: \`specs/apply-task-decomposition/spec.md\` / Requirement "Master agent 直接执行 pending task" / Scenario "拆解为可执行工作"
  - Command: \`npm run test -- test/core/templates/apply-change.test.ts\`
  - Expect: apply instructions include direct task implementation
`
      );

      const exploreResult = await runCLI(['instructions', 'proposal', '--change', 'workflow-integration', '--json'], {
        cwd: tempDir,
      });
      const tasksResult = await runCLI(['instructions', 'tasks', '--change', 'workflow-integration', '--json'], {
        cwd: tempDir,
      });
      const applyResult = await runCLI(['instructions', 'apply', '--change', 'workflow-integration', '--json'], {
        cwd: tempDir,
      });

      expect(exploreResult.exitCode).toBe(0);
      expect(tasksResult.exitCode).toBe(0);
      expect(applyResult.exitCode).toBe(0);

      const tasksJson = JSON.parse(tasksResult.stdout);
      const applyJson = JSON.parse(applyResult.stdout);
      expect(tasksJson.instruction).toContain('Design Summary');
      expect(tasksJson.template).toContain('### Task 1:');
      expect(applyJson.progress).toEqual({ total: 1, complete: 0, remaining: 1 });
      expect(applyJson.tasks[0].description).toBe('Implement confirmed design');
      expect(applyJson.instruction).toContain('directly implement each pending task');
    });

    it('resolves single-star glob artifacts consistently between status and apply', async () => {
      const schemaDir = path.join(tempDir, 'openspec', 'schemas', 'glob-test');
      const templatesDir = path.join(schemaDir, 'templates');
      await fs.mkdir(templatesDir, { recursive: true });

      await fs.writeFile(
        path.join(schemaDir, 'schema.yaml'),
        `name: glob-test
version: 1
description: Test schema for single-star globs
artifacts:
  - id: specs
    generates: specs/*/spec.md
    description: Nested specs
    template: spec.md
    requires: []
apply:
  requires: [specs]
  instruction: Ready when specs exist.
`
      );
      await fs.writeFile(path.join(templatesDir, 'spec.md'), '# Spec\n');

      const changeDir = path.join(changesDir, 'single-star-glob');
      const specPath = path.join(changeDir, 'specs', 'single-star-glob', 'spec.md');
      await fs.mkdir(path.dirname(specPath), { recursive: true });
      await fs.writeFile(path.join(changeDir, '.openspec.yaml'), 'schema: glob-test\n');
      await fs.writeFile(specPath, '# Nested spec\n');

      const statusResult = await runCLI(['status', '--change', 'single-star-glob', '--json'], {
        cwd: tempDir,
      });
      expect(statusResult.exitCode).toBe(0);
      const statusJson = JSON.parse(statusResult.stdout);
      expect(statusJson.artifacts).toEqual([
        {
          id: 'specs',
          outputPath: 'specs/*/spec.md',
          status: 'done',
        },
      ]);

      const applyResult = await runCLI(
        ['instructions', 'apply', '--change', 'single-star-glob', '--json'],
        { cwd: tempDir }
      );
      expect(applyResult.exitCode).toBe(0);
      const applyJson = JSON.parse(applyResult.stdout);
      const resolvedSpecPath = await fs.realpath(specPath);
      expect(applyJson.state).toBe('ready');
      expect(applyJson.missingArtifacts).toBeUndefined();
      expect(applyJson.contextFiles).toEqual({
        specs: [resolvedSpecPath],
      });
    });

    it('shows schema instruction from apply block', async () => {
      await createTestChange('instr-apply', ['proposal', 'design', 'specs', 'tasks']);

      const result = await runCLI(['instructions', 'apply', '--change', 'instr-apply'], {
        cwd: tempDir,
      });
      expect(result.exitCode).toBe(0);
      // Should show the instruction from spec-driven schema apply block
      expect(result.stdout).toContain('directly implement each pending task');
    });

    it('shows needs_verify state when all tasks are complete but verify is missing', async () => {
      const changeDir = await createTestChange('done-apply', [
        'proposal',
        'design',
        'specs',
        'tasks',
      ]);
      // Overwrite tasks with all completed
      await fs.writeFile(
        path.join(changeDir, 'tasks.md'),
        '## Tasks\n- [x] Task 1\n- [x] Task 2'
      );

      const result = await runCLI(['instructions', 'apply', '--change', 'done-apply'], {
        cwd: tempDir,
      });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Verification Required');
      expect(result.stdout).toContain('Phase 1 verification');
    });

    it('outputs needs_verify state in JSON when all tasks are complete but verify is missing', async () => {
      const changeDir = await createTestChange('done-apply-json', [
        'proposal',
        'design',
        'specs',
        'tasks',
      ]);
      await fs.writeFile(path.join(changeDir, 'tasks.md'), '## Tasks\n- [x] Task 1\n- [x] Task 2');

      const result = await runCLI(
        ['instructions', 'apply', '--change', 'done-apply-json', '--json'],
        { cwd: tempDir }
      );
      expect(result.exitCode).toBe(0);

      const json = JSON.parse(result.stdout);
      expect(json.state).toBe('needs_verify');
      expect(json.instruction).toContain('Phase 1 verification');
    });

    it('outputs needs_seal state in JSON when phase 2 is still pending', async () => {
      const changeDir = await createTestChange('needs-seal-apply', [
        'proposal',
        'design',
        'specs',
        'tasks',
      ]);
      await fs.writeFile(path.join(changeDir, 'tasks.md'), '## Tasks\n- [x] Task 1\n- [x] Task 2');
      await writeVerifyResult(changeDir, {
        optimization: {
          status: 'PENDING_VERIFICATION',
          attempts: [],
        },
      });

      const result = await runCLI(
        ['instructions', 'apply', '--change', 'needs-seal-apply', '--json'],
        { cwd: tempDir }
      );
      expect(result.exitCode).toBe(0);

      const json = JSON.parse(result.stdout);
      expect(json.state).toBe('needs_seal');
      expect(json.instruction).toContain('Phase 2 optimization and Phase 3 seal');
    });

    it('outputs needs_verify state in JSON when optimization aborted unsafe', async () => {
      const changeDir = await createTestChange('aborted-unsafe-apply', [
        'proposal',
        'design',
        'specs',
        'tasks',
      ]);
      await fs.writeFile(path.join(changeDir, 'tasks.md'), '## Tasks\n- [x] Task 1\n- [x] Task 2');
      await writeVerifyResult(changeDir, {
        optimization: {
          status: 'ABORTED_UNSAFE',
          attempts: [],
        },
      });

      const result = await runCLI(
        ['instructions', 'apply', '--change', 'aborted-unsafe-apply', '--json'],
        { cwd: tempDir }
      );
      expect(result.exitCode).toBe(0);

      const json = JSON.parse(result.stdout);
      expect(json.state).toBe('needs_verify');
      expect(json.instruction).toContain('Phase 1 verification');
    });

    it('outputs all_done state in JSON when verify is fresh and archive-compatible', async () => {
      const changeDir = await createTestChange('all-done-apply', [
        'proposal',
        'design',
        'specs',
        'tasks',
      ]);
      await fs.writeFile(path.join(changeDir, 'tasks.md'), '## Tasks\n- [x] Task 1\n- [x] Task 2');
      await writeVerifyResult(changeDir, {
        optimization: {
          status: 'NOT_NEEDED',
          attempts: [],
        },
      });

      const result = await runCLI(
        ['instructions', 'apply', '--change', 'all-done-apply', '--json'],
        { cwd: tempDir }
      );
      expect(result.exitCode).toBe(0);

      const json = JSON.parse(result.stdout);
      expect(json.state).toBe('all_done');
      expect(json.instruction).toContain('ready to be archived');
    });

    it('uses spec-driven schema apply configuration', async () => {
      // Create a spec-driven style change with all artifacts
      await createTestChange('apply-schema-test', ['proposal', 'design', 'specs', 'tasks']);

      const result = await runCLI(
        ['instructions', 'apply', '--change', 'apply-schema-test', '--schema', 'spec-driven'],
        { cwd: tempDir }
      );
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Schema: spec-driven');
    });

    it('spec-driven schema uses apply block configuration', async () => {
      // Verify that spec-driven schema uses its apply block (requires: [tasks])
      await createTestChange('apply-config-test', ['proposal', 'design', 'specs', 'tasks']);

      const result = await runCLI(
        ['instructions', 'apply', '--change', 'apply-config-test', '--json'],
        { cwd: tempDir }
      );
      expect(result.exitCode).toBe(0);

      const json = JSON.parse(result.stdout);
      // spec-driven schema has apply block with requires: [tasks], so should be ready
      expect(json.schemaName).toBe('spec-driven');
      expect(json.state).toBe('ready');
    });

    it('fallback: requires all artifacts when schema has no apply block', async () => {
      // Create a minimal schema without an apply block in user schemas dir
      const userDataDir = path.join(tempDir, 'user-data');
      const noApplySchemaDir = path.join(userDataDir, 'openspec', 'schemas', 'no-apply');
      const templatesDir = path.join(noApplySchemaDir, 'templates');
      await fs.mkdir(templatesDir, { recursive: true });

      // Minimal schema with 2 artifacts, no apply block
      const schemaContent = `
name: no-apply
version: 1
description: Test schema without apply block
artifacts:
  - id: first
    generates: first.md
    description: First artifact
    template: first.md
    requires: []
  - id: second
    generates: second.md
    description: Second artifact
    template: second.md
    requires: [first]
`;
      await fs.writeFile(path.join(noApplySchemaDir, 'schema.yaml'), schemaContent);
      await fs.writeFile(path.join(templatesDir, 'first.md'), '# First\n');
      await fs.writeFile(path.join(templatesDir, 'second.md'), '# Second\n');

      // Create a change with only the first artifact (missing second)
      const changeDir = path.join(changesDir, 'no-apply-test');
      await fs.mkdir(changeDir, { recursive: true });
      await fs.writeFile(path.join(changeDir, 'first.md'), '# First artifact content');

      // Run with XDG_DATA_HOME pointing to our temp user data dir
      const result = await runCLI(
        ['instructions', 'apply', '--change', 'no-apply-test', '--schema', 'no-apply', '--json'],
        {
          cwd: tempDir,
          env: { XDG_DATA_HOME: userDataDir },
        }
      );
      expect(result.exitCode).toBe(0);

      const json = JSON.parse(result.stdout);
      // Without apply block, fallback requires ALL artifacts - second is missing
      expect(json.schemaName).toBe('no-apply');
      expect(json.state).toBe('blocked');
      expect(json.missingArtifacts).toContain('second');
    });

    it('fallback: ready when all artifacts exist for schema without apply block', async () => {
      // Create a minimal schema without an apply block
      const userDataDir = path.join(tempDir, 'user-data-2');
      const noApplySchemaDir = path.join(userDataDir, 'openspec', 'schemas', 'no-apply-full');
      const templatesDir = path.join(noApplySchemaDir, 'templates');
      await fs.mkdir(templatesDir, { recursive: true });

      const schemaContent = `
name: no-apply-full
version: 1
description: Test schema without apply block
artifacts:
  - id: only
    generates: only.md
    description: Only artifact
    template: only.md
    requires: []
`;
      await fs.writeFile(path.join(noApplySchemaDir, 'schema.yaml'), schemaContent);
      await fs.writeFile(path.join(templatesDir, 'only.md'), '# Only\n');

      // Create a change with the artifact present
      const changeDir = path.join(changesDir, 'no-apply-full-test');
      await fs.mkdir(changeDir, { recursive: true });
      await fs.writeFile(path.join(changeDir, 'only.md'), '# Content');

      const result = await runCLI(
        ['instructions', 'apply', '--change', 'no-apply-full-test', '--schema', 'no-apply-full', '--json'],
        {
          cwd: tempDir,
          env: { XDG_DATA_HOME: userDataDir },
        }
      );
      expect(result.exitCode).toBe(0);

      const json = JSON.parse(result.stdout);
      // All artifacts exist, should be ready with default instruction
      expect(json.schemaName).toBe('no-apply-full');
      expect(json.state).toBe('ready');
      expect(json.instruction).toContain('All required artifacts complete');
    });
  });

  describe('help text', () => {
    it('status command help shows description', async () => {
      const result = await runCLI(['status', '--help']);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Display artifact completion status');
    });

    it('instructions command help shows description', async () => {
      const result = await runCLI(['instructions', '--help']);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Output enriched instructions');
    });

    it('templates command help shows description', async () => {
      const result = await runCLI(['templates', '--help']);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Show resolved template paths');
    });

    it('new command help shows description', async () => {
      const result = await runCLI(['new', '--help']);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Create new items');
    });
  });

  describe('experimental command (deprecated alias for init)', () => {
    it('shows deprecation notice', async () => {
      const result = await runCLI(['experimental', '--tool', 'claude'], { cwd: tempDir });
      // May succeed or fail depending on setup, but should show deprecation notice
      const output = getOutput(result);
      expect(output).toContain('deprecated');
    });

    it('errors for unknown tool', async () => {
      const result = await runCLI(['experimental', '--tool', 'unknown-tool'], {
        cwd: tempDir,
      });
      expect(result.exitCode).toBe(1);
      const output = getOutput(result);
      expect(output).toContain('Invalid tool(s): unknown-tool');
    });

    it('errors for tool without skillsDir', async () => {
      // Using 'agents' which doesn't have skillsDir configured
      const result = await runCLI(['experimental', '--tool', 'agents'], {
        cwd: tempDir,
      });
      expect(result.exitCode).toBe(1);
      const output = getOutput(result);
      expect(output).toContain('Invalid tool(s): agents');
    });

    it('creates skills for Claude tool', async () => {
      const result = await runCLI(['experimental', '--tool', 'claude'], {
        cwd: tempDir,
      });
      expect(result.exitCode).toBe(0);
      const output = normalizePaths(getOutput(result));
      expect(output).toContain('Claude Code');
      expect(output).toContain('.claude/');

      // Verify skill files were created
      const skillFile = path.join(tempDir, '.claude', 'skills', 'openspec-explore', 'SKILL.md');
      const stat = await fs.stat(skillFile);
      expect(stat.isFile()).toBe(true);
    });

    it('creates skills for Cursor tool', async () => {
      const result = await runCLI(['experimental', '--tool', 'cursor'], {
        cwd: tempDir,
      });
      expect(result.exitCode).toBe(0);
      const output = normalizePaths(getOutput(result));
      expect(output).toContain('Cursor');
      expect(output).toContain('.cursor/');

      // Verify skill files were created
      const skillFile = path.join(tempDir, '.cursor', 'skills', 'openspec-explore', 'SKILL.md');
      const stat = await fs.stat(skillFile);
      expect(stat.isFile()).toBe(true);

      // Verify commands were created with Cursor format
      const commandFile = path.join(tempDir, '.cursor', 'commands', 'opsx-explore.md');
      const content = await fs.readFile(commandFile, 'utf-8');
      expect(content).toContain('name: /opsx-explore');
    });

    it('creates skills for Windsurf tool', async () => {
      const result = await runCLI(['experimental', '--tool', 'windsurf'], {
        cwd: tempDir,
      });
      expect(result.exitCode).toBe(0);
      const output = normalizePaths(getOutput(result));
      expect(output).toContain('Windsurf');
      expect(output).toContain('.windsurf/');

      // Verify skill files were created
      const skillFile = path.join(tempDir, '.windsurf', 'skills', 'openspec-explore', 'SKILL.md');
      const stat = await fs.stat(skillFile);
      expect(stat.isFile()).toBe(true);
    });
  });

  describe('project config integration', () => {
    describe('new change uses config schema', () => {
      it('creates change with schema from project config', async () => {
        // Create project config with spec-driven schema
        // Note: changesDir is already at tempDir/openspec/changes (created in beforeEach)
        await fs.writeFile(
          path.join(tempDir, 'openspec', 'config.yaml'),
          'schema: spec-driven\n'
        );

        // Create a new change without specifying schema
        const result = await runCLI(['new', 'change', 'test-change'], { cwd: tempDir, timeoutMs: 30000 });
        expect(result.exitCode).toBe(0);

        // Verify the change was created with spec-driven schema
        const metadataPath = path.join(changesDir, 'test-change', '.openspec.yaml');
        const metadata = await fs.readFile(metadataPath, 'utf-8');
        expect(metadata).toContain('schema: spec-driven');
      }, 60000);

      it('CLI schema overrides config schema', async () => {
        // Create project config with spec-driven schema
        // Note: openspec directory already exists (from changesDir creation in beforeEach)
        await fs.writeFile(
          path.join(tempDir, 'openspec', 'config.yaml'),
          'schema: spec-driven\n'
        );

        // Create change with explicit schema
        const result = await runCLI(
          ['new', 'change', 'override-test', '--schema', 'spec-driven'],
          { cwd: tempDir, timeoutMs: 30000 }
        );
        expect(result.exitCode).toBe(0);

        // Verify the change uses the CLI-specified schema
        const metadataPath = path.join(changesDir, 'override-test', '.openspec.yaml');
        const metadata = await fs.readFile(metadataPath, 'utf-8');
        expect(metadata).toContain('schema: spec-driven');
      }, 60000);
    });

    describe('instructions command with config', () => {
      it('injects context and rules from config into instructions', async () => {
        // Create project config with context and rules
        // Note: openspec directory already exists (from changesDir creation in beforeEach)
        await fs.writeFile(
          path.join(tempDir, 'openspec', 'config.yaml'),
          `schema: spec-driven
context: |
  Tech stack: TypeScript, React
  API style: RESTful
rules:
  proposal:
    - Include rollback plan
    - Identify affected teams
`
        );

        // Create a test change
        await createTestChange('config-test');

        // Get instructions for proposal
        const result = await runCLI(
          ['instructions', 'proposal', '--change', 'config-test'],
          { cwd: tempDir, timeoutMs: 30000 }
        );
        expect(result.exitCode).toBe(0);

        // Verify context is injected
        expect(result.stdout).toContain('Tech stack: TypeScript, React');
        expect(result.stdout).toContain('API style: RESTful');

        // Verify rules are injected for proposal
        expect(result.stdout).toContain('Include rollback plan');
        expect(result.stdout).toContain('Identify affected teams');
      }, 60000);

      it('does not inject rules for non-matching artifact', async () => {
        // Create project config with rules only for proposal
        // Note: openspec directory already exists (from changesDir creation in beforeEach)
        await fs.writeFile(
          path.join(tempDir, 'openspec', 'config.yaml'),
          `schema: spec-driven
rules:
  proposal:
    - Include rollback plan
`
        );

        // Create a test change
        await createTestChange('non-matching-test');

        // Get instructions for design (not proposal)
        const result = await runCLI(
          ['instructions', 'design', '--change', 'non-matching-test'],
          { cwd: tempDir, timeoutMs: 30000 }
        );
        expect(result.exitCode).toBe(0);

        // Verify rules are NOT injected for design
        expect(result.stdout).not.toContain('Include rollback plan');
      }, 60000);
    });

    describe('backwards compatibility', () => {
      it('existing changes work without config file', async () => {
        // Create change without any config file
        await createTestChange('no-config-change', ['proposal']);

        // Status command should work
        const statusResult = await runCLI(
          ['status', '--change', 'no-config-change'],
          { cwd: tempDir, timeoutMs: 30000 }
        );
        expect(statusResult.exitCode).toBe(0);
        expect(statusResult.stdout).toContain('no-config-change');
        expect(statusResult.stdout).toContain('spec-driven'); // Default schema

        // Instructions command should work
        const instrResult = await runCLI(
          ['instructions', 'design', '--change', 'no-config-change'],
          { cwd: tempDir, timeoutMs: 30000 }
        );
        expect(instrResult.exitCode).toBe(0);
        expect(instrResult.stdout).toContain('<artifact');
      }, 60000);

      it('changes with metadata work without config file', async () => {
        // Create change with explicit schema in metadata
        const changeDir = await createTestChange('metadata-only-change');
        await fs.writeFile(
          path.join(changeDir, '.openspec.yaml'),
          'schema: spec-driven\ncreated: "2025-01-05"\n'
        );

        // Status should use schema from metadata
        const result = await runCLI(
          ['status', '--change', 'metadata-only-change'],
          { cwd: tempDir, timeoutMs: 30000 }
        );
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('spec-driven');
      }, 60000);
    });

    describe('config changes reflected immediately', () => {
      it('config changes are reflected without restart', async () => {
        // Create initial config
        // Note: openspec directory already exists (from changesDir creation in beforeEach)
        await fs.writeFile(
          path.join(tempDir, 'openspec', 'config.yaml'),
          `schema: spec-driven
context: Initial context
`
        );

        // Create a test change
        await createTestChange('immediate-test');

        // Get instructions - should have initial context
        const result1 = await runCLI(
          ['instructions', 'proposal', '--change', 'immediate-test'],
          { cwd: tempDir, timeoutMs: 30000 }
        );
        expect(result1.exitCode).toBe(0);
        expect(result1.stdout).toContain('Initial context');

        // Update config
        await fs.writeFile(
          path.join(tempDir, 'openspec', 'config.yaml'),
          `schema: spec-driven
context: Updated context
`
        );

        // Get instructions again - should have updated context
        const result2 = await runCLI(
          ['instructions', 'proposal', '--change', 'immediate-test'],
          { cwd: tempDir, timeoutMs: 30000 }
        );
        expect(result2.exitCode).toBe(0);
        expect(result2.stdout).toContain('Updated context');
        expect(result2.stdout).not.toContain('Initial context');
      }, 60000);
    });
  });
});
