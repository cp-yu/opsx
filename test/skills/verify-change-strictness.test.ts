import { describe, expect, it } from 'vitest';

import { getVerifyChangeSkillTemplate } from '../../src/core/templates/workflows/verify-change.js';

describe('verify change strictness guidance', () => {
  it('escalates uncertainty instead of preferring lower severity tiers', () => {
    const instructions = getVerifyChangeSkillTemplate().instructions;

    expect(instructions).toContain(
      "when uncertain, escalate to CRITICAL to enforce the 'clean slate' principle"
    );
    expect(instructions).not.toContain('prefer lower tier');
    expect(instructions).not.toContain(
      'when uncertain, prefer SUGGESTION over WARNING and WARNING over CRITICAL'
    );
  });
});
