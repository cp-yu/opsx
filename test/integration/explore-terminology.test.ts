import { describe, expect, it } from 'vitest';

import { createTerminologyQuestion } from '../../src/core/ai/terminology-decision.js';
import { extractTerminologyObservations } from '../../src/core/ai/terminology-extractor.js';

describe('explore terminology integration', () => {
  it('turns sweeper terminology observations into an explore question', () => {
    const observations = extractTerminologyObservations('流程', [
      {
        name: 'apply-change-workflow',
        content: '工作流使用 workflow 模板。',
      },
    ]);

    const question = createTerminologyQuestion(observations);

    expect(observations?.foundInSpecs.length).toBeGreaterThan(0);
    expect(question).toContain("你使用了'流程'");
  });

  it('keeps old sweeper reports compatible', () => {
    expect(createTerminologyQuestion(undefined)).toBeUndefined();
  });
});
