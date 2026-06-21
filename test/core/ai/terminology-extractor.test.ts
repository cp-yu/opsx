import { describe, expect, it } from 'vitest';

import { extractTerminologyObservations } from '../../../src/core/ai/terminology-extractor.js';

describe('extractTerminologyObservations', () => {
  it('extracts terms related to a flow concept', () => {
    const observations = extractTerminologyObservations('workflow management', [
      {
        name: 'apply-change-workflow',
        content: 'process handles scheduling. workflow template is kept. pipeline needs validation. topological sort and artifacts are unrelated.',
      },
    ]);

    expect(observations?.foundInSpecs.map((item) => item.term)).toEqual(['pipeline', 'process', 'workflow']);
  });

  it('counts term occurrences and spec distribution', () => {
    const observations = extractTerminologyObservations('workflow', [
      {
        name: 'spec-b',
        content: 'process and process',
      },
      {
        name: 'spec-a',
        content: 'process workflow',
      },
    ]);

    expect(observations?.foundInSpecs).toContainEqual({
      term: 'process',
      count: 3,
      specs: ['spec-a', 'spec-b'],
    });
    expect(observations?.foundInSpecs).toContainEqual({
      term: 'workflow',
      count: 1,
      specs: ['spec-a'],
    });
  });

  it('sorts found terms by count then term', () => {
    const observations = extractTerminologyObservations('workflow', [
      {
        name: 'spec-a',
        content: 'pipeline process flow',
      },
    ]);

    expect(observations?.foundInSpecs.map((item) => item.term)).toEqual(['flow', 'pipeline', 'process']);
  });

  it('omits observations when extraction fails', () => {
    const observations = extractTerminologyObservations(
      'workflow',
      [{ name: 'spec-a', content: 'process' }],
      {
        getCandidateTerms: () => {
          throw new Error('LLM timeout');
        },
      }
    );

    expect(observations).toBeUndefined();
  });
});
