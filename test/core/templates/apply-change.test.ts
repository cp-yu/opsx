import { describe, expect, it } from 'vitest';

import {
  VERIFY_CLI_JSON_SCHEMA_REFERENCE,
  VERIFY_ERROR_RECOVERY_GUIDE,
  VERIFY_STATE_MACHINE_DIAGRAM,
} from '../../../src/core/templates/fragments/opsx-fragments.js';
import {
  getApplyChangeSkillTemplate,
  getOpsxApplyCommandTemplate,
} from '../../../src/core/templates/workflows/apply-change.js';

describe('apply change workflow template', () => {
  it('documents the Phase 0-3 apply + verify workflow in both surfaces', () => {
    for (const template of [
      getApplyChangeSkillTemplate().instructions,
      getOpsxApplyCommandTemplate().content,
    ]) {
      expect(template).toContain('Phase 1: Run canonical verification');
      expect(template).toContain('Phase 2: Optimize under checkpoint protection');
      expect(template).toContain('Phase 3: Seal final result');
      expect(template).toContain('reviewer subagent');
      expect(template).toContain('Optimizer subagent');
      expect(template).toContain('openspec verify phase1 "<change-name>"');
      expect(template).toContain('openspec verify phase2');
      expect(template).toContain('openspec verify seal "<change-name>"');
      expect(template).toContain('apply-opt-checkpoint-r0');
      expect(template).toContain('optimization.optRetries');
      expect(template).toContain('failed direction');
      expect(template).toContain('--skip-optimization');
      expect(template).toContain('state: "needs_verify"');
      expect(template).toContain('state: "needs_seal"');
      expect(template).toContain('skip back to Phase 1');
      expect(template).toContain('continue with Phase 2/3');
      expect(template).toContain(VERIFY_CLI_JSON_SCHEMA_REFERENCE);
      expect(template).toContain(VERIFY_ERROR_RECOVERY_GUIDE);
      expect(template).toContain(VERIFY_STATE_MACHINE_DIAGRAM);
    }
  });

  it('documents TDD decomposition, implementer dispatch, and branch isolation', () => {
    for (const template of [
      getApplyChangeSkillTemplate().instructions,
      getOpsxApplyCommandTemplate().content,
    ]) {
      expect(template).toContain('Branch Isolation Preflight');
      expect(template).toContain('git branch --show-current');
      expect(template).toContain('Create branch `<change-name>`');
      expect(template).toContain('Create worktree at `.worktrees/<change-name>`');
      expect(template).toContain('use that as the default choice without prompting; only `ask` is interactive and means prompt');
      expect(template).toContain("path.join(changeDir, '.apply-isolation.json')");
      expect(template).toContain('using-git-worktrees');
      expect(template).toContain('Master Agent TDD Decomposition');
      expect(template).toContain("path.join(changeDir, '.apply-steps')");
      expect(template).toContain('Step 1: Write Failing Test');
      expect(template).toContain('Step 2: Run Test (Verify Fails)');
      expect(template).toContain('Step 3: Implement Minimal Code');
      expect(template).toContain('Step 4: Run Test (Verify Passes)');
      expect(template).toContain('Step 5: Commit');
      expect(template).toContain('openspec-implementer');
      expect(template).toContain('cheapest available subagent model');
      expect(template).toContain('Use a capable model only when the user or project configuration explicitly overrides the default');
      expect(template).toContain('DONE_WITH_CONCERNS');
    }
  });

  it('documents continuous recovery before user-visible pause', () => {
    for (const template of [
      getApplyChangeSkillTemplate().instructions,
      getOpsxApplyCommandTemplate().content,
    ]) {
      expect(template).toContain('Continuous Recovery Protocol');
      expect(template).toContain('task + cycle + step + command + failure kind');
      expect(template).toContain('two consecutive failures');
      expect(template).toContain('same task and same normalized error signature');
      expect(template).toContain('changed normalized error signature is progress');
      expect(template).toContain('User interrupt remains an immediate stop condition');
      expect(template).toContain('BLOCKED and NEEDS_CONTEXT are recovery feedback');
      expect(template).toContain('Phase 1 failures enter the same recovery loop');
      expect(template).toContain('If a task Goal or Requirements is ambiguous, enrich context from proposal, design, change-local specs, tasks.md, OPSX code-map, related specs, and project search');
      expect(template).toContain('update the .apply-steps file and continue dispatch before asking the user');
      expect(template).toContain('If project context is missing, convert the gap into verifiable exploration or check steps in the step file and continue execution');
    }
  });

  it('auto-splits oversized task decompositions instead of pausing', () => {
    for (const template of [
      getApplyChangeSkillTemplate().instructions,
      getOpsxApplyCommandTemplate().content,
    ]) {
      expect(template).toContain('If more than 5 cycles are needed, split the task automatically');
      expect(template).toContain('Each step file or batch MUST contain 1-5 TDD Cycles');
      expect(template).toContain('Do not pause solely because a task needs more than 5 TDD Cycles');
    }
  });

  it('routes seal failure into remediation and recovery', () => {
    for (const template of [
      getApplyChangeSkillTemplate().instructions,
      getOpsxApplyCommandTemplate().content,
    ]) {
      expect(template).toContain('If seal fails, preserve diagnostics, convert them into remediation context');
      expect(template).toContain('map the remediation to the affected task');
      expect(template).toContain('return to Phase 0 recovery');
      expect(template).toContain('Do not pause on the first seal failure');
    }
  });
});
