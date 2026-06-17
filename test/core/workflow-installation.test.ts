import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { randomUUID } from 'crypto';
import {
  createToolWorkflowArtifactPlan,
  createWorkflowArtifactPlan,
  getPlannedToolArtifacts,
  MANAGED_STALE_INTERNAL_SKILL_DIR_NAMES,
  resolveEffectiveWorkflows,
} from '../../src/core/workflow-installation.js';
import {
  ArtifactSyncEngine,
  collectSharedReferenceFiles,
} from '../../src/core/templates/sync-engine.js';

describe('workflow installation planning', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = path.join(os.tmpdir(), `openspec-workflow-installation-${randomUUID()}`);
    await fs.mkdir(path.join(testDir, 'openspec'), { recursive: true });
  });

  afterEach(async () => {
    delete process.env.CODEX_HOME;
    await fs.rm(testDir, { recursive: true, force: true });
  });

  async function exists(filePath: string): Promise<boolean> {
    try {
      await fs.stat(filePath);
      return true;
    } catch {
      return false;
    }
  }

  it('keeps profile workflows unchanged when no bootstrap workspace exists', () => {
    expect(resolveEffectiveWorkflows(testDir, ['propose', 'explore', 'apply', 'archive'])).toEqual([
      'propose',
      'explore',
      'apply',
      'archive',
    ]);
  });

  it('adds bootstrap-opsx to effective workflows when bootstrap workspace exists', async () => {
    await fs.mkdir(path.join(testDir, 'openspec', 'bootstrap'), { recursive: true });

    const effective = resolveEffectiveWorkflows(testDir, ['propose', 'explore', 'apply', 'archive']);
    expect(effective).toEqual([
      'propose',
      'explore',
      'apply',
      'archive',
      'bootstrap-opsx',
    ]);

    const plan = createWorkflowArtifactPlan(['propose', 'explore', 'apply', 'archive'], testDir);
    expect(plan.workflows).toContain('bootstrap-opsx');
    expect(plan.expectedSkillDirNames).toContain('openspec-bootstrap-opsx');
  });

  it('treats codex as skills-only (always skills-only)', () => {
    const plan = createToolWorkflowArtifactPlan('codex', ['propose', 'explore'], testDir);

    expect(plan.shouldGenerateSkills).toBe(true);
    expect(plan.expectedSkillDirNames).toEqual([
      'openspec-propose',
      'openspec-explore',
      'openspec-reviewer',
      'openspec-optimizer',
      'openspec-impact-sweeper',
    ]);
  });

  it('tracks stale internal skill directories by explicit name', () => {
    expect(MANAGED_STALE_INTERNAL_SKILL_DIR_NAMES).toEqual(['openspec-implementer']);

    const plan = createToolWorkflowArtifactPlan('claude', ['propose', 'explore'], testDir);
    expect(plan.managedSkillDirNames).toContain('openspec-implementer');
    expect(plan.expectedSkillDirNames).not.toContain('openspec-implementer');
  });

  it('includes shared reference files in planned artifacts', () => {
    const plan = createToolWorkflowArtifactPlan('claude', ['archive', 'apply'], testDir);
    const artifacts = getPlannedToolArtifacts(testDir, 'claude', plan);

    expect(artifacts.skillFiles).toContain(
      path.join(testDir, '.claude', 'skills', 'openspec-archive-change', 'SKILL.md')
    );
    expect(artifacts.skillFiles).toContain(
      path.join(testDir, '.claude', 'skills', 'openspec-apply-change', 'SKILL.md')
    );
    expect(artifacts.skillFiles).toContain(
      path.join(testDir, 'openspec', 'references', 'openspec-archive-commit-message.md')
    );
    expect(artifacts.skillFiles).toContain(
      path.join(testDir, 'openspec', 'references', 'openspec-apply-phase2-optimization.md')
    );
    expect(artifacts.skillFiles).toContain(
      path.join(testDir, 'openspec', 'references', 'openspec-output-protocol.md')
    );
    // Skills-only: no command files are planned
    expect(artifacts.commandFiles).toEqual([]);
  });

  it('removes only explicitly managed stale implementer skill directories during sync', async () => {
    const skillsDir = path.join(testDir, '.claude', 'skills');
    await fs.mkdir(path.join(skillsDir, 'openspec-implementer'), { recursive: true });
    await fs.writeFile(path.join(skillsDir, 'openspec-implementer', 'SKILL.md'), 'name: openspec-implementer\n');
    await fs.mkdir(path.join(skillsDir, 'user-skill'), { recursive: true });
    await fs.writeFile(path.join(skillsDir, 'user-skill', 'SKILL.md'), 'name: user-skill\n');

    const result = await ArtifactSyncEngine.syncOne({
      toolId: 'claude',
      projectPath: testDir,
      workflows: ['propose', 'explore'],
      version: 'test',
    });

    expect(result.error).toBeUndefined();
    expect(result.skillsRemoved).toBe(1);
    await expect(fs.stat(path.join(skillsDir, 'openspec-implementer'))).rejects.toThrow();
    await expect(fs.stat(path.join(skillsDir, 'user-skill', 'SKILL.md'))).resolves.toBeDefined();
    await expect(fs.stat(path.join(skillsDir, 'openspec-reviewer', 'SKILL.md'))).resolves.toBeDefined();
  });

  it('writes shared reference files during sync', async () => {
    const result = await ArtifactSyncEngine.syncOne({
      toolId: 'claude',
      projectPath: testDir,
      workflows: ['archive'],
      version: 'test',
    });

    expect(result.error).toBeUndefined();
    const archiveReference = await fs.readFile(
      path.join(testDir, 'openspec', 'references', 'openspec-archive-commit-message.md'),
      'utf-8'
    );
    const mergeReference = await fs.readFile(
      path.join(testDir, 'openspec', 'references', 'openspec-merge-summary-message.md'),
      'utf-8'
    );
    expect(archiveReference).toContain('git.commitMessage.archive');
    expect(mergeReference).toContain('git.commitMessage.merge');
  });

  it('preserves user reference files and overwrites managed reference files', async () => {
    const referencesDir = path.join(testDir, 'openspec', 'references');
    await fs.mkdir(referencesDir, { recursive: true });
    await fs.writeFile(path.join(referencesDir, 'custom-archive-commit-message.md'), 'user template');
    await fs.writeFile(path.join(referencesDir, 'openspec-archive-commit-message.md'), 'modified');

    const result = await ArtifactSyncEngine.syncOne({
      toolId: 'claude',
      projectPath: testDir,
      workflows: ['archive'],
      version: 'test',
    });

    expect(result.error).toBeUndefined();
    await expect(
      fs.readFile(path.join(referencesDir, 'custom-archive-commit-message.md'), 'utf-8')
    ).resolves.toBe('user template');
    await expect(
      fs.readFile(path.join(referencesDir, 'openspec-archive-commit-message.md'), 'utf-8')
    ).resolves.toContain('git.commitMessage.archive');
  });

  it('rejects duplicate shared reference file names', () => {
    expect(() =>
      collectSharedReferenceFiles([
        {
          workflowId: 'one',
          template: {
            name: 'one',
            description: 'one',
            instructions: '',
            referenceFiles: [{ path: 'references/details.md', content: 'one' }],
          },
        },
        {
          workflowId: 'two',
          template: {
            name: 'two',
            description: 'two',
            instructions: '',
            referenceFiles: [{ path: 'references/details.md', content: 'two' }],
          },
        },
      ])
    ).toThrow(/Duplicate skill reference file name: openspec-details\.md/);
  });

  it('rejects tool-specific syntax in shared reference files', () => {
    expect(() =>
      collectSharedReferenceFiles([
        {
          workflowId: 'archive',
          template: {
            name: 'archive',
            description: 'archive',
            instructions: '',
            referenceFiles: [{ path: 'references/details.md', content: 'Run /opsx:archive.' }],
          },
        },
      ])
    ).toThrow(/Tool-specific syntax in skill reference file: references\/details\.md/);
  });

  it('writes one shared reference copy for multiple tools', async () => {
    const summary = await ArtifactSyncEngine.syncAll([
      {
        toolId: 'claude',
        projectPath: testDir,
        workflows: ['archive'],
        version: 'test',
      },
      {
        toolId: 'codex',
        projectPath: testDir,
        workflows: ['archive'],
        version: 'test',
      },
    ]);

    expect(summary.failed).toEqual([]);
    await expect(
      fs.readFile(
        path.join(testDir, 'openspec', 'references', 'openspec-archive-commit-message.md'),
        'utf-8'
      )
    ).resolves.toContain('git.commitMessage.archive');
    expect(
      await exists(
        path.join(
          testDir,
          '.claude',
          'skills',
          'openspec-archive-change',
          'references',
          'archive-commit-message.md'
        )
      )
    ).toBe(false);
    expect(
      await exists(
        path.join(
          testDir,
          '.codex',
          'skills',
          'openspec-archive-change',
          'references',
          'archive-commit-message.md'
        )
      )
    ).toBe(false);
  });

  it('does not write any command files (skills-only surface)', async () => {
    const summary = await ArtifactSyncEngine.syncAll([
      {
        toolId: 'claude',
        projectPath: testDir,
        workflows: ['archive', 'explore'],
        version: 'test',
      },
    ]);

    expect(summary.totalCommandsWritten).toBe(0);
    expect(summary.totalCommandsRemoved).toBe(0);
    // Skills should be written
    expect(summary.totalSkillsWritten).toBeGreaterThan(0);
  });
});
