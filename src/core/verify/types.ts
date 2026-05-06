export type VerifyResultStatus = 'PASS' | 'PASS_WITH_WARNINGS' | 'FAIL_NEEDS_REMEDIATION';

export type OptimizationStatus =
  | 'SKIPPED'
  | 'NOT_NEEDED'
  | 'PENDING_VERIFICATION'
  | 'IMPROVED'
  | 'DEGRADED'
  | 'ABORTED_UNSAFE';

export type Phase2Type = 'optimization' | 'verification';

export type Phase2OptimizationInputStatus =
  | 'NO_OPTIMIZATION_NEEDED'
  | 'OPTIMIZATION_PROPOSED'
  | 'ABORTED_UNSAFE'
  | 'SKIPPED';

export interface VerifyIssue {
  severity: 'CRITICAL' | 'WARNING' | 'SUGGESTION' | string;
  message: string;
  requirement?: string;
  task?: string;
  recommendation?: string;
  evidence?: string[];
  [key: string]: unknown;
}

export interface Phase1Input {
  result: VerifyResultStatus;
  issues: VerifyIssue[];
  evidenceFiles: string[];
  executionMode?: string;
  gitDiffSummary?: string;
}

export interface Phase2OptimizationInput {
  status: Phase2OptimizationInputStatus;
  summary?: string;
  score?: string;
  attempts?: unknown[];
  [key: string]: unknown;
}

export interface Phase2VerificationInput {
  result: VerifyResultStatus;
  issues?: VerifyIssue[];
  summary?: string;
  behaviorRetryCounter?: number;
  [key: string]: unknown;
}

export type Phase2Input = Phase2OptimizationInput | Phase2VerificationInput;

export interface EvidenceFingerprint {
  hash: string;
  skippedFiles: string[];
  entries: Array<{
    path: string;
    mtimeMs: number;
    size: number;
  }>;
}

export interface VerificationContext {
  contractVersion: '1.0' | string;
  executionMode?: string;
  evidenceFiles: string[];
  evidenceFingerprint: string;
  skippedEvidenceFiles?: string[];
  gitHeadCommit?: string;
  gitDiffSummary?: string;
}

export interface OptimizationAttempt {
  timestamp: string;
  type: Phase2Type;
  status?: string;
  files?: string[];
  result?: VerifyResultStatus;
  summary?: string;
  behaviorRetryCounter?: number;
  [key: string]: unknown;
}

export interface VerifyOptimization {
  status: OptimizationStatus;
  score?: string;
  attempts: OptimizationAttempt[];
  affectedFileHashes?: Record<string, string>;
  failedDirections?: string[];
  baseline?: unknown;
  final?: unknown;
}

export interface VerifyResult {
  timestamp: string;
  result: VerifyResultStatus;
  issues: VerifyIssue[];
  tasksFileHash: string;
  verificationContext: VerificationContext;
  optimization?: VerifyOptimization;
}

export interface FreshnessResult {
  status: 'FRESH' | 'STALE' | 'MISSING';
  verifyResult?: VerifyResult;
  checks: {
    fileExists: boolean;
    tasksFileHash: boolean;
    evidenceFingerprint: boolean;
    contractVersion: boolean;
    gitHeadCommit: boolean;
    resultAcceptable: boolean;
  };
  details: string[];
}

export interface ArchiveCompatibility {
  compatible: boolean;
  blockReason?: 'PENDING_VERIFICATION' | 'ABORTED_UNSAFE' | 'INVALID_OPTIMIZATION_STATUS';
}

export interface SealReport {
  valid: boolean;
  sealHash?: string;
  errors: string[];
}

export interface ValidationResult<T> {
  valid: boolean;
  value?: T;
  errors: string[];
}
