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

  it('aligns OPSX validation with downstream dry-run merge semantics and graceful skip behavior', () => {
    for (const body of getProposeBodies()) {
      expect(body).toContain('prepareChangeSync()');
      expect(body).toContain('Do NOT run `openspec sync`');
      expect(body).toContain('referential integrity');
      expect(body).toContain('code-map integrity');
      expect(body).toContain('skip this OPSX merge-based validation');
    }
  });

  it('uses current schema templates for lightweight proposal/design/tasks checks', () => {
    for (const body of getProposeBodies()) {
      expect(body).toContain('openspec instructions proposal --change "<name>" --json');
      expect(body).toContain('openspec instructions design --change "<name>" --json');
      expect(body).toContain('openspec instructions tasks --change "<name>" --json');
      expect(body).toContain('Do NOT invent semantic lint rules beyond the current templates');
    }
  });
});
