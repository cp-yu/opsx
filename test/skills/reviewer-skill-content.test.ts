import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { getReviewerSkillTemplate } from '../../src/core/templates/workflows/reviewer.js';

const projectRoot = process.cwd();

function readSkill(relativePath: string): string {
  return readFileSync(join(projectRoot, relativePath), 'utf-8');
}

function normalizeSelfRead(content: string): string {
  const start = content.indexOf('## Self-Read Protocol');
  const end = content.indexOf('## Verification Protocol');
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  return content
    .slice(start, end)
    .replace(/^---[\s\S]*?---\n/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

describe('openspec reviewer skill content', () => {
  it('contains absence-check protocol for REMOVED anchors', () => {
    const instructions = getReviewerSkillTemplate().instructions;

    expect(instructions).toContain('REMOVED Requirement');
    expect(instructions).toContain('multi-angle');
    expect(instructions).toContain('symbol');
    expect(instructions).toContain('import');
    expect(instructions).toContain('residue');
    expect(instructions).toContain('absence');
  });

  it('contains dual-branch equivalence check for Preserves anchors', () => {
    const instructions = getReviewerSkillTemplate().instructions;

    expect(instructions).toContain('Preserves');
    expect(instructions).toContain('old form');
    expect(instructions).toContain('half migration');
    expect(instructions).toContain('coexist');
  });

  it('contains Delete declaration vs git diff cross-check in Completeness', () => {
    const instructions = getReviewerSkillTemplate().instructions;

    expect(instructions).toContain('Delete:');
    expect(instructions).toContain('git diff <originalBranch>...HEAD');
    expect(instructions).toContain('still exists');
  });

  it('uses branch-aware name-only git scope instead of diff content', () => {
    const instructions = getReviewerSkillTemplate().instructions;

    expect(instructions).toContain('git diff <originalBranch>...HEAD --name-only');
    expect(instructions).toContain('name-only output');
    expect(instructions).toContain('final file contents');
    expect(instructions).not.toContain('git diff --name-only');
    expect(instructions).not.toContain('git log -5 --oneline');
  });

  it('documents originalBranch resolution fallback chain', () => {
    const instructions = getReviewerSkillTemplate().instructions;

    expect(instructions).toContain('changeDir/.apply-isolation.json');
    expect(instructions).toContain('originalBranch');
    expect(instructions).toContain('git symbolic-ref refs/remotes/origin/HEAD --short');
    expect(instructions).toContain('git ls-files --modified --others --exclude-standard');
    expect(instructions).toContain('evidenceFiles');
    expect(instructions).toContain('WARNING in gitDiffSummary');
  });

  it('keeps codex and claude reviewer skill self-read sections equivalent', () => {
    const codex = readSkill('.codex/skills/openspec-reviewer/SKILL.md');
    const claude = readSkill('.claude/skills/openspec-reviewer/SKILL.md');

    expect(normalizeSelfRead(codex)).toBe(normalizeSelfRead(claude));
    expect(normalizeSelfRead(codex)).toBe(normalizeSelfRead(getReviewerSkillTemplate().instructions));
  });
});
