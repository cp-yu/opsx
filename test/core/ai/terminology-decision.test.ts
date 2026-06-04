import { describe, expect, it } from 'vitest';

import { createTerminologyQuestion, recordTerminologyDecision } from '../../../src/core/ai/terminology-decision.js';

describe('createTerminologyQuestion', () => {
  it('asks when the user input does not match terms found in specs', () => {
    const question = createTerminologyQuestion({
      userInput: '流程',
      foundInSpecs: [
        { term: '工作流', count: 10, specs: ['apply-change-workflow', 'cli-archive', 'cli-sync'] },
        { term: 'workflow', count: 5, specs: ['ai-workflow-templates'] },
      ],
    });

    expect(question).toContain("你使用了'流程'");
    expect(question).toContain("'工作流'（10 处，见 apply-change-workflow、cli-archive 等）");
    expect(question).toContain("是否指同一概念？");
  });

  it('asks when specs use multiple terms including the user input', () => {
    const question = createTerminologyQuestion({
      userInput: '工作流',
      foundInSpecs: [
        { term: '工作流', count: 10, specs: ['apply-change-workflow'] },
        { term: 'workflow', count: 5, specs: ['ai-workflow-templates'] },
      ],
    });

    expect(question).toContain('检测到术语不一致：');
    expect(question).toContain("'工作流'（10 处）");
    expect(question).toContain("建议选择统一术语");
  });

  it('stays silent when terminology is consistent or absent', () => {
    expect(
      createTerminologyQuestion({
        userInput: '工作流',
        foundInSpecs: [{ term: '工作流', count: 10, specs: ['apply-change-workflow'] }],
      })
    ).toBeUndefined();

    expect(createTerminologyQuestion({ userInput: '新概念', foundInSpecs: [] })).toBeUndefined();
  });

  it('skips missing observations for backward compatibility', () => {
    expect(createTerminologyQuestion(undefined)).toBeUndefined();
  });

  it('formats long term lists without implementation details', () => {
    const question = createTerminologyQuestion({
      userInput: '工作流',
      foundInSpecs: [
        { term: '工作流', count: 10, specs: ['a'] },
        { term: 'workflow', count: 8, specs: ['b'] },
        { term: '流程', count: 3, specs: ['c'] },
        { term: '工作流程', count: 2, specs: ['d'] },
        { term: 'process', count: 1, specs: ['e'] },
        { term: 'flow', count: 1, specs: ['f'] },
      ],
    });

    expect(question).toContain('等 6 种表达');
    expect(question).not.toContain('terminologyObservations');
    expect(question).not.toContain('foundInSpecs');
  });

  it('records same-concept decisions and canonical terms', () => {
    const observations = {
      userInput: '流程',
      foundInSpecs: [
        { term: '工作流', count: 10, specs: ['apply-change-workflow'] },
        { term: 'workflow', count: 5, specs: ['ai-workflow-templates'] },
      ],
    };

    const sameConcept = recordTerminologyDecision(undefined, observations, { type: 'same_concept' });
    const canonical = recordTerminologyDecision(sameConcept, observations, {
      type: 'canonical_term',
      term: '工作流',
    });

    expect(sameConcept.sameConceptGroups).toEqual([['workflow', '工作流', '流程']]);
    expect(canonical.canonicalTerms['workflow|工作流|流程']).toBe('工作流');
  });

  it('suppresses repeated prompts after the user rejects unification', () => {
    const observations = {
      userInput: '流程',
      foundInSpecs: [
        { term: '工作流', count: 10, specs: ['apply-change-workflow'] },
        { term: 'workflow', count: 5, specs: ['ai-workflow-templates'] },
      ],
    };

    const state = recordTerminologyDecision(undefined, observations, { type: 'different_concepts' });

    expect(createTerminologyQuestion(observations, state)).toBeUndefined();
  });

  it('suppresses repeated prompts after same-concept confirmation', () => {
    const observations = {
      userInput: '流程',
      foundInSpecs: [
        { term: '工作流', count: 10, specs: ['apply-change-workflow'] },
        { term: 'workflow', count: 5, specs: ['ai-workflow-templates'] },
      ],
    };

    const state = recordTerminologyDecision(undefined, observations, { type: 'same_concept' });

    expect(createTerminologyQuestion(observations, state)).toBeUndefined();
  });

  it('suppresses repeated prompts after canonical term selection', () => {
    const observations = {
      userInput: '流程',
      foundInSpecs: [
        { term: '工作流', count: 10, specs: ['apply-change-workflow'] },
        { term: 'workflow', count: 5, specs: ['ai-workflow-templates'] },
      ],
    };

    const state = recordTerminologyDecision(undefined, observations, {
      type: 'canonical_term',
      term: '工作流',
    });

    expect(createTerminologyQuestion(observations, state)).toBeUndefined();
  });
});
