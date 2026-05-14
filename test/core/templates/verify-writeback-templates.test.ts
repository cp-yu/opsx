import { describe, expect, it } from 'vitest';

import {
  getApplyChangeSkillTemplate,
  getArchiveChangeSkillTemplate,
  getOpsxApplyCommandTemplate,
  getOpsxArchiveCommandTemplate,
  getOpsxVerifyCommandTemplate,
  getVerifyChangeSkillTemplate,
} from '../../../src/core/templates/skill-templates.js';
import {
  createArchiveChangeSkillTemplateForExecutionModel,
  createOpsxArchiveCommandTemplateForExecutionModel,
} from '../../../src/core/templates/workflows/archive-change.js';
import {
  getClaudeOpsxVerifyCommandTemplate,
  getClaudeVerifyChangeSkillTemplate,
} from '../../../src/core/templates/workflows/.claude/verify-change.js';
import { getCodexVerifyChangeSkillTemplate } from '../../../src/core/templates/workflows/.codex/verify-change.js';
import { SUBAGENT_VERIFY_EXECUTION_MODEL } from '../../../src/core/templates/workflows/verify-execution-model.js';

describe('verify write-back workflow templates', () => {
  it('describes verify write-back and persistence semantics in both surfaces', () => {
    const skill = getVerifyChangeSkillTemplate().instructions;
    const command = getOpsxVerifyCommandTemplate().content;

    for (const template of [skill, command]) {
      expect(template).toContain('3.5. [Mode: Setup] **Stop early if no verifyable tasks exist**');
      expect(template).toContain('没有可供 verify 的任务');
      expect(template).toContain('Recommend running `/opsx:continue` to create tasks');
      expect(template).toContain('If omitted, you MUST prompt for available changes.');
      expect(template).not.toContain('check if it can be inferred from conversation context');
      expect(template).toContain('9. [Mode: Writeback] **Write Back CRITICAL Issues**');
      expect(template).toContain('10. [Mode: Record] **Persist the Canonical Phase 1 Result Through CLI**');
      expect(template).toContain('11. [Mode: Checkpoint] **Submit Phase 2 Optimization Through CLI**');
      expect(template).toContain('12. [Mode: Speculative Verify] **Re-verify Candidate Changes and Enforce Retry Budgets**');
      expect(template).toContain('13. [Mode: Seal] **Seal Final Verification Result**');
      expect(template).toContain('openspec verify phase1 "<change-name>"');
      expect(template).toContain('openspec verify phase2 "<change-name>" --type=optimization');
      expect(template).toContain('openspec verify seal "<change-name>"');
      expect(template).toContain('FAIL_NEEDS_REMEDIATION');
      expect(template).toContain('PASS_WITH_WARNINGS');
      expect(template).toContain('PASS');
      expect(template).toContain('## Remediation');
      expect(template).toContain('[code_fix]');
      expect(template).toContain('[artifact_fix]');
      expect(template).toContain('`[x]` to `[ ]`');
      expect(template).toContain('1.5. [Mode: Setup] **Clean-Context Verification Setup**');
      expect(template).toContain('5.5. [Mode: Evidence] **Git Evidence Investigation**');
      expect(template).toContain('verificationContext');
      expect(template).toContain('contractVersion');
      expect(template).toContain('evidenceFingerprint');
      expect(template).toContain('gitDiffSummary');
      expect(template).toContain('optimization.enabled');
      expect(template).toContain('--skip-optimization');
      expect(template).toContain('git stash push -u -m "verify-phase2-checkpoint"');
      expect(template).toContain('No optimization opportunities found');
      expect(template).toContain('optimization.status');
      expect(template).toContain('config.optimization.optRetries');
      expect(template).toContain('P1_SPECULATIVE_FENCE');
      expect(template).toContain('Phase 1 PASS. N optimization attempts safely reverted.');
      expect(template).toContain('warning-only outcome because optimization stopped early but the canonical baseline was safely restored');
    }
  });

  it('describes apply remediation feedback loop in both surfaces', () => {
    const skill = getApplyChangeSkillTemplate().instructions;
    const command = getOpsxApplyCommandTemplate().content;

    for (const template of [skill, command]) {
      expect(template).toContain("path.join(changeDir, '.verify-result.json')");
      expect(template).toContain("result === 'FAIL_NEEDS_REMEDIATION'");
      expect(template).toContain('optimization.status');
      expect(template).toContain('advisory context only');
      expect(template).toContain('Summary of prior CRITICAL verify issues');
      expect(template).toContain('## Remediation');
      expect(template).toContain('[code_fix]');
      expect(template).toContain('[artifact_fix]');
      expect(template).toContain('Phase 1 must pass before archive');
    }
  });

  it('describes expanded verify gate and core inline check in both archive surfaces', () => {
    const skill = getArchiveChangeSkillTemplate().instructions;
    const command = getOpsxArchiveCommandTemplate().content;

    for (const template of [skill, command]) {
      expect(template).toContain('2. **Unified Full Verify Gate**');
      expect(template).toContain('openspec verify status "<change-name>" --json');
      expect(template).toContain("result === 'FAIL_NEEDS_REMEDIATION'");
      expect(template).toContain('2.5. **Execute Full Verify**');
      expect(template).toContain('If the command exits non-zero because the result is MISSING or STALE');
      expect(template).toContain('rerun `openspec verify status "<change-name>" --json`');
      expect(template).toContain('PASS_WITH_WARNINGS');
      expect(template).toContain('ABORTED_UNSAFE');
      expect(template).toContain('PENDING_VERIFICATION');
      expect(template).toContain('Verify State Machine');
      expect(template).toContain('Verify CLI JSON Schema Reference');
      expect(template).toContain('current-agent-reread');
      expect(template).toContain('Execute the verify workflow end-to-end, including Phase 2 whenever the `/opsx:verify` contract would make it eligible');
      expect(template).toContain("`optimization.status = 'SKIPPED'` is only valid when config disables optimization or the user explicitly requested `--skip-optimization`");
      expect(template).toContain('There is no archive-only mini check');
      expect(template).toContain('There is no bypass path after a failed verify');
      expect(template).toContain('Run `openspec sync "<change-name>"` before archive');
      expect(template).not.toContain('Core mode inline conformance check (Step 4.5)');
      expect(template).not.toContain('Soft-prompt the user');
    }
  });

  it('uses the subagent-orchestrated archive rerun contract when requested', () => {
    const skill = createArchiveChangeSkillTemplateForExecutionModel(
      SUBAGENT_VERIFY_EXECUTION_MODEL
    ).instructions;
    const command = createOpsxArchiveCommandTemplateForExecutionModel(
      SUBAGENT_VERIFY_EXECUTION_MODEL
    ).content;

    for (const template of [skill, command]) {
      expect(template).toContain('subagent-orchestrated');
      expect(template).toContain('invoke the `openspec-reviewer` skill');
      expect(template).toContain('P1_SPECULATIVE_FENCE');
      expect(template).toContain('MUST NOT inline a current-agent review skeleton');
      expect(template).toContain('silently downgrade to reread mode');
    }
  });

  it('uses subagent clean-context verify variants for claude and codex', () => {
    expect(getClaudeVerifyChangeSkillTemplate().instructions).toContain(
      "executionMode: 'subagent-orchestrated'"
    );
    expect(getClaudeOpsxVerifyCommandTemplate().content).toContain(
      "executionMode: 'subagent-orchestrated'"
    );
    expect(getCodexVerifyChangeSkillTemplate().instructions).toContain(
      "executionMode: 'subagent-orchestrated'"
    );
    expect(getVerifyChangeSkillTemplate().instructions).toContain(
      "executionMode: 'current-agent-reread'"
    );
    expect(getOpsxVerifyCommandTemplate().content).toContain(
      "executionMode: 'current-agent-reread'"
    );
  });

  it('keeps phase 1 judgment out of the subagent top-level verify skeleton', () => {
    for (const template of [
      getClaudeVerifyChangeSkillTemplate().instructions,
      getClaudeOpsxVerifyCommandTemplate().content,
      getCodexVerifyChangeSkillTemplate().instructions,
    ]) {
      expect(template).toContain('4. [Mode: Evidence] **Assemble the Explicit Evidence Bundle**');
      expect(template).toContain('5. [Mode: Delegate Review] **Run the Reviewer Subagent for Canonical Phase 1**');
      expect(template).toContain('6. [Mode: Validate Payload] **Validate the Reviewer Payload**');
      expect(template).toContain('7. [Mode: Writeback] **Write Back CRITICAL Issues**');
      expect(template).toContain('8. [Mode: Record] **Persist the Canonical Phase 1 Result Through CLI**');
      expect(template).toContain('9. [Mode: Checkpoint] **Submit Phase 2 Optimization Through CLI**');
      expect(template).toContain('10. [Mode: Speculative Verify] **Re-verify Candidate Changes and Enforce Retry Budgets**');
      expect(template).toContain('11. [Mode: Seal] **Seal Final Verification Result**');
      expect(template).toContain('subagent-orchestrated');
      expect(template).not.toContain('5. [Mode: Evidence] **Verify Completeness**');
      expect(template).not.toContain('6. [Mode: Evidence] **Verify Correctness**');
      expect(template).not.toContain('7. [Mode: Evidence] **Verify Coherence**');
      expect(template).not.toContain('8. [Mode: Evidence] **Generate Verification Report**');
    }
  });

  it('documents coordinator role, mode labels, and explicit subagent delegation', () => {
    const reread = getVerifyChangeSkillTemplate().instructions;
    const subagentTemplates = [
      getClaudeVerifyChangeSkillTemplate().instructions,
      getClaudeOpsxVerifyCommandTemplate().content,
      getCodexVerifyChangeSkillTemplate().instructions,
    ];

    for (const template of [reread, ...subagentTemplates]) {
      expect(template.startsWith('**Verification Coordinator Role**')).toBe(true);
      for (const label of [
        '[Mode: Setup]',
        '[Mode: Evidence]',
        '[Mode: Delegate Review]',
        '[Mode: Validate Payload]',
        '[Mode: Writeback]',
        '[Mode: Record]',
        '[Mode: Checkpoint]',
        '[Mode: Optimize]',
        '[Mode: Speculative Verify]',
        '[Mode: Seal]',
      ]) {
        expect(template).toContain(label);
      }
      expect(template).not.toContain('Agent({');
      expect(template).not.toContain('TaskOutput({');
      expect(template).not.toContain('AskUserQuestion');
    }

    for (const template of subagentTemplates) {
      expect(template).toContain('Delegate to a clean-context reviewer subagent');
      expect(template).toContain('invoke the `openspec-reviewer` skill');
      expect(template).toContain('`changeArtifacts`');
      expect(template).toContain('`gitEvidence`');
      expect(template).toContain('`finalFileContents`');
      expect(template).toContain('`priorVerifyResult`');
      expect(template).toContain('`opsxContext`');
      expect(template).toContain('Wait for the complete reviewer payload');
      expect(template).toContain('Delegate to a clean-context optimizer subagent');
      expect(template).toContain('invoke the `openspec-optimizer` skill');
      expect(template).toContain('failedDirections');
      expect(template).toContain('MUST NOT edit files directly');
      expect(template).toContain('Subagent Timeout and Waiting Rules');
      expect(template).not.toContain('Spawn a clean-context reviewer subagent');
    }
  });

  it('formats phase 2 checkpoint state machine as a table before hard rules', () => {
    const template = getVerifyChangeSkillTemplate().instructions;
    const diagramIndex = template.indexOf('**Verify State Machine**');
    const tableIndex = template.indexOf('| State | Trigger condition | Git operation |');
    const hardRulesIndex = template.indexOf('Hard rules:');

    expect(diagramIndex).toBeGreaterThan(-1);
    expect(tableIndex).toBeGreaterThan(diagramIndex);
    expect(hardRulesIndex).toBeGreaterThan(tableIndex);

    for (const state of [
      '`CREATED`',
      '`BASELINE_RESTORED_FOR_RETRY`',
      '`TERMINAL_ACCEPTED`',
      '`TERMINAL_RESTORED`',
    ]) {
      expect(template).toContain(state);
    }
  });

  it('documents cross-platform evidence path handling in verify persistence', () => {
    for (const template of [
      getVerifyChangeSkillTemplate().instructions,
      getOpsxVerifyCommandTemplate().content,
      getArchiveChangeSkillTemplate().instructions,
      getOpsxArchiveCommandTemplate().content,
    ]) {
      expect(template).toContain('path.resolve()');
      expect(template).toContain('path.normalize()');
      expect(template).toContain('relative POSIX paths');
    }
  });

  it('documents phase 2 success, degraded, and skip scenarios', () => {
    for (const template of [
      getVerifyChangeSkillTemplate().instructions,
      getOpsxVerifyCommandTemplate().content,
    ]) {
      expect(template).toContain('optimization.status');
      expect(template).toContain('SKIPPED');
      expect(template).toContain('NOT_NEEDED');
      expect(template).toContain('IMPROVED');
      expect(template).toContain('DEGRADED');
      expect(template).toContain('ABORTED_UNSAFE');
      expect(template).not.toContain('Phase 2 skipped: worktree is dirty');
      expect(template).toContain('If the user passed `--skip-optimization` or config disables optimization');
    }
  });

  it('documents checkpoint rollback and retry budgets for phase 2', () => {
    for (const template of [
      getVerifyChangeSkillTemplate().instructions,
      getOpsxVerifyCommandTemplate().content,
    ]) {
      expect(template).toContain('git stash push -u -m "verify-phase2-checkpoint"');
      expect(template).toContain('git stash apply <checkpointRef>');
      expect(template).toContain('git stash drop <checkpointRef>');
      expect(template).toContain('git stash pop <checkpointRef>');
      expect(template).toContain('BASELINE_RESTORED_FOR_RETRY');
      expect(template).toContain('TERMINAL_RESTORED');
      expect(template).toContain('cross-platform recovery instructions');
      expect(template).toContain('git reset --hard HEAD');
      expect(template).toContain('git clean -fd');
      expect(template).toContain('config.optimization.optRetries');
      expect(template).toContain('checkpoint-adjacent bookkeeping paths');
    }
  });
});
