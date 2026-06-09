import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { getArchiveChangeSkillTemplate } from '../../src/core/templates/workflows/archive-change.js';

const projectRoot = process.cwd();

function readSkill(relativePath: string): string {
  return readFileSync(join(projectRoot, relativePath), 'utf-8');
}

function normalizeSteps(content: string): string {
  const start = content.indexOf('7. **Create archive commit**');
  const end = content.indexOf('**Output On Success**');
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  return content.slice(start, end).replace(/\s+/g, ' ').trim();
}

function readReference(path: string): string {
  const reference = getArchiveChangeSkillTemplate().referenceFiles?.find((file) => file.path === path);
  expect(reference).toBeDefined();
  return reference!.content;
}

describe('openspec archive skill content', () => {
  it('documents archive commit merge and cleanup steps in order', () => {
    const instructions = getArchiveChangeSkillTemplate().instructions;

    expect(instructions).toContain('7. **Create archive commit**');
    expect(instructions).toContain('8. **Merge archived branch**');
    expect(instructions).toContain('9. **Cleanup feature branch and worktree**');
    expect(instructions.indexOf('7. **Create archive commit**')).toBeLessThan(instructions.indexOf('8. **Merge archived branch**'));
    expect(instructions.indexOf('8. **Merge archived branch**')).toBeLessThan(instructions.indexOf('9. **Cleanup feature branch and worktree**'));
    expect(instructions).toContain('git commit -F -');
    expect(instructions).toContain('git merge --no-ff');
    expect(instructions).toContain('git merge --abort');
    expect(instructions).toContain('git branch --merged');
  });

  it('extends summary fields for archive commit merge and feature branch status', () => {
    const instructions = getArchiveChangeSkillTemplate().instructions;

    expect(instructions).toContain('Archive Commit SHA');
    expect(instructions).toContain('Merge Strategy');
    expect(instructions).toContain('Merge SHA / Status');
    expect(instructions).toContain('Feature Branch');
  });

  it('states archive consumes git policy from project config command output', () => {
    const instructions = getArchiveChangeSkillTemplate().instructions;

    expect(instructions).toContain('openspec config project --json');
    expect(instructions).toContain('normalized project config');
    expect(instructions).toContain('git.autoCommit');
    expect(instructions).toContain('git.archive.commitMessage.convention');
    expect(instructions).toContain('git.merge.strategy');
    expect(instructions).toContain('git.merge.commitMessage.convention');
    expect(instructions).toContain('git.branch.deleteAfterArchive');
    expect(instructions).toContain('skip archive commit, merge, and cleanup');
    expect(instructions).not.toContain('git.merge.messageFrom');
    expect(instructions).toContain('do not parse raw YAML inside the skill');
  });

  it('splits archive and merge message conventions into references', () => {
    const template = getArchiveChangeSkillTemplate();
    const instructions = template.instructions;
    const archiveReference = readReference('references/archive-commit-message.md');
    const mergeReference = readReference('references/merge-summary-message.md');

    expect(template.referenceFiles?.map((file) => file.path)).toContain('references/archive-commit-message.md');
    expect(template.referenceFiles?.map((file) => file.path)).toContain('references/merge-summary-message.md');
    expect(instructions).toContain('read `references/archive-commit-message.md` before creating the archive commit');
    expect(instructions).toContain('Read `references/merge-summary-message.md` before creating a merge or squash commit message');
    expect(archiveReference).toContain('convention: openspec-archive');
    expect(archiveReference).toContain('docs(<change-name>): 归档变更制品');
    expect(mergeReference).toContain('convention: openspec-merge-summary');
    expect(mergeReference).toContain('<type>(<scope>): <中文标题>');
  });

  it('keeps codex and claude archive skill step sections equivalent', () => {
    const codex = readSkill('.codex/skills/openspec-archive-change/SKILL.md');
    const claude = readSkill('.claude/skills/openspec-archive-change/SKILL.md');

    expect(normalizeSteps(codex)).toBe(normalizeSteps(claude));
    expect(normalizeSteps(codex)).toBe(normalizeSteps(getArchiveChangeSkillTemplate().instructions));
  });

  it('keeps generated archive skill references equivalent to template source', () => {
    for (const filePath of ['references/archive-commit-message.md', 'references/merge-summary-message.md']) {
      const expected = readReference(filePath);

      expect(readSkill(join('.codex/skills/openspec-archive-change', filePath))).toBe(expected);
      expect(readSkill(join('.claude/skills/openspec-archive-change', filePath))).toBe(expected);
    }
  });
});
