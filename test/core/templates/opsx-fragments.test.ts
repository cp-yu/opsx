import { describe, it, expect } from 'vitest';
import {
  OPSX_NAVIGATION_GUIDANCE,
  OPSX_READ_CONTEXT,
  OPSX_SHARED_CONTEXT,
} from '../../../src/core/templates/fragments/opsx-fragments.js';
import { getExploreSkillTemplate } from '../../../src/core/templates/workflows/explore.js';
import { getOpsxProposeSkillTemplate } from '../../../src/core/templates/workflows/propose.js';
import { getApplyChangeSkillTemplate } from '../../../src/core/templates/workflows/apply-change.js';

describe('OPSX shared context fragments', () => {
  it('keeps OPSX_READ_CONTEXT as a compatibility alias', () => {
    expect(OPSX_READ_CONTEXT).toBe(OPSX_SHARED_CONTEXT);
  });

  it('reuses OPSX_SHARED_CONTEXT across explore, propose, and apply templates', () => {
    expect(getExploreSkillTemplate().instructions).toContain(OPSX_SHARED_CONTEXT);
    expect(getExploreSkillTemplate().instructions).toContain(OPSX_NAVIGATION_GUIDANCE);

    expect(getOpsxProposeSkillTemplate().instructions).toContain(OPSX_SHARED_CONTEXT);
    expect(getApplyChangeSkillTemplate().instructions).toContain(OPSX_SHARED_CONTEXT);
  });
});
