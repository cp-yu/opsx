import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { randomUUID } from 'crypto';
import {
  createToolWorkflowArtifactPlan,
  createWorkflowArtifactPlan,
  getManagedCommandFiles,
  resolveEffectiveWorkflows,
} from '../../src/core/workflow-installation.js';

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
    expect(plan.expectedSkillDirNames).toEqual(['openspec-propose', 'openspec-explore']);
    expect(plan.expectedCommandSlugs).toEqual([]);
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
