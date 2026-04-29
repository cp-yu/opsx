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
  getClaudeOpsxVerifyCommandTemplate,
  getClaudeVerifyChangeSkillTemplate,
} from '../../../src/core/templates/workflows/.claude/verify-change.js';
import { getCodexVerifyChangeSkillTemplate } from '../../../src/core/templates/workflows/.codex/verify-change.js';

describe('verify write-back workflow templates', () => {
  it('describes verify write-back and persistence semantics in both surfaces', () => {
    const skill = getVerifyChangeSkillTemplate().instructions;
    const command = getOpsxVerifyCommandTemplate().content;

    for (const template of [skill, command]) {
      expect(template).toContain('9. **Write Back CRITICAL Issues**');
      expect(template).toContain('10. **Prepare the Canonical Phase 1 Result**');
      expect(template).toContain('11. **Run Phase 2 Optimality Check**');
      expect(template).toContain('12. **Re-verify Candidate Changes and Enforce Retry Budgets**');
      expect(template).toContain('13. **Persist Final Verification Result**');
      expect(template).toContain("path.join(changeDir, '.verify-result.json')");
      expect(template).toContain('FAIL_NEEDS_REMEDIATION');
      expect(template).toContain('PASS_WITH_WARNINGS');
      expect(template).toContain('PASS');
      expect(template).toContain('## Remediation');
      expect(template).toContain('[code_fix]');
      expect(template).toContain('[artifact_fix]');
      expect(template).toContain('`[x]` to `[ ]`');
      expect(template).toContain('1.5. **Clean-Context Verification Setup**');
      expect(template).toContain('5.5. **Git Evidence Investigation**');
      expect(template).toContain('verificationContext');
      expect(template).toContain('contractVersion');
      expect(template).toContain('evidenceFingerprint');
      expect(template).toContain('gitDiffSummary');
      expect(template).toContain('optimization.enabled');
      expect(template).toContain('--skip-optimization');
      expect(template).toContain('git stash push -u -m "verify-phase2-checkpoint"');
      expect(template).toContain('No optimization opportunities found');
      expect(template).toContain('optimization.status');
      expect(template).toContain('maxFormatRetries = 2');
      expect(template).toContain('maxMatchRetries = 2');
      expect(template).toContain('maxBehaviorFailures = 3');
      expect(template).toContain('P1_SPECULATIVE_FENCE');
      expect(template).toContain('Phase 1 PASS. 3 optimization attempts safely reverted.');
      expect(template).toContain('Optimization phase aborted, but canonical verification passed.');
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
      expect(template).toContain('run `/opsx:verify <change-name>` before archiving');
    }
  });

  it('describes expanded verify gate and core inline check in both archive surfaces', () => {
    const skill = getArchiveChangeSkillTemplate().instructions;
    const command = getOpsxArchiveCommandTemplate().content;

    for (const template of [skill, command]) {
      expect(template).toContain('2. **Unified Full Verify Gate**');
      expect(template).toContain("path.join(changeDir, '.verify-result.json')");
      expect(template).toContain("result === 'FAIL_NEEDS_REMEDIATION'");
      expect(template).toContain('2.5. **Execute Full Verify**');
      expect(template).toContain("If `.verify-result.json` does not exist");
      expect(template).toContain('If ANY freshness check fails');
      expect(template).toContain("result === 'PASS_WITH_WARNINGS'");
      expect(template).toContain('optimization.status === \'ABORTED_UNSAFE\'');
      expect(template).toContain('legacy verify result');
      expect(template).toContain('archive-compatible metadata');
      expect(template).toContain('There is no archive-only mini check');
      expect(template).toContain('There is no bypass path after a failed verify');
      expect(template).not.toContain('Core mode inline conformance check (Step 4.5)');
      expect(template).not.toContain('Soft-prompt the user');
    }
  });

  it('uses subagent clean-context verify variants for claude and codex', () => {
    expect(getClaudeVerifyChangeSkillTemplate().instructions).toContain(
      "executionMode: 'clean-context-reviewer'"
    );
    expect(getClaudeOpsxVerifyCommandTemplate().content).toContain(
      "executionMode: 'clean-context-reviewer'"
    );
    expect(getCodexVerifyChangeSkillTemplate().instructions).toContain(
      "executionMode: 'clean-context-reviewer'"
    );
    expect(getVerifyChangeSkillTemplate().instructions).toContain(
      "executionMode: 'current-agent-reread'"
    );
    expect(getOpsxVerifyCommandTemplate().content).toContain(
      "executionMode: 'current-agent-reread'"
    );
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
      expect(template).toContain('git stash drop');
      expect(template).toContain('git reset --hard HEAD');
      expect(template).toContain('git clean -fd');
      expect(template).toContain('maxFormatRetries = 2');
      expect(template).toContain('maxMatchRetries = 2');
      expect(template).toContain('maxBehaviorFailures = 3');
      expect(template).toContain('checkpoint-adjacent bookkeeping paths');
    }
  });
});
