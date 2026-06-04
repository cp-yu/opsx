import { describe, expect, it } from 'vitest';

import { extractTerminologyObservations } from '../../../src/core/ai/terminology-extractor.js';

describe('extractTerminologyObservations', () => {
  it('extracts terms related to a flow concept', () => {
    const observations = extractTerminologyObservations('流程管理', [
      {
        name: 'apply-change-workflow',
        content: '工作流负责调度。workflow template 保留。工作流程需要验证。拓扑排序和制品无关。',
      },
    ]);

    expect(observations?.foundInSpecs.map((item) => item.term)).toEqual(['workflow', '工作流', '工作流程']);
  });

  it('counts term occurrences and spec distribution', () => {
    const observations = extractTerminologyObservations('流程', [
      {
        name: 'spec-b',
        content: '工作流和工作流',
      },
      {
        name: 'spec-a',
        content: '工作流 workflow',
      },
    ]);

    expect(observations?.foundInSpecs).toContainEqual({
      term: '工作流',
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
    const observations = extractTerminologyObservations('流程', [
      {
        name: 'spec-a',
        content: 'workflow 工作流 工作流程',
      },
    ]);

    expect(observations?.foundInSpecs.map((item) => item.term)).toEqual(['workflow', '工作流', '工作流程']);
  });

  it('omits observations when extraction fails', () => {
    const observations = extractTerminologyObservations(
      '流程',
      [{ name: 'spec-a', content: '工作流' }],
      {
        getCandidateTerms: () => {
          throw new Error('LLM timeout');
        },
      }
    );

    expect(observations).toBeUndefined();
  });
});
