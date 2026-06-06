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
import { SUBAGENT_VERIFY_EXECUTION_MODEL } from '../../../src/core/templates/workflows/verify-execution-model.js';

describe('verify write-back workflow templates', () => {
  it('describes verify write-back and persistence semantics in both surfaces', () => {
    // Command templates have detailed instructions with all fragments
    const command = getOpsxVerifyCommandTemplate().content;

    // Layer 2: Structure - mode labels and key phases
    expect(command).toMatch(/\[Mode:\s*Setup\]/);
    expect(command).toMatch(/\[Mode:\s*Writeback\]/);
    expect(command).toMatch(/\[Mode:\s*Record\]/);
    expect(command).toMatch(/\[Mode:\s*Checkpoint\]/);
    expect(command).toMatch(/\[Mode:\s*Seal\]/);

    // Layer 1: Core concepts - verify commands and result states
    expect(command).toMatch(/openspec\s+verify\s+phase1/);
    expect(command).toMatch(/openspec\s+verify.*phase2/);
    expect(command).toMatch(/openspec\s+verify\s+seal/);
    expect(command).toContain('FAIL_NEEDS_REMEDIATION');
    expect(command).toContain('PASS_WITH_WARNINGS');
    expect(command).toContain('PASS');

    // Layer 1: Core concepts - optimization and git operations
    expect(command).toMatch(/optimization/i);
    expect(command).toMatch(/git\s+stash/);
    expect(command).toContain('optimization.status');

    // Skill template has simplified instructions - check core concepts only
    const skill = getVerifyChangeSkillTemplate().instructions;
    expect(skill).toMatch(/verify.*complete.*correct.*coherent/i);
    expect(skill).toMatch(/openspec\s+verify/);
    expect(skill).toMatch(/phase.*1|phase1/i);
  });

  it('describes apply remediation feedback loop in both surfaces', () => {
    // Command template has detailed guidance
    const command = getOpsxApplyCommandTemplate().content;
    expect(command).toMatch(/\.verify-result\.json/);
    expect(command).toMatch(/FAIL_NEEDS_REMEDIATION/);

    // Skill template has simplified guidance - check core concepts
    const skill = getApplyChangeSkillTemplate().instructions;
    expect(skill).toMatch(/verify.*result|verification/i);
  });

  it('describes expanded verify gate and core inline check in both archive surfaces', () => {
    // Command template has detailed verify gate instructions
    const command = getOpsxArchiveCommandTemplate().content;
    expect(command).toMatch(/verify.*gate/i);
    expect(command).toMatch(/openspec\s+verify\s+status/);
    expect(command).toMatch(/FAIL_NEEDS_REMEDIATION/);
    expect(command).toMatch(/PASS_WITH_WARNINGS/);
    expect(command).toMatch(/openspec\s+sync/);

    // Skill template has simplified instructions - check core concepts
    const skill = getArchiveChangeSkillTemplate().instructions;
    expect(skill).toMatch(/verify/i);
    expect(skill).toMatch(/archive/i);
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
      expect(template).toContain('pass only `changeName`, `changeDir`, and `projectRoot`');
      expect(template).toContain('spawn optimizer subagent with Read and Bash tool capability');
      expect(template).toContain('P1_SPECULATIVE_FENCE');
      expect(template).not.toContain('Build the explicit evidence bundle');
      expect(template).not.toContain('rebuild the speculative evidence bundle');
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
    expect(getVerifyChangeSkillTemplate().instructions).toContain(
      "executionMode: 'current-agent-reread'"
    );
    expect(getOpsxVerifyCommandTemplate().content).toContain(
      "executionMode: 'current-agent-reread'"
    );
  });

  it('keeps phase 1 judgment out of the subagent top-level verify skeleton', () => {
    // Command template uses subagent orchestration - check for detailed instructions
    const template = getClaudeOpsxVerifyCommandTemplate().content;

    // Layer 2: Structure - mode labels for subagent orchestration
    expect(template).toMatch(/\[Mode:\s*Evidence\]/);
    expect(template).toMatch(/\[Mode:\s*Delegate.*Review\]/i);
    expect(template).toMatch(/\[Mode:\s*Writeback\]/);
    expect(template).toMatch(/\[Mode:\s*Record\]/);
    expect(template).toMatch(/\[Mode:\s*Seal\]/);

    // Layer 1: Core concepts - subagent orchestration
    expect(template).toMatch(/subagent.*orchestrat/i);

    // Negative assertions - no inline judgment phases
    expect(template).not.toContain('5. [Mode: Evidence] **Verify Completeness**');
    expect(template).not.toContain('6. [Mode: Evidence] **Verify Correctness**');
    expect(template).not.toContain('7. [Mode: Evidence] **Verify Coherence**');
    expect(template).not.toContain('8. [Mode: Evidence] **Generate Verification Report**');

    // Skill template - check core concepts only
    expect(getClaudeVerifyChangeSkillTemplate().instructions).toMatch(/subagent/i);
  });

  it('documents coordinator role, mode labels, and explicit subagent delegation', () => {
    // Command templates have full coordinator role documentation
    const commandTemplates = [
      getOpsxVerifyCommandTemplate().content,
      getClaudeOpsxVerifyCommandTemplate().content,
    ];

    for (const template of commandTemplates) {
      // Layer 2: Structure - coordinator role and mode labels
      expect(template.startsWith('**Verification Coordinator Role**')).toBe(true);
      expect(template).toMatch(/\[Mode:\s*Setup\]/);
      expect(template).toMatch(/\[Mode:\s*Evidence\]/);
      expect(template).toMatch(/\[Mode:\s*Writeback\]/);
      expect(template).toMatch(/\[Mode:\s*Record\]/);
      expect(template).toMatch(/\[Mode:\s*Seal\]/);

      // Negative assertions - no tool call examples
      expect(template).not.toContain('Agent({');
      expect(template).not.toContain('TaskOutput({');
      expect(template).not.toContain('AskUserQuestion');
    }

    // Subagent command template - check delegation details
    const subagentCommand = getClaudeOpsxVerifyCommandTemplate().content;
    expect(subagentCommand).toMatch(/openspec-reviewer/);
    expect(subagentCommand).toMatch(/changeName/);
    expect(subagentCommand).toMatch(/changeDir/);
    expect(subagentCommand).toMatch(/projectRoot/);
    expect(subagentCommand).toMatch(/openspec-optimizer/);

    // Skill templates have simplified instructions - check core concepts only
    expect(getVerifyChangeSkillTemplate().instructions).toMatch(/verify/i);
    expect(getClaudeVerifyChangeSkillTemplate().instructions).toMatch(/subagent/i);
  });

  it('formats phase 2 checkpoint state machine as a table before hard rules', () => {
    // Command template has the full state machine table
    const template = getOpsxVerifyCommandTemplate().content;
    const diagramIndex = template.indexOf('**Verify State Machine**');
    const tablePattern = /\|\s*State\s*\|.*Trigger.*condition.*\|.*Git.*operation.*\|/i;
    const tableMatch = template.match(tablePattern);
    const hardRulesIndex = template.indexOf('Hard rules:');

    // Layer 2: Structure verification - state machine table exists and is ordered correctly
    expect(diagramIndex).toBeGreaterThan(-1);
    expect(tableMatch).not.toBeNull();
    if (tableMatch) {
      const tableIndex = template.indexOf(tableMatch[0]);
      expect(tableIndex).toBeGreaterThan(diagramIndex);
      expect(hardRulesIndex).toBeGreaterThan(tableIndex);
    }

    // Layer 1: Core concepts - checkpoint states mentioned
    expect(template).toMatch(/CREATED|BASELINE.*RESTORED|TERMINAL/i);
  });

  it('documents cross-platform evidence path handling in verify persistence', () => {
    // Verify command template has detailed path handling instructions including POSIX
    const verifyTemplate = getOpsxVerifyCommandTemplate().content;
    expect(verifyTemplate).toMatch(/path\.resolve|path\.normalize/);
    expect(verifyTemplate).toMatch(/POSIX.*path|path.*POSIX/i);

    // Archive command template has path handling functions
    const archiveTemplate = getOpsxArchiveCommandTemplate().content;
    expect(archiveTemplate).toMatch(/path\.resolve|path\.normalize/);

    // Skill templates have simplified instructions - check they mention files/paths
    expect(getVerifyChangeSkillTemplate().instructions).toMatch(/file|path/i);
    expect(getArchiveChangeSkillTemplate().instructions).toMatch(/file|path/i);
  });

  it('documents phase 2 success, degraded, and skip scenarios', () => {
    // Command templates have detailed optimization status documentation
    for (const template of [
      getOpsxVerifyCommandTemplate().content,
    ]) {
      // Layer 1: Core concepts - optimization status values
      expect(template).toContain('optimization.status');
      expect(template).toContain('SKIPPED');
      expect(template).toContain('NOT_NEEDED');
      expect(template).toContain('IMPROVED');
      expect(template).toContain('DEGRADED');
      expect(template).toContain('ABORTED_UNSAFE');

      // Layer 1: Core concepts - skip conditions
      expect(template).toMatch(/skip.*optimization|optimization.*skip/i);
      expect(template).toMatch(/config.*optimization/i);

      expect(template).not.toContain('Phase 2 skipped: worktree is dirty');
    }

    // Skill template mentions optimization
    expect(getVerifyChangeSkillTemplate().instructions).toMatch(/optimization|phase.*2/i);
  });

  it('documents checkpoint rollback and retry budgets for phase 2', () => {
    // Command templates have detailed checkpoint and rollback instructions
    for (const template of [
      getOpsxVerifyCommandTemplate().content,
    ]) {
      // Layer 1: Core concepts - git stash operations for checkpointing
      expect(template).toMatch(/git\s+stash\s+push/);
      expect(template).toMatch(/git\s+stash\s+apply|git\s+stash\s+pop|git\s+stash\s+drop/);

      // Layer 1: Core concepts - checkpoint states
      expect(template).toMatch(/BASELINE.*RESTORED.*RETRY|TERMINAL.*RESTORED/i);

      // Layer 1: Core concepts - retry budget and recovery
      expect(template).toMatch(/config\.optimization\.optRetries|optRetries/);
      expect(template).toMatch(/git\s+reset.*--hard/);
      expect(template).toMatch(/git\s+clean/);
      expect(template).toMatch(/cross.*platform.*recovery/i);
    }

    // Skill template mentions optimization and checkpoint concepts
    expect(getVerifyChangeSkillTemplate().instructions).toMatch(/checkpoint|optimization/i);
  });
});
