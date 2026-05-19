import { createHash } from 'crypto';
import type {
  Phase2Input,
  Phase2OptimizationInput,
  Phase2Type,
  Phase2VerificationInput,
  Phase1Input,
  ValidationResult,
  VerifyIssue,
  VerifyResult,
} from './types.js';

const PHASE1_RESULTS = new Set(['PASS', 'PASS_WITH_WARNINGS', 'FAIL_NEEDS_REMEDIATION']);
const OPTIMIZATION_INPUT_STATUSES = new Set([
  'NO_OPTIMIZATION_NEEDED',
  'OPTIMIZATION_PROPOSED',
  'ABORTED_UNSAFE',
  'SKIPPED',
]);
const OPTIMIZATION_STATUSES = new Set([
  'SKIPPED',
  'NOT_NEEDED',
  'PENDING_VERIFICATION',
  'IMPROVED',
  'DEGRADED',
  'ABORTED_UNSAFE',
]);

export function validatePhase1Input(input: unknown): ValidationResult<Phase1Input> {
  const errors: string[] = [];
  if (!isRecord(input)) {
    return { valid: false, errors: ['input must be a JSON object'] };
  }

  if (!PHASE1_RESULTS.has(String(input.result))) {
    errors.push('result must be PASS, PASS_WITH_WARNINGS, or FAIL_NEEDS_REMEDIATION');
  }
  if (!Array.isArray(input.issues)) {
    errors.push('issues must be an array');
  } else {
    errors.push(...validateIssues(input.issues, 'issues'));
  }
  if (!Array.isArray(input.evidenceFiles) || !input.evidenceFiles.every((item) => typeof item === 'string')) {
    errors.push('evidenceFiles must be an array of strings');
  }

  return finishValidation(input as unknown as Phase1Input, errors);
}

export function validatePhase2Input(
  input: unknown,
  type: Phase2Type
): ValidationResult<Phase2Input> {
  if (type === 'optimization') {
    return validateOptimizationInput(input);
  }
  return validateVerificationInput(input);
}

export function validateVerifyResult(result: unknown): ValidationResult<VerifyResult> {
  const errors: string[] = [];
  if (!isRecord(result)) {
    return { valid: false, errors: ['verify result must be a JSON object'] };
  }

  if (typeof result.timestamp !== 'string' || result.timestamp.length === 0) {
    errors.push('timestamp must be a non-empty string');
  }
  if (!PHASE1_RESULTS.has(String(result.result))) {
    errors.push('result must be PASS, PASS_WITH_WARNINGS, or FAIL_NEEDS_REMEDIATION');
  }
  if (!Array.isArray(result.issues)) {
    errors.push('issues must be an array');
  } else {
    errors.push(...validateIssues(result.issues, 'issues'));
  }
  if (typeof result.tasksFileHash !== 'string' || !/^[a-f0-9]{64}$/.test(result.tasksFileHash)) {
    errors.push('tasksFileHash must be a sha256 hex string');
  }

  const context = result.verificationContext;
  if (!isRecord(context)) {
    errors.push('verificationContext must be an object');
  } else {
    if (context.contractVersion !== '1.0') {
      errors.push('verificationContext.contractVersion must be "1.0"');
    }
    if (!Array.isArray(context.evidenceFiles) || !context.evidenceFiles.every((item) => typeof item === 'string')) {
      errors.push('verificationContext.evidenceFiles must be an array of strings');
    }
    if (typeof context.evidenceFingerprint !== 'string' || !/^[a-f0-9]{64}$/.test(context.evidenceFingerprint)) {
      errors.push('verificationContext.evidenceFingerprint must be a sha256 hex string');
    }
    if (
      context.evidenceFingerprintEntries !== undefined &&
      (!Array.isArray(context.evidenceFingerprintEntries) ||
        !context.evidenceFingerprintEntries.every(
          (entry) =>
            isRecord(entry) &&
            typeof entry.path === 'string' &&
            typeof entry.hash === 'string' &&
            /^[a-f0-9]{64}$/.test(entry.hash)
        ))
    ) {
      errors.push('verificationContext.evidenceFingerprintEntries must be an array of { path, hash }');
    }
  }

  if (result.optimization !== undefined) {
    const optimization = result.optimization;
    if (!isRecord(optimization)) {
      errors.push('optimization must be an object');
    } else {
      if (!OPTIMIZATION_STATUSES.has(String(optimization.status))) {
        errors.push('optimization.status is invalid');
      }
      if (!Array.isArray(optimization.attempts)) {
        errors.push('optimization.attempts must be an array');
      }
      if (
        optimization.failedDirections !== undefined &&
        (!Array.isArray(optimization.failedDirections) ||
          !optimization.failedDirections.every((item) => typeof item === 'string'))
      ) {
        errors.push('optimization.failedDirections must be an array of strings');
      }
      if (
        optimization.affectedFileHashes !== undefined &&
        (!isRecord(optimization.affectedFileHashes) ||
          !Object.values(optimization.affectedFileHashes).every(
            (value) => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value)
          ))
      ) {
        errors.push('optimization.affectedFileHashes must map paths to sha256 hex strings');
      }
    }
  }

  return finishValidation(result as unknown as VerifyResult, errors);
}

export function generateSealHash(result: VerifyResult): string {
  const copy = JSON.parse(JSON.stringify(result)) as Record<string, unknown>;
  delete copy.sealHash;
  return createHash('sha256').update(stableStringify(copy)).digest('hex');
}

function validateOptimizationInput(input: unknown): ValidationResult<Phase2OptimizationInput> {
  const errors: string[] = [];
  if (!isRecord(input)) {
    return { valid: false, errors: ['input must be a JSON object'] };
  }
  if (!OPTIMIZATION_INPUT_STATUSES.has(String(input.status))) {
    errors.push(
      'status must be NO_OPTIMIZATION_NEEDED, OPTIMIZATION_PROPOSED, ABORTED_UNSAFE, or SKIPPED'
    );
  }
  if (input.attempts !== undefined && !Array.isArray(input.attempts)) {
    errors.push('attempts must be an array when provided');
  }
  return finishValidation(input as Phase2OptimizationInput, errors);
}

function validateVerificationInput(input: unknown): ValidationResult<Phase2VerificationInput> {
  const errors: string[] = [];
  if (!isRecord(input)) {
    return { valid: false, errors: ['input must be a JSON object'] };
  }
  if (!PHASE1_RESULTS.has(String(input.result))) {
    errors.push('result must be PASS, PASS_WITH_WARNINGS, or FAIL_NEEDS_REMEDIATION');
  }
  if (input.issues !== undefined) {
    if (!Array.isArray(input.issues)) {
      errors.push('issues must be an array when provided');
    } else {
      errors.push(...validateIssues(input.issues, 'issues'));
    }
  }
  const behaviorRetryCounter = input.behaviorRetryCounter;
  if (
    behaviorRetryCounter !== undefined &&
    (typeof behaviorRetryCounter !== 'number' ||
      !Number.isInteger(behaviorRetryCounter) ||
      behaviorRetryCounter < 0)
  ) {
    errors.push('behaviorRetryCounter must be a non-negative integer');
  }
  return finishValidation(input as Phase2VerificationInput, errors);
}

function validateIssues(issues: unknown[], path: string): string[] {
  const errors: string[] = [];
  issues.forEach((issue, index) => {
    if (!isRecord(issue)) {
      errors.push(`${path}[${index}] must be an object`);
      return;
    }
    if (typeof issue.severity !== 'string' || issue.severity.length === 0) {
      errors.push(`${path}[${index}].severity must be a non-empty string`);
    }
    if (typeof issue.message !== 'string' || issue.message.length === 0) {
      errors.push(`${path}[${index}].message must be a non-empty string`);
    }
  });
  return errors;
}

function finishValidation<T>(value: T, errors: string[]): ValidationResult<T> {
  return errors.length === 0
    ? { valid: true, value, errors: [] }
    : { valid: false, errors };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }
  if (isRecord(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}
