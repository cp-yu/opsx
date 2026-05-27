import { describe, expect, it } from 'vitest';

import { getImpactSweeperSkillTemplate } from '../../../src/core/templates/skill-templates.js';

describe('impact sweeper template', () => {
  const instructions = getImpactSweeperSkillTemplate().instructions;

  it('defines the report input and output contract', () => {
    expect(getImpactSweeperSkillTemplate().name).toBe('openspec-impact-sweeper');
    expect(instructions).toContain('projectRoot');
    expect(instructions).toContain('concept');
    expect(instructions).toContain('optionalChangeName');
    expect(instructions).toContain('knownUserTerms');
    expect(instructions).toContain('focus');
    expect(instructions).toContain('openspec/sweeper/impact-sweep-<english-project-term-slug>.json');
    expect(instructions).toContain('return only the report path');
    expect(instructions).toContain('Do not emit a separate summary');
  });

  it('includes canonical JSON report fields', () => {
    for (const field of [
      '"concept"',
      '"projectRoot"',
      '"termMappings"',
      '"userTerm"',
      '"projectTerms"',
      '"evidence"',
      '"opsx"',
      '"nodes"',
      '"relationsExpanded"',
      '"coverageGaps"',
      '"mustChange"',
      '"mustCheck"',
      '"questions"',
    ]) {
      expect(instructions).toContain(field);
    }
  });

  it('requires OPSX-first evidence and bounded reverse search', () => {
    expect(instructions).toContain('openspec/project.opsx.yaml');
    expect(instructions).toContain('openspec/project.opsx.code-map.yaml');
    expect(instructions).toContain('openspec/project.opsx.relations.yaml');
    expect(instructions).toContain('one-hop relations');
    expect(instructions).toContain('Expand to second-hop relations only when');
    expect(instructions).toContain('shared infrastructure');
    expect(instructions).toContain('git ls-files');
    expect(instructions).toContain('Exclude openspec/changes/archive/**');
    expect(instructions).toContain('repo-wide reverse search');
    expect(instructions).toContain('Do not rely only on OPSX code-map paths');
  });

  it('scopes optional change artifact reads', () => {
    expect(instructions).toContain('When optionalChangeName is provided');
    expect(instructions).toContain('read only that change');
    expect(instructions).toContain('proposal.md');
    expect(instructions).toContain('design.md');
    expect(instructions).toContain('tasks.md');
    expect(instructions).toContain('specs/**/*.md');
    expect(instructions).toContain('opsx-delta.yaml');
    expect(instructions).toContain('Do not inspect unrelated active changes');
  });

  it('forbids unsafe execution evidence', () => {
    expect(instructions).toContain('Do not run tests, builds, installs, git diff, git status, or git log');
    expect(instructions).toContain('You MAY use git ls-files, file reads, and text search');
  });

  it('limits writes to the ignored sweeper report directory', () => {
    expect(instructions).toContain('create openspec/sweeper/');
    expect(instructions).toContain('create openspec/sweeper/.gitignore if missing');
    expect(instructions).toContain('write or overwrite openspec/sweeper/impact-sweep-<english-project-term-slug>.json');
    expect(instructions).toContain('If openspec/sweeper/.gitignore already exists, do not modify it');
    expect(instructions).toContain('*\n!.gitignore');
    expect(instructions).toContain('Do not modify source files, tests, specs, change artifacts, OPSX files, config files, package files, generated workflow files');
  });
});
