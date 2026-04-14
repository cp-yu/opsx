import { describe, it, expect } from 'vitest';
import {
  CONFORMANCE_CHECK_RULES,
  OPSX_NAVIGATION_GUIDANCE,
  OPSX_POST_PROPOSE_VALIDATION,
  OPSX_READ_CONTEXT,
  OPSX_SHARED_CONTEXT,
  OPSX_VERIFY_ALIGNMENT,
  VERIFY_WRITEBACK_RULES,
} from '../../../src/core/templates/fragments/opsx-fragments.js';
import { getExploreSkillTemplate } from '../../../src/core/templates/workflows/explore.js';
import {
  getOpsxProposeCommandTemplate,
  getOpsxProposeSkillTemplate,
} from '../../../src/core/templates/workflows/propose.js';
import { getApplyChangeSkillTemplate } from '../../../src/core/templates/workflows/apply-change.js';
import { getArchiveChangeSkillTemplate } from '../../../src/core/templates/workflows/archive-change.js';
import { getVerifyChangeSkillTemplate } from '../../../src/core/templates/workflows/verify-change.js';

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

  it('reuses post-propose validation guidance across propose skill and command templates', () => {
    expect(getOpsxProposeSkillTemplate().instructions).toContain(OPSX_POST_PROPOSE_VALIDATION);
    expect(getOpsxProposeCommandTemplate().content).toContain(OPSX_POST_PROPOSE_VALIDATION);
  });

  it('reuses conformance and write-back fragments across verify/archive templates', () => {
    expect(getVerifyChangeSkillTemplate().instructions).toContain(CONFORMANCE_CHECK_RULES);
    expect(getVerifyChangeSkillTemplate().instructions).toContain(VERIFY_WRITEBACK_RULES);
    expect(getVerifyChangeSkillTemplate().instructions).toContain(OPSX_VERIFY_ALIGNMENT);

    expect(getArchiveChangeSkillTemplate().instructions).toContain(CONFORMANCE_CHECK_RULES);
    expect(getArchiveChangeSkillTemplate().instructions).toContain(VERIFY_WRITEBACK_RULES);
  });
});
