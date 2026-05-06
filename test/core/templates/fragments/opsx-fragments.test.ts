import { describe, expect, it } from 'vitest';

import {
  VERIFY_CLI_JSON_SCHEMA_REFERENCE,
  VERIFY_ERROR_RECOVERY_GUIDE,
  VERIFY_SIMPLE_CHANGE_FAST_PATH,
  VERIFY_STATE_MACHINE_DIAGRAM,
} from '../../../../src/core/templates/fragments/opsx-fragments.js';

describe('verify gate shared fragments', () => {
  it('exports non-empty strings', () => {
    for (const fragment of [
      VERIFY_STATE_MACHINE_DIAGRAM,
      VERIFY_CLI_JSON_SCHEMA_REFERENCE,
      VERIFY_ERROR_RECOVERY_GUIDE,
      VERIFY_SIMPLE_CHANGE_FAST_PATH,
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
});
