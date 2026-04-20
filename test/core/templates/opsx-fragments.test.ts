import { describe, it, expect } from 'vitest';
import {
  CLEAN_CONTEXT_VERIFY_PROTOCOL_REREAD,
  CLEAN_CONTEXT_VERIFY_PROTOCOL_SUBAGENT,
  CONFORMANCE_CHECK_RULES,
  GIT_EVIDENCE_PROTOCOL,
  OPSX_NAVIGATION_GUIDANCE,
  OPSX_POST_PROPOSE_VALIDATION,
  OPSX_READ_CONTEXT,
  OPSX_SHARED_CONTEXT,
  OPSX_VERIFY_ALIGNMENT,
  VERIFY_FRESHNESS_RULES,
  VERIFY_WRITEBACK_RULES,
} from '../../../src/core/templates/fragments/opsx-fragments.js';
import {
  getClaudeOpsxVerifyCommandTemplate,
  getClaudeVerifyChangeSkillTemplate,
} from '../../../src/core/templates/workflows/.claude/verify-change.js';
import { getCodexVerifyChangeSkillTemplate } from '../../../src/core/templates/workflows/.codex/verify-change.js';
import { getExploreSkillTemplate } from '../../../src/core/templates/workflows/explore.js';
import { getOnboardSkillTemplate } from '../../../src/core/templates/workflows/onboard.js';
import {
  getOpsxProposeCommandTemplate,
  getOpsxProposeSkillTemplate,
} from '../../../src/core/templates/workflows/propose.js';
import { getApplyChangeSkillTemplate } from '../../../src/core/templates/workflows/apply-change.js';
import { getArchiveChangeSkillTemplate } from '../../../src/core/templates/workflows/archive-change.js';
import { getSyncSpecsSkillTemplate } from '../../../src/core/templates/workflows/sync-specs.js';
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
    expect(getVerifyChangeSkillTemplate().instructions).toContain(CLEAN_CONTEXT_VERIFY_PROTOCOL_REREAD);
    expect(getVerifyChangeSkillTemplate().instructions).toContain(GIT_EVIDENCE_PROTOCOL);

    expect(getArchiveChangeSkillTemplate().instructions).toContain(VERIFY_FRESHNESS_RULES);
  });

  it('uses subagent clean-context protocol for claude and codex verify variants', () => {
    expect(getClaudeVerifyChangeSkillTemplate().instructions).toContain(
      CLEAN_CONTEXT_VERIFY_PROTOCOL_SUBAGENT
    );
    expect(getClaudeOpsxVerifyCommandTemplate().content).toContain(
      CLEAN_CONTEXT_VERIFY_PROTOCOL_SUBAGENT
    );
    expect(getCodexVerifyChangeSkillTemplate().instructions).toContain(
      CLEAN_CONTEXT_VERIFY_PROTOCOL_SUBAGENT
    );
  });

  it('keeps projection contract wording aligned across explore, sync, archive, verify, and onboard surfaces', () => {
    expect(getExploreSkillTemplate().instructions).toContain('compiled prompt projection contract');
    expect(getSyncSpecsSkillTemplate().instructions).toContain('shared prompt/runtime projection contract');
    expect(getArchiveChangeSkillTemplate().instructions).toContain('shared prompt/runtime projection contract');
    expect(getVerifyChangeSkillTemplate().instructions).toContain('shared prompt/runtime projection contract');
    expect(getOnboardSkillTemplate().instructions).toContain('compiled prompt projection contract');
  });
});
