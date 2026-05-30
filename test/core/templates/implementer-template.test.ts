import { describe, expect, it } from 'vitest';

import { getImplementerSkillTemplate } from '../../../src/core/templates/workflows/implementer.js';

describe('implementer template', () => {
  it('documents step file input, ordered TDD execution, checkpoints, and status output', () => {
    const template = getImplementerSkillTemplate().instructions;

    expect(template).toContain('stepFile');
    expect(template).toContain('cheapest available model');
    expect(template).toContain('Do not use a capable model such as Opus unless the user or project configuration explicitly overrides the default');
    expect(template).toContain('.apply-steps/task-N-<name>.md file');
    expect(template).toContain('Parse TDD Cycle sections in order');
    expect(template).toContain('Step 1: Write Failing Test');
    expect(template).toContain('Step 2: Run Test (Verify Fails)');
    expect(template).toContain('Step 3: Implement Minimal Code');
    expect(template).toContain('Step 4: Run Test (Verify Passes)');
    expect(template).toContain('Step 5: Commit');
    expect(template).toContain('Step 2 MUST fail');
    expect(template).toContain('Checkpoint failed: test should fail but passed.');
    expect(template).toContain('Step 4 MUST pass');
    expect(template).toContain('DONE | BLOCKED | NEEDS_CONTEXT | DONE_WITH_CONCERNS');
  });

  it('documents structured recovery feedback for blocker statuses', () => {
    const template = getImplementerSkillTemplate().instructions;

    expect(template).toContain('Recovery Feedback Contract');
    expect(template).toContain('BLOCKED and NEEDS_CONTEXT are recovery feedback to the master agent');
    expect(template).toContain('"task": "task identifier"');
    expect(template).toContain('"cycle": "cycle identifier"');
    expect(template).toContain('"step": "step identifier"');
    expect(template).toContain('"command": "command when applicable"');
    expect(template).toContain('"failureKind": "checkpoint_failed | command_failed | ambiguous_instruction | missing_input | git_failed | other"');
    expect(template).toContain('"errorSummary": "stable concise summary for signature comparison"');
    expect(template).toContain('normalized error signature');
  });
});
