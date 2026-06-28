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
import { runTransforms } from '../../../src/core/templates/transforms/index.js';

describe('apply change workflow template', () => {
  it('references the apply Phase 2 optimization protocol from the skill surface', () => {
    const template = getApplyChangeSkillTemplate();

    expect(template.referenceFiles).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: 'references/apply-phase2-optimization.md',
        }),
      ])
    );
    expect(template.instructions).toContain(
      'read the project-root file `openspec/references/openspec-apply-phase2-optimization.md` before Phase 2'
    );
  });

  it('keeps apply Phase 2 checkpoint commands in a commit-based reference', () => {
    const template = getApplyChangeSkillTemplate();
    const reference = template.referenceFiles?.find(
      (file) => file.path === 'references/apply-phase2-optimization.md'
    );

    expect(reference?.content).toContain('git commit -m "wip: opt-checkpoint-r0 (baseline)"');
    expect(reference?.content).toContain('git commit -m "wip: opt-r${N} (${description})"');
    expect(reference?.content).toContain('git reset --hard HEAD');
    expect(reference?.content).toContain('git clean -fd');
    expect(reference?.content).toContain('record verification PASS and save the new successful state before deciding whether to continue');
    expect(reference?.content).not.toContain('If another retry remains, save the new successful state');
    expect(reference?.content).not.toContain('git stash push');
    expect(reference?.content).not.toContain('git stash apply');
    expect(reference?.content).not.toContain('git tag apply-opt-checkpoint');
  });

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
      expect(template).toContain('wip: opt-checkpoint-r0 (baseline)');
      expect(template).toContain('create an incremental checkpoint commit');
      expect(template).not.toContain('create an incremental checkpoint commit when another retry remains');
      expect(template).not.toContain('git stash push');
      expect(template).not.toContain('git stash apply');
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
      expect(template).toContain('method');
      expect(template).toContain('branchName');
      expect(template).toContain('originalBranch');
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

  it('documents Pocock TDD checkpoints for apply implementation', () => {
    for (const template of [
      getApplyChangeSkillTemplate().instructions,
      getOpsxApplyCommandTemplate().content,
    ]) {
      expect(template).toContain('TDD Checkpoint 1: Interface Design for Testability');
      expect(template).toContain('dependencies are injected through parameters');
      expect(template).toContain('returns values or observable results');
      expect(template).toContain('public interface area is minimal');
      expect(template).toContain('TDD Checkpoint 2: Test Quality Standards');
      expect(template).toContain('verifies behavior through public interfaces');
      expect(template).toContain('avoids mocking internal project collaborators');
      expect(template).toContain('keeps one logical assertion per test');
      expect(template).toContain('survives internal refactoring');
      expect(template).toContain('TDD Checkpoint 3: Mock Boundary Enforcement');
      expect(template).toContain('mocks are allowed only at system boundaries');
      expect(template).toContain('internal classes, modules, and project-owned collaborators MUST NOT be mocked');
      expect(template).toContain('mockable boundaries must be passed through dependency injection');
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
      expect(template).toContain('User interrupt remains an immediate stop condition');
      expect(template).toContain('Failures are recovery feedback');
      expect(template).toContain('Phase 1 failures enter the same recovery loop');
      expect(template).toContain('If a task Goal or Requirements is ambiguous, enrich context from proposal, design, change-local specs, tasks.md, OPSX code-map, related specs, and project search');
      expect(template).not.toContain('update the .apply-steps file and continue dispatch before asking the user');
      expect(template).toContain('If project context is missing, convert the gap into verifiable exploration or check steps in the current task and continue execution');
    }
  });

  it('documents diagnosis-first discipline in enhanced recovery protocol', () => {
    for (const template of [
      getApplyChangeSkillTemplate().instructions,
      getOpsxApplyCommandTemplate().content,
    ]) {
      expect(template).toContain('Diagnosis Before Repair');
      expect(template).toContain('Read the full error output');
      expect(template).toContain('Identify the failure layer');
      expect(template).toContain('working example');
      expect(template).toContain('Root cause hypothesis');
    }
  });

  it('documents single-variable fix constraint in enhanced recovery protocol', () => {
    for (const template of [
      getApplyChangeSkillTemplate().instructions,
      getOpsxApplyCommandTemplate().content,
    ]) {
      expect(template).toContain('Single-Variable Fix Constraint');
      expect(template).toContain('change only one variable');
      expect(template).toContain('do not stack multiple independent changes');
    }
  });

  it('documents cumulative 3-strike mechanism in enhanced recovery protocol', () => {
    for (const template of [
      getApplyChangeSkillTemplate().instructions,
      getOpsxApplyCommandTemplate().content,
    ]) {
      expect(template).toContain('Cumulative 3-Strike Escalation');
      expect(template).toContain('stop and present evidence');
      expect(template).toContain('attempted paths');
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

  it('contains pre-flight scan paragraph in the skill template', () => {
    for (const template of [
      getApplyChangeSkillTemplate().instructions,
      getOpsxApplyCommandTemplate().content,
    ]) {
      expect(template).toContain('Pre-flight Scan');
      expect(template).toContain('scan all tasks in tasks.md for contradictions');
      expect(template).toContain('dependency-ordering issues');
    }
  });

  it('positions pre-flight scan after OPSX navigation before Branch Isolation', () => {
    for (const template of [
      getApplyChangeSkillTemplate().instructions,
      getOpsxApplyCommandTemplate().content,
    ]) {
      const opsxEnd = template.indexOf('Treat CLI output as navigation context');
      const preflightIndex = template.indexOf('Pre-flight Scan');
      const branchIndex = template.indexOf('Branch Isolation Preflight');
      expect(opsxEnd).toBeGreaterThan(-1);
      expect(preflightIndex).toBeGreaterThan(-1);
      expect(branchIndex).toBeGreaterThan(-1);
      expect(preflightIndex).toBeGreaterThan(opsxEnd);
      expect(branchIndex).toBeGreaterThan(preflightIndex);
    }
  });

  it('contains dependency order detection in pre-flight scan', () => {
    for (const template of [
      getApplyChangeSkillTemplate().instructions,
      getOpsxApplyCommandTemplate().content,
    ]) {
      expect(template).toContain('dependency-ordering');
      expect(template).toContain('Earlier task depending on output of a later task');
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

  it('uses canonical archive source reference for archive-ready handoff', () => {
    const instructions = getApplyChangeSkillTemplate().instructions;

    expect(instructions).toContain('Archive ready. Run /opsx:archive <change-name> to complete the workflow.');
    expect(instructions).not.toContain('Archive ready. Run /opsx-archive');
  });

  it('allows archive-ready handoff to be adapted per tool', () => {
    const source = 'Archive ready. Run /opsx:archive <change-name> to complete the workflow.';

    expect(runTransforms(source, { toolId: 'codex', workflowId: 'apply', artifactType: 'skill' })).toBe(
      'Archive ready. Run $openspec-archive-change <change-name> to complete the workflow.'
    );
    expect(runTransforms(source, { toolId: 'claude', workflowId: 'apply', artifactType: 'skill' })).toBe(
      'Archive ready. Run /openspec-archive-change <change-name> to complete the workflow.'
    );
    expect(runTransforms(source, { toolId: 'pi', workflowId: 'apply', artifactType: 'skill' })).toBe(
      'Archive ready. Run /skill:openspec-archive-change <change-name> to complete the workflow.'
    );
    expect(runTransforms(source, { toolId: 'opencode', workflowId: 'apply', artifactType: 'skill' })).toBe(
      'Archive ready. Run /opsx-archive <change-name> to complete the workflow.'
    );
  });
});
