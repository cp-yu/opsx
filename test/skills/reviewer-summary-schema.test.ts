import { describe, expect, it } from 'vitest';

import { getReviewerSkillTemplate } from '../../src/core/templates/workflows/reviewer.js';

describe('reviewer summary schema contract', () => {
  it('includes cleanliness counters in the output summary', () => {
    const instructions = getReviewerSkillTemplate().instructions;

    expect(instructions).toContain('"cleanliness": {');
    expect(instructions).toContain('"checked": true');
    expect(instructions).toContain('"orphanedCodeFound": 0');
    expect(instructions).toContain('"deadImportsFound": 0');
    expect(instructions).toContain('"staleTodosFound": 0');
    expect(instructions).toContain('"halfMigrationsFound": 0');
  });

  it('includes unaccountedChangesFound counter in cleanliness summary', () => {
    const instructions = getReviewerSkillTemplate().instructions;

    expect(instructions).toContain('"unaccountedChangesFound": 0');
  });

  it('allows null taskLine for unaccounted change writeBackPlan entries', () => {
    const instructions = getReviewerSkillTemplate().instructions;

    expect(instructions).toContain('null');
    expect(instructions).toContain('append_remediation');
  });
});
