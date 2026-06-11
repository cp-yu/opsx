import { describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { ArtifactSyncEngine } from '../../src/core/templates/sync-engine.js';
import { getArchiveChangeSkillTemplate } from '../../src/core/templates/workflows/archive-change.js';

function normalizeSteps(content: string): string {
  const start = content.indexOf('7. **Git handoff**');
  const end = content.indexOf('**Output On Success**');
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  return content.slice(start, end).replace(/\s+/g, ' ').trim();
}

async function generateArchiveSkill(toolId: 'codex' | 'claude'): Promise<{ root: string; skill: string }> {
  const root = mkdtempSync(join(tmpdir(), 'openspec-archive-skill-'));
  const result = await ArtifactSyncEngine.syncOne({
    toolId,
    projectPath: root,
    workflows: ['archive'],
    delivery: 'skills',
    version: 'test',
  });
  expect(result.error).toBeUndefined();
  return {
    root,
    skill: readFileSync(join(root, `.${toolId}`, 'skills', 'openspec-archive-change', 'SKILL.md'), 'utf-8'),
  };
}

function readReference(path: string): string {
  const reference = getArchiveChangeSkillTemplate().referenceFiles?.find((file) => file.path === path);
  expect(reference).toBeDefined();
  return reference!.content;
}

describe('openspec archive skill content', () => {
  it('documents CLI archive then agent handoff steps in order', () => {
    const instructions = getArchiveChangeSkillTemplate().instructions;

    expect(instructions).toContain('6. **Run archive CLI**');
    expect(instructions).toContain('7. **Git handoff**');
    expect(instructions).toContain('8. **Agent git flow**');
    expect(instructions.indexOf('6. **Run archive CLI**')).toBeLessThan(instructions.indexOf('7. **Git handoff**'));
    expect(instructions.indexOf('7. **Git handoff**')).toBeLessThan(instructions.indexOf('8. **Agent git flow**'));
    expect(instructions).toContain('CLI only verifies, syncs, moves the change to archive');
    expect(instructions).toContain('handle the implementation boundary before OpenSpec/docs archive artifacts');
    expect(instructions).toContain('uncommitted real project implementation changes');
    expect(instructions).toContain('wip: opt-*');
    expect(instructions).toContain('git commit --allow-empty');
    expect(instructions).not.toContain('First commit real project changes before OpenSpec/docs archive artifacts.');
    expect(instructions).toContain('git commit -F -');
    expect(instructions).toContain('git merge --no-ff');
    expect(instructions).toContain('git branch --merged');
    expect(instructions).not.toContain('9. **User manual git flow**');
    expect(instructions).not.toContain('git.autoCommit: manual');
  });

  it('summarizes agent-owned git follow-up without handoff mode fields', () => {
    const instructions = getArchiveChangeSkillTemplate().instructions;

    expect(instructions).toContain('agent-owned git follow-up status');
    expect(instructions).toContain('Merge Strategy');
    expect(instructions).not.toContain('git handoff mode');
    expect(instructions).not.toContain('next git responsibility');
    expect(instructions).not.toContain('Git Handoff Mode');
    expect(instructions).not.toContain('Next Git Responsibility');
    expect(instructions).not.toContain('Archive Commit SHA');
  });

  it('states archive consumes git policy from project config command output', () => {
    const instructions = getArchiveChangeSkillTemplate().instructions;

    expect(instructions).toContain('openspec config project --json');
    expect(instructions).toContain('normalized project config');
    expect(instructions).toContain('git.commitMessage.archive');
    expect(instructions).toContain('git.commitMessage.merge');
    expect(instructions).toContain('git.merge.strategy');
    expect(instructions).toContain('git.branch.deleteAfterArchive');
    expect(instructions).toContain('agent continues the post-archive git flow');
    expect(instructions).not.toContain('git.autoCommit');
    expect(instructions).not.toContain('git.archive.commitMessage.convention');
    expect(instructions).not.toContain('git.merge.commitMessage.convention');
    expect(instructions).not.toContain('user handles all post-archive git work manually');
    expect(instructions).not.toContain('git.merge.messageFrom');
    expect(instructions).toContain('do not parse raw YAML inside the skill');
  });

  it('routes archive, boundary, and merge message templates through configured paths or shared references', () => {
    const template = getArchiveChangeSkillTemplate();
    const instructions = template.instructions;
    const archiveReference = readReference('references/archive-commit-message.md');
    const boundaryReference = readReference('references/boundary-commit-message.md');
    const mergeReference = readReference('references/merge-summary-message.md');
    const archivePath = 'openspec/references/openspec-archive-commit-message.md';
    const boundaryPath = 'openspec/references/openspec-boundary-commit-message.md';
    const mergePath = 'openspec/references/openspec-merge-summary-message.md';

    expect(template.referenceFiles?.map((file) => file.path)).toContain('references/archive-commit-message.md');
    expect(template.referenceFiles?.map((file) => file.path)).toContain('references/boundary-commit-message.md');
    expect(template.referenceFiles?.map((file) => file.path)).toContain('references/merge-summary-message.md');
    expect(instructions).toContain(`If \`git.commitMessage.archive\` is set, read that project-relative path; otherwise read \`${archivePath}\``);
    expect(instructions).toContain(`If \`git.commitMessage.boundary\` is set, read that project-relative path; otherwise read \`${boundaryPath}\``);
    expect(instructions).toContain(`If \`git.commitMessage.merge\` is set, read that project-relative path; otherwise read \`${mergePath}\``);
    expect(instructions).not.toContain('read `references/archive-commit-message.md` before creating the OpenSpec/docs archive commit');
    expect(instructions).not.toContain('read `references/boundary-commit-message.md`');
    expect(instructions).not.toContain('read `references/merge-summary-message.md` before creating a merge or squash commit message');
    expect(instructions).not.toContain('docs(<change-name>): 归档变更制品');
    expect(instructions).not.toContain('<type>(<scope>): <中文标题>');
    expect(instructions).not.toContain('## Why');
    expect(instructions).not.toContain('## Changes');
    expect(instructions).not.toContain('Implementation:');
    expect(archiveReference).toContain('git.commitMessage.archive');
    expect(archiveReference).toContain('docs(<change-name>): 归档变更制品');
    expect(boundaryReference).toContain('git.commitMessage.boundary');
    expect(boundaryReference).toContain('<type>(<scope>): <中文标题>');
    expect(boundaryReference).toContain('## Why');
    expect(boundaryReference).toContain('## Changes');
    expect(boundaryReference).toContain('Implementation:');
    expect(boundaryReference).toContain('git diff --name-only');
    expect(mergeReference).toContain('git.commitMessage.merge');
    expect(mergeReference).toContain('<type>(<scope>): <中文标题>');
  });

  it('generates codex and claude archive skill step sections from the template source', async () => {
    const codex = await generateArchiveSkill('codex');
    const claude = await generateArchiveSkill('claude');

    try {
      expect(normalizeSteps(codex.skill)).toBe(normalizeSteps(claude.skill));
      expect(normalizeSteps(codex.skill)).toBe(normalizeSteps(getArchiveChangeSkillTemplate().instructions));
    } finally {
      rmSync(codex.root, { recursive: true, force: true });
      rmSync(claude.root, { recursive: true, force: true });
    }
  });

  it('generates archive skill references from the template source', async () => {
    const codex = await generateArchiveSkill('codex');
    const claude = await generateArchiveSkill('claude');

    try {
      for (const [filePath, generatedPath] of [
        ['references/archive-commit-message.md', 'openspec/references/openspec-archive-commit-message.md'],
        ['references/boundary-commit-message.md', 'openspec/references/openspec-boundary-commit-message.md'],
        ['references/merge-summary-message.md', 'openspec/references/openspec-merge-summary-message.md'],
      ] as const) {
        const expected = readReference(filePath);

        expect(readFileSync(join(codex.root, generatedPath), 'utf-8')).toBe(expected);
        expect(readFileSync(join(claude.root, generatedPath), 'utf-8')).toBe(expected);
      }
    } finally {
      rmSync(codex.root, { recursive: true, force: true });
      rmSync(claude.root, { recursive: true, force: true });
    }
  });
});
