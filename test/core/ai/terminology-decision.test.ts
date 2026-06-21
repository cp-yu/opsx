import { describe, expect, it } from 'vitest';

import { createTerminologyQuestion, recordTerminologyDecision } from '../../../src/core/ai/terminology-decision.js';

describe('createTerminologyQuestion', () => {
  it('asks when the user input does not match terms found in specs', () => {
    const question = createTerminologyQuestion({
      userInput: 'workflow',
      foundInSpecs: [
        { term: 'process', count: 10, specs: ['apply-change-workflow', 'cli-archive', 'cli-sync'] },
        { term: 'pipeline', count: 5, specs: ['ai-workflow-templates'] },
      ],
    });

    expect(question).toContain("You used 'workflow'");
    expect(question).toContain("'process' (10 occurrences, see apply-change-workflow, cli-archive etc.)");
    expect(question).toContain("Do they refer to the same concept?");
  });

  it('asks when specs use multiple terms including the user input', () => {
    const question = createTerminologyQuestion({
      userInput: 'process',
      foundInSpecs: [
        { term: 'process', count: 10, specs: ['apply-change-workflow'] },
        { term: 'pipeline', count: 5, specs: ['ai-workflow-templates'] },
      ],
    });

    expect(question).toContain('Terminology inconsistency detected:');
    expect(question).toContain("'process' (10 occurrences)");
    expect(question).toContain("Suggest choosing a unified term");
  });

  it('stays silent when terminology is consistent or absent', () => {
    expect(
      createTerminologyQuestion({
        userInput: 'process',
        foundInSpecs: [{ term: 'process', count: 10, specs: ['apply-change-workflow'] }],
      })
    ).toBeUndefined();

    expect(createTerminologyQuestion({ userInput: 'new concept', foundInSpecs: [] })).toBeUndefined();
  });

  it('skips missing observations for backward compatibility', () => {
    expect(createTerminologyQuestion(undefined)).toBeUndefined();
  });

  it('formats long term lists without implementation details', () => {
    const question = createTerminologyQuestion({
      userInput: 'process',
      foundInSpecs: [
        { term: 'process', count: 10, specs: ['a'] },
        { term: 'pipeline', count: 8, specs: ['b'] },
        { term: 'workflow', count: 3, specs: ['c'] },
        { term: 'flow', count: 2, specs: ['d'] },
        { term: 'handler', count: 1, specs: ['e'] },
        { term: 'runtime', count: 1, specs: ['f'] },
      ],
    });

    expect(question).toContain('and 6 other expression(s)');
    expect(question).not.toContain('terminologyObservations');
    expect(question).not.toContain('foundInSpecs');
  });

  it('records same-concept decisions and canonical terms', () => {
    const observations = {
      userInput: 'workflow',
      foundInSpecs: [
        { term: 'process', count: 10, specs: ['apply-change-workflow'] },
        { term: 'pipeline', count: 5, specs: ['ai-workflow-templates'] },
      ],
    };

    const sameConcept = recordTerminologyDecision(undefined, observations, { type: 'same_concept' });
    const canonical = recordTerminologyDecision(sameConcept, observations, {
      type: 'canonical_term',
      term: 'process',
    });

    expect(sameConcept.sameConceptGroups).toEqual([['pipeline', 'process', 'workflow']]);
    expect(canonical.canonicalTerms['pipeline|process|workflow']).toBe('process');
  });

  it('suppresses repeated prompts after the user rejects unification', () => {
    const observations = {
      userInput: 'workflow',
      foundInSpecs: [
        { term: 'process', count: 10, specs: ['apply-change-workflow'] },
        { term: 'workflow', count: 5, specs: ['ai-workflow-templates'] },
      ],
    };

    const state = recordTerminologyDecision(undefined, observations, { type: 'different_concepts' });

    expect(createTerminologyQuestion(observations, state)).toBeUndefined();
  });

  it('suppresses repeated prompts after same-concept confirmation', () => {
    const observations = {
      userInput: 'workflow',
      foundInSpecs: [
        { term: 'process', count: 10, specs: ['apply-change-workflow'] },
        { term: 'workflow', count: 5, specs: ['ai-workflow-templates'] },
      ],
    };

    const state = recordTerminologyDecision(undefined, observations, { type: 'same_concept' });

    expect(createTerminologyQuestion(observations, state)).toBeUndefined();
  });

  it('suppresses repeated prompts after canonical term selection', () => {
    const observations = {
      userInput: 'workflow',
      foundInSpecs: [
        { term: 'process', count: 10, specs: ['apply-change-workflow'] },
        { term: 'workflow', count: 5, specs: ['ai-workflow-templates'] },
      ],
    };

    const state = recordTerminologyDecision(undefined, observations, {
      type: 'canonical_term',
      term: 'process',
    });

    expect(createTerminologyQuestion(observations, state)).toBeUndefined();
  });
});
