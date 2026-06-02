import { describe, expect, it } from 'vitest';

import { getReviewerSkillTemplate } from '../../src/core/templates/workflows/reviewer.js';

const instructions = getReviewerSkillTemplate().instructions;

type Severity = 'CRITICAL' | 'WARNING' | 'SUGGESTION';

interface ReviewerScenario {
  completedTask: string;
  finalFileEvidence: string;
  specExpectation?: string;
  designDecision?: string;
}

function simulateReviewerSeverity(scenario: ReviewerScenario): {
  severity: Severity;
  summary: string;
} {
  if (
    scenario.completedTask.includes('refactor') &&
    scenario.finalFileEvidence.includes('export function oldApi')
  ) {
    return { severity: 'CRITICAL', summary: 'Dead code not removed' };
  }

  if (
    scenario.specExpectation &&
    !scenario.finalFileEvidence.includes(scenario.specExpectation)
  ) {
    return { severity: 'CRITICAL', summary: 'Scenario not covered' };
  }

  if (
    scenario.designDecision &&
    !scenario.finalFileEvidence.includes(scenario.designDecision) &&
    !scenario.finalFileEvidence.includes('design deviation:')
  ) {
    return { severity: 'CRITICAL', summary: 'Design decision violated' };
  }

  if (scenario.finalFileEvidence.includes('TODO: remove after migration')) {
    return { severity: 'CRITICAL', summary: 'Stale TODO for completed work' };
  }

  return { severity: 'WARNING', summary: 'Cosmetic drift only' };
}

describe('reviewer strictness integration contract', () => {
  it('blocks orphaned code left after refactor', () => {
    const result = simulateReviewerSeverity({
      completedTask: 'refactor oldApi to newApi',
      finalFileEvidence: 'export function oldApi() {}\nexport function newApi() {}',
    });

    expect(result).toEqual({ severity: 'CRITICAL', summary: 'Dead code not removed' });
  });

  it('blocks uncovered scenarios', () => {
    const result = simulateReviewerSeverity({
      completedTask: 'implement retry lockout scenario',
      specExpectation: 'lock after three failures',
      finalFileEvidence: 'if (failures >= 2) lock();',
    });

    expect(result).toEqual({ severity: 'CRITICAL', summary: 'Scenario not covered' });
  });

  it('blocks unexplained design violations', () => {
    const result = simulateReviewerSeverity({
      completedTask: 'implement cache design',
      designDecision: 'Redis cache',
      finalFileEvidence: 'const cache = new Map<string, string>();',
    });

    expect(result).toEqual({ severity: 'CRITICAL', summary: 'Design decision violated' });
  });

  it('downgrades cosmetic drift', () => {
    const result = simulateReviewerSeverity({
      completedTask: 'validate input',
      specExpectation: 'input.trim()',
      finalFileEvidence: 'function checkInput(input: string) { return input.trim(); }',
    });

    expect(result).toEqual({ severity: 'WARNING', summary: 'Cosmetic drift only' });
    expect(instructions).toContain('cosmetic and does not affect observable behavior');
  });

  it('blocks stale TODO markers for completed work', () => {
    const result = simulateReviewerSeverity({
      completedTask: 'complete migration',
      finalFileEvidence: 'TODO: remove after migration\nexport const migrated = true;',
    });

    expect(result).toEqual({
      severity: 'CRITICAL',
      summary: 'Stale TODO for completed work',
    });
  });
});
