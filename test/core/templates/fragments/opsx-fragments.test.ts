import { describe, expect, it } from 'vitest';

import {
  VERIFY_COORDINATOR_ROLE,
  VERIFY_CLI_JSON_SCHEMA_REFERENCE,
  VERIFY_ERROR_RECOVERY_GUIDE,
  VERIFY_SIMPLE_CHANGE_FAST_PATH,
  VERIFY_STATE_MACHINE_DIAGRAM,
  VERIFY_SUBAGENT_TIMEOUT_RULES,
} from '../../../../src/core/templates/fragments/opsx-fragments.js';

describe('verify gate shared fragments', () => {
  it('exports non-empty strings', () => {
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

  it('covers every verify CLI call input shape', () => {
    for (const token of [
      'phase1',
      'NO_OPTIMIZATION_NEEDED',
      'OPTIMIZATION_PROPOSED',
      'SKIPPED',
      '"result":"PASS"',
      'FAIL_NEEDS_REMEDIATION',
      'behaviorRetryCounter',
    ]) {
      expect(VERIFY_CLI_JSON_SCHEMA_REFERENCE).toContain(token);
    }
  });

  it('covers all terminal and archive gate states', () => {
    for (const token of [
      'SKIPPED',
      'NOT_NEEDED',
      'IMPROVED',
      'DEGRADED',
      'PENDING_VERIFICATION',
      'ABORTED_UNSAFE',
      'Archive gate accepts',
      'Archive gate rejects',
    ]) {
      expect(VERIFY_STATE_MACHINE_DIAGRAM).toContain(token);
    }
  });

  it('defines coordinator and subagent waiting contracts', () => {
    for (const token of [
      'Coordinator (top-level agent)',
      'Reviewer Subagent',
      'Optimizer Subagent',
      'CLI',
      'MUST NOT substitute your own completeness/correctness/coherence judgments',
    ]) {
      expect(VERIFY_COORDINATOR_ROLE).toContain(token);
    }

    for (const token of [
      '10 minute waiting budget',
      'complete subagent payload',
      'keep polling or waiting',
      'Never terminate a subagent without explicit user confirmation',
    ]) {
      expect(VERIFY_SUBAGENT_TIMEOUT_RULES).toContain(token);
    }
  });
});
