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
      expect(template).toContain(VERIFY_CLI_JSON_SCHEMA_REFERENCE);
      expect(template).toContain(VERIFY_ERROR_RECOVERY_GUIDE);
      expect(template).toContain(VERIFY_STATE_MACHINE_DIAGRAM);
    }
  });
});
