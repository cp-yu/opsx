import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { getOptimizerSkillTemplate } from '../../src/core/templates/workflows/optimizer.js';

const projectRoot = process.cwd();

function readSkill(relativePath: string): string {
  return readFileSync(join(projectRoot, relativePath), 'utf-8');
}

function readReference(name: string): string {
  const template = getOptimizerSkillTemplate();
  const reference = template.referenceFiles?.find((file) => file.path === name);
  expect(reference).toBeDefined();
  return reference!.content;
}

function normalizeSelfRead(content: string): string {
  const start = content.indexOf('# Optimizer Self-Read Protocol');
  const end = content.indexOf('## Dependency Expansion (One Hop)');
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
    const instructions = readReference('references/self-read-protocol.md');

    expect(instructions).toContain('git diff <originalBranch>...HEAD --name-only');
    expect(instructions).toContain('base scope');
    expect(instructions).toContain('changeDir/.apply-isolation.json');
    expect(instructions).toContain('git symbolic-ref refs/remotes/origin/HEAD --short');
    expect(instructions).not.toMatch(/git diff(?! <originalBranch>\.\.\.HEAD --name-only)/);
  });

  it('documents one-hop dependency expansion through imports callers and OPSX relations', () => {
    const instructions = readReference('references/self-read-protocol.md');

    expect(instructions).toContain('## Dependency Expansion (One Hop)');
    expect(instructions).toContain('imports');
    expect(instructions).toContain('callers');
    expect(instructions).toContain('OPSX relations');
    expect(instructions).toContain('one hop');
  });

  it('limits patches and affected hashes to base scope files', () => {
    const instructions = readReference('references/self-read-protocol.md');

    expect(instructions).toContain('Expansion candidates MUST NOT be patch targets');
    expect(instructions).toContain('Search/Replace PATH');
    expect(instructions).toContain('affectedFileHashes');
    expect(instructions).toContain('base scope files only');
  });

  it('documents expansion filtering and relations fallback', () => {
    const instructions = readReference('references/self-read-protocol.md');

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
    const codex = readSkill('openspec/references/openspec-self-read-protocol.md');
    const claude = readSkill('openspec/references/openspec-self-read-protocol.md');

    expect(normalizeSelfRead(codex)).toBe(normalizeSelfRead(claude));
    expect(normalizeSelfRead(codex)).toBe(normalizeSelfRead(readReference('references/self-read-protocol.md')));
  });

  it('documents Pocock optimizer smell dimensions and block annotations', () => {
    const instructions = [
      readReference('references/decision-rules.md'),
      readReference('references/output-protocol.md'),
    ].join('\n');

    expect(instructions).toContain('Lower duplication');
    expect(instructions).toContain('identical logic blocks in two or more locations');
    expect(instructions).toContain('copy-pasted validation or transformation logic');
    expect(instructions).toContain('repeated error handling patterns');
    expect(instructions).toContain('Better locality');
    expect(instructions).toContain("Feature Envy where a method mainly operates on another class's data");
    expect(instructions).toContain('getter chains');
    expect(instructions).toContain('logic placed away from the data owner');
    expect(instructions).toContain('Break long methods');
    expect(instructions).toContain('methods longer than 30 lines');
    expect(instructions).toContain('extracting private helper methods');
    expect(instructions).toContain('keeping the public method signature, parameters, and return value unchanged');
    expect(instructions).toContain('Deepen shallow modules');
    expect(instructions).toContain('method count, parameter complexity, and hidden internal complexity');
    expect(instructions).toContain('merge related shallow modules');
    expect(instructions).toContain('Eliminate primitive obsession');
    expect(instructions).toContain('Email, money/currency, date ranges, identifiers');
    expect(instructions).toContain('validation is encapsulated once');
    expect(instructions).toContain('<!-- Code Smell: <Duplication | Long Method | Shallow Module | Feature Envy | Primitive Obsession | Deep Nesting | Dead Code> -->');
    expect(instructions).toContain('Every block MUST include exactly one preceding `<!-- Code Smell: <type> -->` annotation');
  });
});
