import { describe, expect, it } from 'vitest';
import {
  generateSealHash,
  validatePhase1Input,
  validatePhase2Input,
  validateVerifyResult,
} from '../../../src/core/verify/result-validator.js';
import type { VerifyResult } from '../../../src/core/verify/types.js';

describe('verify result validator', () => {
  const validResult: VerifyResult = {
    timestamp: '2026-05-01T00:00:00.000Z',
    result: 'PASS',
    issues: [],
    tasksFileHash: 'a'.repeat(64),
    verificationContext: {
      contractVersion: '1.0',
      evidenceFiles: ['src/a.ts'],
      evidenceFingerprint: 'b'.repeat(64),
    },
    optimization: {
      status: 'NOT_NEEDED',
      attempts: [],
    },
  };

  it('validates Phase 1 input', () => {
    expect(validatePhase1Input({
      result: 'PASS',
      issues: [],
      evidenceFiles: ['src/a.ts'],
    }).valid).toBe(true);

    const invalid = validatePhase1Input({ result: 'BAD', issues: 'nope' });
    expect(invalid.valid).toBe(false);
    expect(invalid.errors).toContain('result must be PASS, PASS_WITH_WARNINGS, or FAIL_NEEDS_REMEDIATION');
  });

  it('validates Phase 2 inputs by type', () => {
    expect(validatePhase2Input({ status: 'NO_OPTIMIZATION_NEEDED' }, 'optimization').valid).toBe(true);
    expect(validatePhase2Input({ status: 'OPTIMIZATION_PROPOSED' }, 'optimization').valid).toBe(true);
    expect(validatePhase2Input({ result: 'PASS', issues: [] }, 'verification').valid).toBe(true);

    expect(validatePhase2Input({ result: 'NOPE' }, 'verification').valid).toBe(false);
  });

  it('validates .verify-result.json shape and generates stable seal hashes', () => {
    expect(validateVerifyResult(validResult).valid).toBe(true);
    expect(validateVerifyResult({ ...validResult, tasksFileHash: 'bad' }).valid).toBe(false);

    const hash1 = generateSealHash(validResult);
    const hash2 = generateSealHash({
      ...validResult,
      verificationContext: { ...validResult.verificationContext },
    });
    expect(hash1).toMatch(/^[a-f0-9]{64}$/);
    expect(hash2).toBe(hash1);
  });
});
