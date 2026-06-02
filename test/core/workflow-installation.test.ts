import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { randomUUID } from 'crypto';
import {
  createToolWorkflowArtifactPlan,
  createWorkflowArtifactPlan,
  getManagedCommandFiles,
  MANAGED_STALE_INTERNAL_SKILL_DIR_NAMES,
  resolveEffectiveWorkflows,
} from '../../src/core/workflow-installation.js';
import { ArtifactSyncEngine } from '../../src/core/templates/sync-engine.js';

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

    const plan = createWorkflowArtifactPlan(['propose', 'explore', 'apply', 'archive'], 'both', testDir);
    expect(plan.workflows).toContain('bootstrap-opsx');
    expect(plan.expectedSkillDirNames).toContain('openspec-bootstrap-opsx');
    expect(plan.expectedCommandSlugs).toContain('bootstrap');
  });

  it('treats codex as skills-only even when delivery is commands', () => {
    const plan = createToolWorkflowArtifactPlan('codex', ['propose', 'explore'], 'commands', testDir);

    expect(plan.shouldGenerateSkills).toBe(true);
    expect(plan.shouldGenerateCommands).toBe(false);
    expect(plan.expectedSkillDirNames).toEqual([
      'openspec-propose',
      'openspec-explore',
      'openspec-reviewer',
      'openspec-optimizer',
      'openspec-impact-sweeper',
    ]);
    expect(plan.expectedCommandSlugs).toEqual([]);
  });

  it('tracks stale internal skill directories by explicit name', () => {
    expect(MANAGED_STALE_INTERNAL_SKILL_DIR_NAMES).toEqual(['openspec-implementer']);

    const plan = createToolWorkflowArtifactPlan('claude', ['propose', 'explore'], 'both', testDir);
    expect(plan.managedSkillDirNames).toContain('openspec-implementer');
    expect(plan.expectedSkillDirNames).not.toContain('openspec-implementer');
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
      delivery: 'both',
      version: 'test',
    });

    expect(result.error).toBeUndefined();
    expect(result.skillsRemoved).toBe(1);
    await expect(fs.stat(path.join(skillsDir, 'openspec-implementer'))).rejects.toThrow();
    await expect(fs.stat(path.join(skillsDir, 'user-skill', 'SKILL.md'))).resolves.toBeDefined();
    await expect(fs.stat(path.join(skillsDir, 'openspec-reviewer', 'SKILL.md'))).resolves.toBeDefined();
  });

  it('resolves legacy codex command files via explicit paths', () => {
    process.env.CODEX_HOME = path.join(testDir, 'custom-codex-home');

    const commandFiles = getManagedCommandFiles(
      testDir,
      'codex',
      ['explore', 'apply'],
      { includeLegacyFiles: true }
    );

    expect(commandFiles).toEqual([
      path.join(path.resolve(process.env.CODEX_HOME), 'prompts', 'opsx-explore.md'),
      path.join(path.resolve(process.env.CODEX_HOME), 'prompts', 'opsx-apply.md'),
    ]);
  });
});
