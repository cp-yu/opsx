import { describe, expect, it } from 'vitest';

import { getImpactSweeperSkillTemplate } from '../../../src/core/templates/skill-templates.js';

describe('impact sweeper template', () => {
  const template = getImpactSweeperSkillTemplate();
  const instructions = template.instructions;

  function readReference(path: string): string {
    const reference = template.referenceFiles?.find((file) => file.path === path);
    expect(reference).toBeDefined();
    return reference!.content;
  }

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
    const schema = readReference('references/report-schema.md');

    for (const field of [
      '"concept"',
      '"projectRoot"',
      '"terminologyObservations"',
      '"userInput"',
      '"foundInSpecs"',
      '"term"',
      '"specs"',
      '"count"',
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
      expect(schema).toContain(field);
    }
  });

  it('documents terminology awareness extraction', () => {
    const terminology = readReference('references/terminology-awareness.md');

    expect(terminology).toContain('# Impact Sweeper Terminology Awareness');
    expect(terminology).toContain("Identify terms semantically related to user's `concept` input");
    expect(terminology).toContain("if concept is '流程', extract '工作流', 'workflow', '工作流程' etc.");
    expect(terminology).toContain('Record in `terminologyObservations` field');
    expect(terminology).toContain('Report facts only, no judgment or recommendations');
    expect(terminology).toContain('If terminology extraction fails, omit `terminologyObservations` and keep the report usable');
  });

  it('requires CLI-backed OPSX evidence and bounded reverse search', () => {
    const evidence = readReference('references/evidence-protocol.md');

    expect(evidence).toContain('openspec opsx query <node-id> --json');
    expect(evidence).toContain('Use the returned `node`, `relations`, and `codeMap` fields as evidence');
    expect(evidence).toContain('OPSX files not found');
    expect(evidence).toContain('openspec list --specs --json');
    expect(evidence).toContain("Extract each spec entry's `capabilities` string array");
    expect(evidence).toContain('Treat a missing frontmatter mapping as an empty array');
    expect(evidence).toContain('one-hop relations');
    expect(evidence).toContain('Expand to second-hop relations only when');
    expect(evidence).toContain('shared infrastructure');
    expect(evidence).toContain('git ls-files');
    expect(evidence).toContain('Exclude openspec/changes/archive/**');
    expect(evidence).toContain('repo-wide reverse search');
    expect(evidence).toContain('Do not rely only on OPSX code-map paths');
  });

  it('scopes optional change artifact reads', () => {
    const evidence = readReference('references/evidence-protocol.md');

    expect(evidence).toContain('When optionalChangeName is provided');
    expect(evidence).toContain('read only that change');
    expect(evidence).toContain('proposal.md');
    expect(evidence).toContain('design.md');
    expect(evidence).toContain('tasks.md');
    expect(evidence).toContain('specs/**/*.md');
    expect(evidence).toContain('opsx-delta.yaml');
    expect(evidence).toContain('Do not inspect unrelated active changes');
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
