import { describe, expect, it } from 'vitest';

import {
  getOpsxProposeCommandTemplate,
  getOpsxProposeSkillTemplate,
} from '../../../src/core/templates/workflows/propose.js';

function getProposeBodies(): string[] {
  return [
    getOpsxProposeSkillTemplate().instructions,
    getOpsxProposeCommandTemplate().content,
  ];
}

describe('propose template post-validation flow', () => {
  it('keeps post-propose validation warning-only with a single repair pass', () => {
    for (const body of getProposeBodies()) {
      expect(body).toContain('This validation is warning-only.');
      expect(body).toContain('Do NOT turn `/opsx:propose` into a blocking gate.');
      expect(body).toContain('do exactly one repair pass');
      expect(body).toContain('re-check once');
      expect(body).toContain('remaining warnings');
    }
  });

  it('aligns generated spec validation with the existing change delta validation contract', () => {
    for (const body of getProposeBodies()) {
      expect(body).toContain('openspec validate "<name>" --type change --json');
      expect(body).toContain('Validator.validateChangeDeltaSpecs()');
      expect(body).toContain('SHALL/MUST requirement text');
      expect(body).toContain('required `#### Scenario:` blocks');
    }
  });

  it('aligns OPSX validation with downstream programmatic validation and graceful skip behavior', () => {
    for (const body of getProposeBodies()) {
      expect(body).toContain('openspec instructions opsx-delta --change "<name>" --json');
      expect(body).toContain('schema_version: 1');
      expect(body).toContain('ADDED:');
      expect(body).toContain('MODIFIED:');
      expect(body).toContain('REMOVED:');
      expect(body).toContain('Validator.validateOpsxDelta()');
      expect(body).toContain('applyOpsxDelta()');
      expect(body).toContain('Do NOT run `openspec sync`');
      expect(body).toContain('referential integrity');
      expect(body).toContain('code-map integrity');
      expect(body).toContain('skips this check');
    }
  });

  it('uses current schema templates for lightweight proposal/design/tasks checks', () => {
    for (const body of getProposeBodies()) {
      expect(body).toContain('openspec instructions proposal --change "<name>" --json');
      expect(body).toContain('openspec instructions design --change "<name>" --json');
      expect(body).toContain('openspec instructions tasks --change "<name>" --json');
      expect(body).toContain('validateTaskStructure');
      expect(body).toContain('Actions');
      expect(body).toContain('### Task N:');
      expect(body).toContain('Goal');
      expect(body).toContain('Files');
      expect(body).toContain('Requirements');
      expect(body).toContain('Checks');
      expect(body).toContain('Covers:');
      expect(body).toContain('Verifies:');
      expect(body).toContain('change-local `Verifies:` spec paths');
      expect(body).toContain('Requirement/Scenario references');
      expect(body).toContain('Command:');
      expect(body).toContain('Evidence:');
      expect(body).toContain('Expect:');
      expect(body).toContain('Do NOT invent semantic lint rules beyond the current templates');
      expect(body).toContain('Do NOT judge whether a check is semantically sufficient');
    }
  });

  it('documents smart explore routing decisions', () => {
    for (const body of getProposeBodies()) {
      expect(body).toContain('inspect the current conversation for an explore-generated `Design Summary`');
      expect(body).toContain('propose.smartRouting: false');
      expect(body).toContain('propose.requireExplore: false');
      expect(body).toContain("score the user's input across 5 dimensions");
      expect(body).toContain('Detect multi-subsystem scope');
      expect(body).toContain('Design Summary found: proceed and show that Design Summary is being used');
      expect(body).toContain('输入足够详细，跳过 explore，直接生成制品。');
      expect(body).toContain('这个需求涉及多个独立子系统，建议先运行 `/opsx:explore` 进行拆解。');
      expect(body).toContain('Show input length, detail score, multi-subsystem result, and final decision');
    }
  });

  it('uses list --specs JSON for capability-aware spec discovery', () => {
    for (const body of getProposeBodies()) {
      expect(body).toContain('openspec list --specs --json');
      expect(body).toContain("capabilities` string array");
      expect(body).toContain('capabilities: []');
      expect(body).not.toContain('openspec spec list');
    }
  });

  it('applies the schema-provided spec content boundary when creating specs', () => {
    for (const body of getProposeBodies()) {
      expect(body).toContain('When creating `specs`, apply the returned `Spec content boundary`');
      expect(body).toContain('route non-behavior content to design/tasks/proposal/opsx-delta instead of requirements');
    }
  });

  it('uses the shared document language contract for proseLanguage boundaries', () => {
    for (const body of getProposeBodies()) {
      expect(body).toContain('Document Language Contract');
      expect(body).toContain('task titles, check names, Requirement titles, Scenario titles');
      expect(body).toContain('Expect/Evidence descriptions');
      expect(body).toContain('English project terminology may remain embedded');
      expect(body).toContain('ordinary English sentences');
    }
  });

  it('does not require per-artifact language self-checks', () => {
    for (const body of getProposeBodies()) {
      expect(body).not.toContain('non-canonical English prose scan');
      expect(body).not.toContain('ordinary English prose scan');
      expect(body).not.toContain('per-artifact self-check');
    }
  });
});
