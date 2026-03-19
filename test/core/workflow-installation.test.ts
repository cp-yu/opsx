import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { randomUUID } from 'crypto';
import {
  createWorkflowArtifactPlan,
  resolveEffectiveWorkflows,
} from '../../src/core/workflow-installation.js';

describe('workflow installation planning', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = path.join(os.tmpdir(), `openspec-workflow-installation-${randomUUID()}`);
    await fs.mkdir(path.join(testDir, 'openspec'), { recursive: true });
  });

  afterEach(async () => {
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
});
