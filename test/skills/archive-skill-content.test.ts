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

  it('states archive consumes git policy from compiled prompt projection', () => {
    const instructions = getArchiveChangeSkillTemplate().instructions;

    expect(instructions).toContain('compiled prompt projection');
    expect(instructions).toContain('git.merge.strategy');
    expect(instructions).toContain('git.merge.messageFrom');
    expect(instructions).toContain('git.branch.deleteAfterArchive');
    expect(instructions).toContain('do not parse raw YAML inside the skill');
  });

  it('keeps codex and claude archive skill step sections equivalent', () => {
    const codex = readSkill('.codex/skills/openspec-archive-change/SKILL.md');
    const claude = readSkill('.claude/skills/openspec-archive-change/SKILL.md');

    expect(normalizeSteps(codex)).toBe(normalizeSteps(claude));
    expect(normalizeSteps(codex)).toBe(normalizeSteps(getArchiveChangeSkillTemplate().instructions));
  });
});
