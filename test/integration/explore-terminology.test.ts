import { describe, expect, it } from 'vitest';

import { createTerminologyQuestion } from '../../src/core/ai/terminology-decision.js';
import { extractTerminologyObservations } from '../../src/core/ai/terminology-extractor.js';

describe('explore terminology integration', () => {
  it('turns sweeper terminology observations into an explore question', () => {
    const observations = extractTerminologyObservations('workflow', [
      {
        name: 'apply-change-workflow',
        content: 'process uses pipeline templates.',
      },
    ]);

    const question = createTerminologyQuestion(observations);

    expect(observations?.foundInSpecs.length).toBeGreaterThan(0);
    expect(question).toContain("You used 'workflow'");
  });

  it('keeps old sweeper reports compatible', () => {
    expect(createTerminologyQuestion(undefined)).toBeUndefined();
  });
});
