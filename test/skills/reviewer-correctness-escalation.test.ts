import { describe, expect, it } from 'vitest';

import { getReviewerSkillTemplate } from '../../src/core/templates/workflows/reviewer.js';

describe('reviewer correctness escalation contract', () => {
  it('escalates spec contradictions while allowing cosmetic drift downgrade', () => {
    const instructions = getReviewerSkillTemplate().instructions;

    expect(instructions).toContain('issue CRITICAL "Implementation contradicts spec"');
    expect(instructions).toContain(
      'Downgrade to WARNING only when drift is cosmetic and does not affect observable behavior'
    );
  });

  it('escalates incomplete scenario coverage without a downgrade path', () => {
    const instructions = getReviewerSkillTemplate().instructions;

    expect(instructions).toContain('issue CRITICAL "Scenario not covered"');
    expect(instructions).toContain('Scenario coverage gaps are not downgrade candidates');
  });
});
