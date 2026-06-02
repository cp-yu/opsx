import { describe, expect, it } from 'vitest';

import { getReviewerSkillTemplate } from '../../src/core/templates/workflows/reviewer.js';

describe('reviewer coherence escalation contract', () => {
  it('escalates design violations while keeping pattern deviations non-blocking', () => {
    const instructions = getReviewerSkillTemplate().instructions;

    expect(instructions).toContain('issue CRITICAL "Design decision violated"');
    expect(instructions).toContain(
      'Downgrade to WARNING only when the implementation includes an explicit code comment explaining the deviation'
    );
    expect(instructions).toContain('Significant pattern deviations produce SUGGESTION');
  });
});
