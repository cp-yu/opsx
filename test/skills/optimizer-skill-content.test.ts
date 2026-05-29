import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { getOptimizerSkillTemplate } from '../../src/core/templates/workflows/optimizer.js';

const projectRoot = process.cwd();

function readSkill(relativePath: string): string {
  return readFileSync(join(projectRoot, relativePath), 'utf-8');
}

function normalizeSelfRead(content: string): string {
  const start = content.indexOf('## Self-Read Protocol');
  const end = content.indexOf('## Optimization Principles');
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  return content
    .slice(start, end)
    .replace(/^---[\s\S]*?---\n/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

describe('openspec optimizer skill content', () => {
  it('uses original branch name-only scope and avoids diff hunk evidence', () => {
    const instructions = getOptimizerSkillTemplate().instructions;

    expect(instructions).toContain('git diff <originalBranch>...HEAD --name-only');
    expect(instructions).toContain('base scope');
    expect(instructions).toContain('changeDir/.apply-isolation.json');
    expect(instructions).toContain('git symbolic-ref refs/remotes/origin/HEAD --short');
    expect(instructions).not.toMatch(/git diff(?! <originalBranch>\.\.\.HEAD --name-only)/);
  });

  it('documents one-hop dependency expansion through imports callers and OPSX relations', () => {
    const instructions = getOptimizerSkillTemplate().instructions;

    expect(instructions).toContain('## Dependency Expansion (One Hop)');
    expect(instructions).toContain('imports');
    expect(instructions).toContain('callers');
    expect(instructions).toContain('OPSX relations');
    expect(instructions).toContain('one hop');
  });

  it('limits patches and affected hashes to base scope files', () => {
    const instructions = getOptimizerSkillTemplate().instructions;

    expect(instructions).toContain('Expansion candidates MUST NOT be patch targets');
    expect(instructions).toContain('Search/Replace PATH');
    expect(instructions).toContain('affectedFileHashes');
    expect(instructions).toContain('base scope files only');
  });

  it('documents expansion filtering and relations fallback', () => {
    const instructions = getOptimizerSkillTemplate().instructions;

    expect(instructions).toContain('path.relative');
    expect(instructions).toContain('gitignore');
    expect(instructions).toContain('node_modules');
    expect(instructions).toContain('dist');
    expect(instructions).toContain('build');
    expect(instructions).toContain('.git');
    expect(instructions).toContain('project.opsx.relations.yaml');
    expect(instructions).toContain('If relations are missing');
  });

  it('keeps codex and claude optimizer skill self-read sections equivalent', () => {
    const codex = readSkill('.codex/skills/openspec-optimizer/SKILL.md');
    const claude = readSkill('.claude/skills/openspec-optimizer/SKILL.md');

    expect(normalizeSelfRead(codex)).toBe(normalizeSelfRead(claude));
    expect(normalizeSelfRead(codex)).toBe(normalizeSelfRead(getOptimizerSkillTemplate().instructions));
  });
});
