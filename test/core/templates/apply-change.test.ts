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

  it('documents strict Phase 0 TDD and branch isolation', () => {
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
      expect(template).toContain('Master Agent Strict TDD Implementation');
      expect(template).toContain('For behavior or code Checks, add or update the targeted test before implementation.');
      expect(template).toContain('Run the declared Check command or equivalent targeted command and confirm the expected failure before implementation.');
      expect(template).toContain('Make the minimal implementation needed for that Check.');
      expect(template).toContain('Rerun the same or equivalent Check command and confirm pass before updating task or remediation checkboxes.');
      expect(template).toContain('Non-runtime text or artifact Checks do not require artificial red failures.');
      expect(template).toContain('Config, schema, template, workflow template, and agent instruction template Checks default to behavior/code Checks');
      expect(template).toContain('Mark the task\'s nested Checks complete in `tasks.md` only after red/green evidence or final non-runtime evidence passes.');
      expect(template).toContain('openspec list --specs --json');
      expect(template).toContain("capabilities` string array");
      expect(template).toContain('capabilities: []');
      expect(template).not.toContain('openspec spec list');
      expect(template).not.toContain('Master Agent Direct Implementation');
      expect(template).not.toContain('Implement the task directly in the current agent context');
      expect(template).not.toContain("path.join(changeDir, '.apply-steps')");
      expect(template).not.toContain('openspec-implementer');
      expect(template).not.toContain('cheapest available subagent model');
      expect(template).not.toContain('DONE_WITH_CONCERNS');
    }
  });

  it('documents continuous recovery before user-visible pause', () => {
    for (const template of [
      getApplyChangeSkillTemplate().instructions,
      getOpsxApplyCommandTemplate().content,
    ]) {
      expect(template).toContain('Continuous Recovery Protocol');
      expect(template).toContain('task + check + command + failure kind');
      expect(template).toContain('two consecutive failures');
      expect(template).toContain('same task and same normalized error signature');
      expect(template).toContain('changed normalized error signature is progress');
      expect(template).toContain('User interrupt remains an immediate stop condition');
      expect(template).toContain('Failures are recovery feedback');
      expect(template).toContain('Phase 1 failures enter the same recovery loop');
      expect(template).toContain('If a task Goal or Requirements is ambiguous, enrich context from proposal, design, change-local specs, tasks.md, OPSX code-map, related specs, and project search');
      expect(template).not.toContain('update the .apply-steps file and continue dispatch before asking the user');
      expect(template).toContain('If project context is missing, convert the gap into verifiable exploration or check steps in the current task and continue execution');
    }
  });

  it('does not require generated step files for oversized task execution', () => {
    for (const template of [
      getApplyChangeSkillTemplate().instructions,
      getOpsxApplyCommandTemplate().content,
    ]) {
      expect(template).not.toContain('If more than 5 cycles are needed, split the task automatically');
      expect(template).not.toContain('Each step file or batch MUST contain 1-5 TDD Cycles');
      expect(template).not.toContain('Do not pause solely because a task needs more than 5 TDD Cycles');
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
