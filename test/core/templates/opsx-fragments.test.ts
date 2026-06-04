import { describe, it, expect } from 'vitest';
import {
  CLEAN_CONTEXT_VERIFY_PROTOCOL_REREAD,
  CLEAN_CONTEXT_VERIFY_PROTOCOL_SUBAGENT,
  CONFORMANCE_CHECK_RULES,
  GIT_EVIDENCE_PROTOCOL,
  OPTIMIZATION_PROTOCOL_SUBAGENT,
  OPSX_NAVIGATION_GUIDANCE,
  OPSX_CLI_QUERY_CONTEXT,
  OPSX_POST_PROPOSE_VALIDATION,
  OPSX_READ_CONTEXT,
  OPSX_SHARED_CONTEXT,
  OPSX_VERIFY_ALIGNMENT,
  VERIFY_COORDINATOR_ROLE,
  VERIFY_CLI_JSON_SCHEMA_REFERENCE,
  VERIFY_REVIEWER_SUBAGENT_CONTRACT,
  VERIFY_ERROR_RECOVERY_GUIDE,
  VERIFY_FRESHNESS_RULES,
  VERIFY_SIMPLE_CHANGE_FAST_PATH,
  VERIFY_STATE_MACHINE_DIAGRAM,
  VERIFY_SUBAGENT_TIMEOUT_RULES,
  VERIFY_WRITEBACK_RULES,
} from '../../../src/core/templates/fragments/opsx-fragments.js';
import {
  getClaudeOpsxVerifyCommandTemplate,
  getClaudeVerifyChangeSkillTemplate,
} from '../../../src/core/templates/workflows/.claude/verify-change.js';
import { getCodexVerifyChangeSkillTemplate } from '../../../src/core/templates/workflows/.codex/verify-change.js';
import {
  createArchiveChangeSkillTemplateForExecutionModel,
  createOpsxArchiveCommandTemplateForExecutionModel,
} from '../../../src/core/templates/workflows/archive-change.js';
import { getExploreSkillTemplate } from '../../../src/core/templates/workflows/explore.js';
import { getOnboardSkillTemplate } from '../../../src/core/templates/workflows/onboard.js';
import {
  getOpsxProposeCommandTemplate,
  getOpsxProposeSkillTemplate,
} from '../../../src/core/templates/workflows/propose.js';
import {
  getApplyChangeSkillTemplate,
  getOpsxApplyCommandTemplate,
} from '../../../src/core/templates/workflows/apply-change.js';
import { getArchiveChangeSkillTemplate } from '../../../src/core/templates/workflows/archive-change.js';
import { SUBAGENT_VERIFY_EXECUTION_MODEL } from '../../../src/core/templates/workflows/verify-execution-model.js';
import { getSyncSpecsSkillTemplate } from '../../../src/core/templates/workflows/sync-specs.js';
import { getVerifyChangeSkillTemplate } from '../../../src/core/templates/workflows/verify-change.js';

describe('OPSX shared context fragments', () => {
  it('keeps OPSX_READ_CONTEXT as a compatibility alias', () => {
    expect(OPSX_READ_CONTEXT).toBe(OPSX_SHARED_CONTEXT);
  });

  it('uses raw OPSX navigation only for explore and CLI query context for propose/apply', () => {
    expect(getExploreSkillTemplate().instructions).toContain(OPSX_SHARED_CONTEXT);
    expect(getExploreSkillTemplate().instructions).toContain(OPSX_NAVIGATION_GUIDANCE);

    expect(getOpsxProposeSkillTemplate().instructions).toContain(OPSX_CLI_QUERY_CONTEXT);
    expect(getOpsxProposeCommandTemplate().content).toContain(OPSX_CLI_QUERY_CONTEXT);
    expect(getApplyChangeSkillTemplate().instructions).toContain(OPSX_CLI_QUERY_CONTEXT);
    expect(getOpsxApplyCommandTemplate().content).toContain(OPSX_CLI_QUERY_CONTEXT);

    for (const template of [
      getOpsxProposeSkillTemplate().instructions,
      getOpsxProposeCommandTemplate().content,
      getApplyChangeSkillTemplate().instructions,
      getOpsxApplyCommandTemplate().content,
    ]) {
      expect(template).not.toContain('read it first for domains');
      expect(template).not.toContain('Check `openspec/project.opsx.code-map.yaml`');
      expect(template).not.toContain('Check `openspec/project.opsx.relations.yaml`');
    }
  });

  it('reuses post-propose validation guidance across propose skill and command templates', () => {
    expect(getOpsxProposeSkillTemplate().instructions).toContain(OPSX_POST_PROPOSE_VALIDATION);
    expect(getOpsxProposeCommandTemplate().content).toContain(OPSX_POST_PROPOSE_VALIDATION);
  });

  it('reuses conformance and write-back fragments across verify/archive templates', () => {
    expect(getVerifyChangeSkillTemplate().instructions).toContain(CONFORMANCE_CHECK_RULES);
    expect(getVerifyChangeSkillTemplate().instructions).toContain(VERIFY_WRITEBACK_RULES);
    expect(getVerifyChangeSkillTemplate().instructions).toContain(VERIFY_COORDINATOR_ROLE);
    expect(getVerifyChangeSkillTemplate().instructions).toContain(OPSX_VERIFY_ALIGNMENT);
    expect(getVerifyChangeSkillTemplate().instructions).toContain(CLEAN_CONTEXT_VERIFY_PROTOCOL_REREAD);
    expect(getVerifyChangeSkillTemplate().instructions).toContain(GIT_EVIDENCE_PROTOCOL);
    expect(getVerifyChangeSkillTemplate().instructions).toContain('openspec-optimizer');

    expect(getArchiveChangeSkillTemplate().instructions).toContain(VERIFY_FRESHNESS_RULES);
  });

  it('uses subagent clean-context protocol for claude and codex verify variants', () => {
    expect(getClaudeVerifyChangeSkillTemplate().instructions).toContain(
      CLEAN_CONTEXT_VERIFY_PROTOCOL_SUBAGENT
    );
    expect(getClaudeVerifyChangeSkillTemplate().instructions).toContain(
      VERIFY_SUBAGENT_TIMEOUT_RULES
    );
    expect(getClaudeOpsxVerifyCommandTemplate().content).toContain(
      CLEAN_CONTEXT_VERIFY_PROTOCOL_SUBAGENT
    );
    expect(getCodexVerifyChangeSkillTemplate().instructions).toContain(
      CLEAN_CONTEXT_VERIFY_PROTOCOL_SUBAGENT
    );
    expect(getClaudeVerifyChangeSkillTemplate().instructions).toContain(
      'openspec-reviewer'
    );
  });

  it('reuses execution-model-specific archive contracts for subagent-capable tools', () => {
    const skill = createArchiveChangeSkillTemplateForExecutionModel(
      SUBAGENT_VERIFY_EXECUTION_MODEL
    ).instructions;
    const command = createOpsxArchiveCommandTemplateForExecutionModel(
      SUBAGENT_VERIFY_EXECUTION_MODEL
    ).content;

    for (const template of [skill, command]) {
      expect(template).toContain('subagent-orchestrated');
      expect(template).toContain('invoke the `openspec-reviewer` skill');
      expect(template).toContain('MUST NOT inline a current-agent review skeleton');
    }
  });

  it('defines optimization search/replace matching constraints explicitly', () => {
    expect(OPTIMIZATION_PROTOCOL_SUBAGENT).toContain('exact match first');
    expect(OPTIMIZATION_PROTOCOL_SUBAGENT).toContain('whitespace-normalized matching');
    expect(OPTIMIZATION_PROTOCOL_SUBAGENT).toContain('matches zero or multiple locations is invalid');
    expect(OPTIMIZATION_PROTOCOL_SUBAGENT).toContain('No optimization opportunities found');
  });

  it('exports shared verify gate guidance fragments', () => {
    for (const fragment of [
      VERIFY_STATE_MACHINE_DIAGRAM,
      VERIFY_CLI_JSON_SCHEMA_REFERENCE,
      VERIFY_ERROR_RECOVERY_GUIDE,
      VERIFY_SIMPLE_CHANGE_FAST_PATH,
      VERIFY_COORDINATOR_ROLE,
      VERIFY_SUBAGENT_TIMEOUT_RULES,
    ]) {
      expect(fragment).toBeTypeOf('string');
      expect(fragment.length).toBeGreaterThan(0);
    }
  });

  it('documents all verify CLI JSON input shapes', () => {
    expect(VERIFY_CLI_JSON_SCHEMA_REFERENCE).toContain('phase1');
    expect(VERIFY_CLI_JSON_SCHEMA_REFERENCE).toContain('NO_OPTIMIZATION_NEEDED');
    expect(VERIFY_CLI_JSON_SCHEMA_REFERENCE).toContain('OPTIMIZATION_PROPOSED');
    expect(VERIFY_CLI_JSON_SCHEMA_REFERENCE).toContain('SKIPPED');
    expect(VERIFY_CLI_JSON_SCHEMA_REFERENCE).toContain('"result":"PASS"');
    expect(VERIFY_CLI_JSON_SCHEMA_REFERENCE).toContain('FAIL_NEEDS_REMEDIATION');
    expect(VERIFY_CLI_JSON_SCHEMA_REFERENCE).toContain('behaviorRetryCounter');
  });

  it('documents verify terminal and archive gate states', () => {
    for (const status of [
      'SKIPPED',
      'NOT_NEEDED',
      'IMPROVED',
      'DEGRADED',
      'PENDING_VERIFICATION',
      'ABORTED_UNSAFE',
    ]) {
      expect(VERIFY_STATE_MACHINE_DIAGRAM).toContain(status);
    }
    expect(VERIFY_STATE_MACHINE_DIAGRAM).toContain('Archive gate accepts');
    expect(VERIFY_STATE_MACHINE_DIAGRAM).toContain('Archive gate rejects');
  });

  it('keeps projection contract wording aligned across explore, sync, archive, verify, and onboard surfaces', () => {
    expect(getExploreSkillTemplate().instructions).toContain('compiled prompt projection contract');
    expect(getSyncSpecsSkillTemplate().instructions).toContain('shared prompt/runtime projection contract');
    expect(getArchiveChangeSkillTemplate().instructions).toContain('shared prompt/runtime projection contract');
    expect(getVerifyChangeSkillTemplate().instructions).toContain('shared prompt/runtime projection contract');
    expect(getOnboardSkillTemplate().instructions).toContain('compiled prompt projection contract');
  });
});
