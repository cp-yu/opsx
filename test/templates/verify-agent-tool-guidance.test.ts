import { describe, it, expect } from 'vitest';
import {
  createVerifyChangeSkillTemplateForExecutionModel,
  createOpsxVerifyCommandTemplateForExecutionModel,
} from '../../src/core/templates/workflows/verify-change.js';
import { SUBAGENT_VERIFY_EXECUTION_MODEL } from '../../src/core/templates/workflows/verify-execution-model.js';

describe('Verify workflow Agent tool guidance', () => {
  describe('Subagent execution model', () => {
    it('should explicitly mention using Agent tool in skill instructions', () => {
      const skill = createVerifyChangeSkillTemplateForExecutionModel(SUBAGENT_VERIFY_EXECUTION_MODEL);

      // Should mention Agent tool explicitly
      expect(skill.instructions).toContain('Agent tool');
      expect(skill.instructions).toContain('use the **Agent tool**');

      // Should NOT mention external wrappers
      expect(skill.instructions).not.toContain('codeagent-wrapper');
    });

    it('should mention Agent tool in command template', () => {
      const command = createOpsxVerifyCommandTemplateForExecutionModel(SUBAGENT_VERIFY_EXECUTION_MODEL);

      // Should mention using Agent tool
      expect(command.content).toContain('Agent tool');
      expect(command.content).toContain('Use the **Agent tool**');

      // Should emphasize not using external tools
      expect(command.content).toContain('MUST NOT use external wrapper');
    });

    it('should mention Agent tool in all three subagent invocation points', () => {
      const command = createOpsxVerifyCommandTemplateForExecutionModel(SUBAGENT_VERIFY_EXECUTION_MODEL);

      // Point 1: Phase 1 reviewer
      expect(command.content).toMatch(/\[Mode: Delegate Review\][\s\S]*Agent tool[\s\S]*openspec-reviewer/);

      // Point 2: Phase 2 optimizer
      expect(command.content).toMatch(/\[Mode: Optimize\][\s\S]*Agent tool[\s\S]*openspec-optimizer/);

      // Point 3: Speculative verification
      expect(command.content).toMatch(/\[Mode: Speculative Verify\][\s\S]*Agent tool[\s\S]*openspec-reviewer/);
    });

    it('should specify passing location inputs via subagent prompt', () => {
      const command = createOpsxVerifyCommandTemplateForExecutionModel(SUBAGENT_VERIFY_EXECUTION_MODEL);

      // Should mention passing inputs in prompt
      expect(command.content).toContain('in the subagent prompt');
      expect(command.content).toContain('changeName');
      expect(command.content).toContain('changeDir');
      expect(command.content).toContain('projectRoot');
    });

    it('should instruct coordinator not to substitute judgment', () => {
      const command = createOpsxVerifyCommandTemplateForExecutionModel(SUBAGENT_VERIFY_EXECUTION_MODEL);

      // Multiple assertions that coordinator delegates judgment
      expect(command.content).toContain('MUST NOT substitute');
      expect(command.content).toContain('completeness/correctness/coherence');

      // Should wait for payload before proceeding
      expect(command.content).toContain('Wait for the complete reviewer payload');
      expect(command.content).toContain('wait for the complete');
    });

    it('should maintain clean context principle', () => {
      const command = createOpsxVerifyCommandTemplateForExecutionModel(SUBAGENT_VERIFY_EXECUTION_MODEL);

      // Should emphasize clean context
      expect(command.content).toContain('clean-context');

      // Evidence mode should NOT read files
      expect(command.content).toMatch(/\[Mode: Evidence\][\s\S]*Do NOT read candidate implementation file/);
      expect(command.content).toMatch(/\[Mode: Evidence\][\s\S]*Do NOT run.*git status/);
    });
  });

  describe('Protocol summary', () => {
    it('should mention Agent tool in protocol steps', () => {
      const skill = createVerifyChangeSkillTemplateForExecutionModel(SUBAGENT_VERIFY_EXECUTION_MODEL);

      // Protocol section should reference Agent tool
      expect(skill.instructions).toMatch(/## Protocol[\s\S]*Agent tool/);
      expect(skill.instructions).toMatch(/use the \*\*Agent tool\*\*/);
    });
  });
});
