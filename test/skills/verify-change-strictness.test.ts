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

  it('both skeletons contain absence-based REMOVED requirement verification (C8)', () => {
    const instructions = getVerifyChangeSkillTemplate().instructions;

    expect(instructions).toContain('REMOVED Requirement');
    expect(instructions).toContain('absence');
    expect(instructions).toContain('residue');
  });

  it('both skeletons contain dual-branch Preserves equivalence check (C8)', () => {
    const instructions = getVerifyChangeSkillTemplate().instructions;

    expect(instructions).toContain('Preserves');
    expect(instructions).toContain('old form');
    expect(instructions).toContain('coexist');
  });

  it('both skeletons contain anchor-type spec coverage check (C12)', () => {
    const instructions = getVerifyChangeSkillTemplate().instructions;

    expect(instructions).toContain('ADDED');
    expect(instructions).toContain('REMOVED');
    expect(instructions).toContain('spec coverage');
  });

  it('both skeletons contain Delete declaration cross-check (C12)', () => {
    const instructions = getVerifyChangeSkillTemplate().instructions;

    expect(instructions).toContain('Delete:');
    expect(instructions).toContain('git diff');
    expect(instructions).toContain('still exists');
  });
});
