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
import {
  createArchiveChangeSkillTemplateForExecutionModel,
  createOpsxArchiveCommandTemplateForExecutionModel,
  getArchiveChangeSkillTemplate,
  getOpsxArchiveCommandTemplate,
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
import {
  getVerifyChangeSkillTemplate,
  getOpsxVerifyCommandTemplate,
} from '../../../src/core/templates/workflows/verify-change.js';

describe('OPSX shared context fragments', () => {
  it('keeps OPSX_READ_CONTEXT as a compatibility alias', () => {
    expect(OPSX_READ_CONTEXT).toBe(OPSX_SHARED_CONTEXT);
  });

  it('uses raw OPSX navigation only for explore and CLI query context for propose/apply', () => {
    // Layer 3: Fragment reference verification
    expect(getExploreSkillTemplate().instructions).toContain(OPSX_SHARED_CONTEXT);
    expect(getExploreSkillTemplate().instructions).toContain(OPSX_NAVIGATION_GUIDANCE);

    // Command templates should include CLI query fragment
    expect(getOpsxProposeCommandTemplate().content).toContain(OPSX_CLI_QUERY_CONTEXT);
    expect(getOpsxApplyCommandTemplate().content).toContain(OPSX_CLI_QUERY_CONTEXT);

    // Skill templates have inlined/simplified CLI query guidance - check core concepts
    for (const template of [
      getOpsxProposeSkillTemplate().instructions,
      getApplyChangeSkillTemplate().instructions,
    ]) {
      expect(template).toMatch(/openspec.*list.*--specs|openspec.*opsx.*query/i);
      expect(template).not.toContain('read it first for domains');
      expect(template).not.toContain('Check `openspec/project.opsx.code-map.yaml`');
      expect(template).not.toContain('Check `openspec/project.opsx.relations.yaml`');
    }
  });

  it('reuses post-propose validation guidance across propose skill and command templates', () => {
    // Command template should include the full fragment
    expect(getOpsxProposeCommandTemplate().content).toContain(OPSX_POST_PROPOSE_VALIDATION);

    // Skill template has inlined/simplified validation guidance - check core concepts
    const skillTemplate = getOpsxProposeSkillTemplate().instructions;
    expect(skillTemplate).toMatch(/warning.*only.*validation/i);
    expect(skillTemplate).toMatch(/validate.*change/i);
    expect(skillTemplate).toMatch(/openspec\s+validate/);
  });

  it('reuses conformance and write-back fragments across verify/archive templates', () => {
    // Verify command template should include the full fragments
    expect(getOpsxVerifyCommandTemplate().content).toContain(CONFORMANCE_CHECK_RULES);
    expect(getOpsxVerifyCommandTemplate().content).toContain(VERIFY_WRITEBACK_RULES);
    expect(getOpsxVerifyCommandTemplate().content).toContain(VERIFY_COORDINATOR_ROLE);
    expect(getOpsxVerifyCommandTemplate().content).toContain(OPSX_VERIFY_ALIGNMENT);
    expect(getOpsxVerifyCommandTemplate().content).toContain(CLEAN_CONTEXT_VERIFY_PROTOCOL_REREAD);
    expect(getOpsxVerifyCommandTemplate().content).toContain(GIT_EVIDENCE_PROTOCOL);
    expect(getOpsxVerifyCommandTemplate().content).toContain('openspec-optimizer');

    // Verify skill template has simplified instructions - check core concepts
    expect(getVerifyChangeSkillTemplate().instructions).toMatch(/verify.*complete.*correct.*coherent/i);
    expect(getVerifyChangeSkillTemplate().instructions).toMatch(/openspec-optimizer/i);

    // Archive templates should mention verify or verification concepts
    expect(getOpsxArchiveCommandTemplate().content).toMatch(/verify|verification/i);
    expect(getArchiveChangeSkillTemplate().instructions).toMatch(/verify|verification|archive/i);
  });

  it('uses subagent clean-context protocol for claude and codex verify variants', () => {
    // Command templates should include the full fragment
    expect(getClaudeOpsxVerifyCommandTemplate().content).toContain(
      CLEAN_CONTEXT_VERIFY_PROTOCOL_SUBAGENT
    );
    expect(getClaudeOpsxVerifyCommandTemplate().content).toContain(
      VERIFY_SUBAGENT_TIMEOUT_RULES
    );
    expect(getClaudeOpsxVerifyCommandTemplate().content).toContain(
      'openspec-reviewer'
    );

    // Skill template has simplified instructions - check core concepts
    expect(getClaudeVerifyChangeSkillTemplate().instructions).toMatch(/subagent.*orchestrat/i);
    expect(getClaudeVerifyChangeSkillTemplate().instructions).toMatch(/openspec-reviewer/i);
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
    // Layer 1: Core concepts - templates should mention config projection or canonical preservation
    for (const template of [
      getExploreSkillTemplate().instructions,
      getSyncSpecsSkillTemplate().instructions,
      getArchiveChangeSkillTemplate().instructions,
      getVerifyChangeSkillTemplate().instructions,
      getOnboardSkillTemplate().instructions,
    ]) {
      expect(template).toMatch(/projection|canonical|config project/i);
    }
  });
});
