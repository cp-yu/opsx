import { execFile } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { promisify } from 'util';
import type { Command } from 'commander';
import { readProjectConfig } from '../core/project-config.js';
import {
  checkArchiveCompatibility,
  checkFreshness,
  computeEvidenceFingerprint,
  computeTasksFileHash,
  formatVerifyGateFailure,
  hashFiles,
  readVerifyResult,
} from '../core/verify/freshness.js';
import {
  generateSealHash,
  validatePhase1Input,
  validatePhase2Input,
  validateVerifyResult,
} from '../core/verify/result-validator.js';
import type {
  Phase2OptimizationInput,
  Phase2Type,
  Phase2VerificationInput,
  VerifyOptimization,
  VerifyResult,
} from '../core/verify/types.js';
import { validateChangeExists } from './workflow/shared.js';

const execFileAsync = promisify(execFile);
const PHASE1_PASS_RESULTS = new Set(['PASS', 'PASS_WITH_WARNINGS']);

interface VerifyCommandOptions {
  input?: string;
  json?: boolean;
  type?: Phase2Type;
  files?: string;
}

export function registerVerifyCommand(program: Command): void {
  const verify = program
    .command('verify')
    .description('Programmatic verify gates for changes');

  verify
    .command('phase1 <change-name>')
    .description('Accept and persist a canonical Phase 1 verify result')
    .option('--input <json>', 'JSON payload; falls back to stdin when omitted')
    .option('--json', 'Output as JSON')
    .action(async (changeName: string, options: VerifyCommandOptions) => {
      await runWithExitCode(() => verifyPhase1(changeName, options));
    });

  verify
    .command('phase2 <change-name>')
    .description('Run the Phase 2 optimization/verification gate')
    .requiredOption('--type <type>', 'optimization|verification')
    .option('--files <paths>', 'Comma-separated files affected by optimization')
    .option('--input <json>', 'JSON payload; falls back to stdin when omitted')
    .option('--json', 'Output as JSON')
    .action(async (changeName: string, options: VerifyCommandOptions) => {
      await runWithExitCode(() => verifyPhase2(changeName, options));
    });

  verify
    .command('seal <change-name>')
    .description('Validate .verify-result.json and print a seal hash')
    .option('--json', 'Output as JSON')
    .action(async (changeName: string, options: VerifyCommandOptions) => {
      await runWithExitCode(() => verifySeal(changeName, options));
    });

  verify
    .command('status <change-name>')
    .description('Check verify freshness and archive compatibility')
    .option('--json', 'Output as JSON')
    .action(async (changeName: string, options: VerifyCommandOptions) => {
      await runWithExitCode(() => verifyStatus(changeName, options));
    });
}

async function verifyPhase1(changeName: string, options: VerifyCommandOptions): Promise<number> {
  const projectRoot = process.cwd();
  const changeDir = await getChangeDir(changeName, projectRoot);
  const tasksPath = path.join(changeDir, 'tasks.md');
  const tasksContent = await readOptionalText(tasksPath);
  if (!tasksContent || !/- \[[ xX]\]/.test(tasksContent)) {
    writeOutput(
      options,
      { ok: false, warning: 'tasks.md is missing or contains no checkbox tasks' },
      'Warning: tasks.md is missing or contains no checkbox tasks'
    );
    return 1;
  }

  const inputResult = await parseJsonInput(options.input);
  if (!inputResult.ok) {
    writeOutput(options, { ok: false, errors: [inputResult.error] }, inputResult.error);
    return 2;
  }
  const parsedInput = inputResult.value;
  const validation = validatePhase1Input(parsedInput);
  if (!validation.valid || !validation.value) {
    writeOutput(options, { ok: false, errors: validation.errors }, validation.errors.join('\n'));
    return 2;
  }

  const tasksFileHash = await computeTasksFileHash(tasksPath);
  if (!tasksFileHash) {
    writeOutput(options, { ok: false, warning: 'tasks.md is missing' }, 'Warning: tasks.md is missing');
    return 1;
  }
  const evidence = await computeEvidenceFingerprint(validation.value.evidenceFiles, projectRoot);
  const result: VerifyResult = {
    timestamp: new Date().toISOString(),
    result: validation.value.result,
    issues: validation.value.issues,
    tasksFileHash,
    verificationContext: {
      contractVersion: '1.0',
      executionMode: validation.value.executionMode,
      evidenceFiles: [...validation.value.evidenceFiles].sort(),
      evidenceFingerprint: evidence.hash,
      skippedEvidenceFiles: evidence.skippedFiles,
      gitHeadCommit: await getGitHead(projectRoot),
      gitDiffSummary: validation.value.gitDiffSummary,
    },
  };
  if (PHASE1_PASS_RESULTS.has(result.result)) {
    result.optimization = {
      status: 'PENDING_VERIFICATION',
      attempts: [],
      baseline: phase1Baseline(result),
    };
  }

  await writeVerifyResult(changeDir, result);
  const nextStep = result.result === 'FAIL_NEEDS_REMEDIATION'
    ? '修复 CRITICAL issues'
    : '进入 Phase 2';
  writeOutput(options, { ok: true, nextStep, result }, nextStep);
  return 0;
}

async function verifyPhase2(changeName: string, options: VerifyCommandOptions): Promise<number> {
  const projectRoot = process.cwd();
  const changeDir = await getChangeDir(changeName, projectRoot);
  const phase2Type = normalizePhase2Type(options.type);
  const current = await readRequiredVerifyResult(changeDir);
  if (!PHASE1_PASS_RESULTS.has(current.result)) {
    writeOutput(options, { ok: false, reason: 'Phase 1 result is not PASS/PASS_WITH_WARNINGS' }, 'Phase 2 skipped: Phase 1 result is not PASS/PASS_WITH_WARNINGS');
    return 1;
  }
  const inputResult = await parseJsonInput(options.input);
  if (!inputResult.ok) {
    writeOutput(options, { ok: false, errors: [inputResult.error] }, inputResult.error);
    return 2;
  }
  const parsedInput = inputResult.value;
  const validation = validatePhase2Input(parsedInput, phase2Type);
  if (!validation.valid || !validation.value) {
    writeOutput(options, { ok: false, errors: validation.errors }, validation.errors.join('\n'));
    return 2;
  }
  if (
    readProjectConfig(projectRoot)?.optimization?.enabled === false &&
    !(phase2Type === 'optimization' && (validation.value as Phase2OptimizationInput).status === 'SKIPPED')
  ) {
    writeOutput(options, { ok: false, reason: 'optimization.enabled is false' }, 'Phase 2 skipped: optimization.enabled is false');
    return 1;
  }

  if (phase2Type === 'optimization') {
    return handleOptimization(changeDir, projectRoot, current, validation.value as Phase2OptimizationInput, options);
  }
  return handleVerification(changeDir, projectRoot, current, validation.value as Phase2VerificationInput, options);
}

async function verifySeal(changeName: string, options: VerifyCommandOptions): Promise<number> {
  const projectRoot = process.cwd();
  const changeDir = await getChangeDir(changeName, projectRoot);
  const result = await readRequiredVerifyResult(changeDir);
  const validation = validateVerifyResult(result);
  const errors = [...validation.errors];
  if (result.optimization?.status === 'PENDING_VERIFICATION') {
    errors.push('optimization.status must be terminal before seal');
  }
  if (errors.length > 0) {
    writeOutput(options, { valid: false, errors }, errors.join('\n'));
    return 1;
  }
  const sealHash = generateSealHash(result);
  writeOutput(options, { valid: true, sealHash }, `sealHash: ${sealHash}`);
  return 0;
}

async function verifyStatus(changeName: string, options: VerifyCommandOptions): Promise<number> {
  const projectRoot = process.cwd();
  const changeDir = await getChangeDir(changeName, projectRoot);
  const freshness = await checkFreshness(changeDir, projectRoot);
  const archiveCompatibility = freshness.verifyResult
    ? checkArchiveCompatibility(freshness.verifyResult)
    : undefined;
  const ok = freshness.status === 'FRESH' && (archiveCompatibility?.compatible ?? false);
  writeOutput(
    options,
    { ok, freshness, archiveCompatibility },
    ok ? 'Verify gate passed.' : formatVerifyGateFailure(freshness, archiveCompatibility)
  );
  return ok ? 0 : 1;
}

async function handleOptimization(
  changeDir: string,
  projectRoot: string,
  current: VerifyResult,
  input: Phase2OptimizationInput,
  options: VerifyCommandOptions
): Promise<number> {
  const existingStatus = current.optimization?.status;
  if (existingStatus === 'ABORTED_UNSAFE') {
    writeOutput(options, { ok: false, reason: 'ABORTED_UNSAFE' }, 'Phase 2 recovery is unsafe. Restore the workspace before retrying');
    return 1;
  }
  if (existingStatus === 'PENDING_VERIFICATION' && current.optimization?.affectedFileHashes) {
    writeOutput(options, { ok: false, reason: 'PENDING_VERIFICATION' }, '检测到未完成的 Phase 2 验证。请先完成验证或重置');
    return 1;
  }
  if (existingStatus && existingStatus !== 'PENDING_VERIFICATION') {
    writeOutput(options, { ok: false, reason: 'PHASE2_DONE' }, 'Phase 2 已完成');
    return 1;
  }

  const attempts = [...(current.optimization?.attempts ?? []), {
    timestamp: new Date().toISOString(),
    type: 'optimization' as const,
    status: input.status,
    summary: input.summary,
  }];

  if (input.status === 'NO_OPTIMIZATION_NEEDED') {
    if (!input.summary?.trim()) {
      writeOutput(options, { ok: false, reason: 'OPTIMIZER_REQUIRED' }, 'NO_OPTIMIZATION_NEEDED requires a non-empty summary from the optimizer subagent');
      return 1;
    }
    current.optimization = { status: 'NOT_NEEDED', attempts, baseline: phase1Baseline(current) };
    await writeVerifyResult(changeDir, current);
    writeOutput(options, { ok: true, result: current }, 'Phase 2 完成 (无需优化)。可进入 sync/archive');
    return 0;
  }
  if (input.status === 'SKIPPED') {
    current.optimization = { status: 'SKIPPED', attempts, baseline: phase1Baseline(current) };
    await writeVerifyResult(changeDir, current);
    writeOutput(options, { ok: true, result: current }, 'Phase 2 skipped. 可进入 sync/archive');
    return 0;
  }
  if (input.status === 'ABORTED_UNSAFE') {
    current.optimization = { status: 'ABORTED_UNSAFE', attempts, baseline: phase1Baseline(current), final: input };
    await writeVerifyResult(changeDir, current);
    writeOutput(options, { ok: true, result: current }, 'Phase 2 aborted unsafe. 请恢复工作区后重试');
    return 0;
  }

  const files = parseFiles(options.files);
  if (files.length === 0) {
    writeOutput(options, { ok: false, reason: 'FILES_REQUIRED' }, '--files is required when status is OPTIMIZATION_PROPOSED');
    return 2;
  }
  const affectedFileHashes = await hashFiles(files, projectRoot);
  const normalizedFiles = Object.keys(affectedFileHashes).sort();
  attempts[attempts.length - 1].files = normalizedFiles;
  const failedDirections = current.optimization?.failedDirections;
  current.optimization = {
    status: 'PENDING_VERIFICATION',
    attempts,
    affectedFileHashes,
    ...(failedDirections ? { failedDirections } : {}),
    baseline: phase1Baseline(current),
  };
  await writeVerifyResult(changeDir, current);
  writeOutput(options, { ok: true, result: current }, '优化建议已记录。下一步: 应用 Search/Replace 块 + P1_SPECULATIVE_FENCE subagent 验证，然后调用 phase2 --type=verification');
  return 0;
}

async function handleVerification(
  changeDir: string,
  projectRoot: string,
  current: VerifyResult,
  input: Phase2VerificationInput,
  options: VerifyCommandOptions
): Promise<number> {
  if (current.optimization?.status !== 'PENDING_VERIFICATION') {
    writeOutput(options, { ok: false, reason: 'OPTIMIZATION_REQUIRED' }, '尚未提交优化结果，请先调用 phase2 --type=optimization');
    return 1;
  }

  const unchanged = await findUnchangedOptimizationFiles(current.optimization, projectRoot);
  if (unchanged.length > 0) {
    writeOutput(
      options,
      { ok: false, reason: 'PATCH_NOT_APPLIED', unchanged },
      '检测到优化 patch 未应用，请先应用 Search/Replace 块再重试'
    );
    return 1;
  }

  const behaviorRetryCounter =
    input.behaviorRetryCounter ?? countFailedVerificationAttempts(current.optimization) + 1;
  current.optimization.attempts.push({
    timestamp: new Date().toISOString(),
    type: 'verification',
    result: input.result,
    summary: input.summary,
    behaviorRetryCounter,
  });

  if (input.result === 'PASS' || input.result === 'PASS_WITH_WARNINGS') {
    current.optimization.status = 'IMPROVED';
    current.optimization.final = input;
    await writeVerifyResult(changeDir, current);
    writeOutput(options, { ok: true, result: current }, 'Phase 2 完成 (优化+验证通过)。可进入 sync/archive');
    return 0;
  }

  const optRetries = readProjectConfig(projectRoot)?.optimization?.optRetries ?? 2;

  // 记录失败方向，避免跨会话重复尝试
  const lastOptAttempt = current.optimization.attempts
    .filter((a) => a.type === 'optimization')
    .at(-1);
  const failedDirection = input.summary ?? lastOptAttempt?.summary ?? '未记录优化方向';
  current.optimization.failedDirections = [
    ...(current.optimization.failedDirections ?? []),
    failedDirection,
  ];

  if (behaviorRetryCounter >= optRetries) {
    current.optimization.status = 'DEGRADED';
    current.optimization.final = input;
    current.result = 'PASS_WITH_WARNINGS';
    await writeVerifyResult(changeDir, current);
    writeOutput(options, { ok: true, result: current }, `Phase 2: ${optRetries}次优化尝试已安全回滚。可进入 sync/archive`);
    return 0;
  }

  delete current.optimization.affectedFileHashes;
  await writeVerifyResult(changeDir, current);
  writeOutput(options, { ok: true, result: current }, `推测性验证失败 (尝试 ${behaviorRetryCounter}/${optRetries})。请用不同策略重试优化`);
  return 0;
}

async function getChangeDir(changeName: string, projectRoot: string): Promise<string> {
  const validated = await validateChangeExists(changeName, projectRoot);
  return path.join(projectRoot, 'openspec', 'changes', validated);
}

async function readRequiredVerifyResult(changeDir: string): Promise<VerifyResult> {
  const result = await readVerifyResult(changeDir);
  if (!result) {
    throw new Error('.verify-result.json is missing. Run openspec verify phase1 first.');
  }
  return result;
}

async function writeVerifyResult(changeDir: string, result: VerifyResult): Promise<void> {
  await fs.writeFile(
    path.join(changeDir, '.verify-result.json'),
    `${JSON.stringify(result, null, 2)}\n`,
    'utf-8'
  );
}

async function parseJsonInput(input?: string): Promise<{ ok: true; value: unknown } | { ok: false; error: string }> {
  try {
    return { ok: true, value: await parseInput(input) };
  } catch (error) {
    return { ok: false, error: `Invalid JSON input: ${(error as Error).message}` };
  }
}

async function parseInput(input?: string): Promise<unknown> {
  const raw = input ?? await readStdinIfAvailable();
  if (!raw) {
    return {};
  }
  return JSON.parse(raw);
}

async function readStdinIfAvailable(): Promise<string> {
  if (process.stdin.isTTY) {
    return '';
  }
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
  }
  return Buffer.concat(chunks).toString('utf-8').trim();
}

async function readOptionalText(filePath: string): Promise<string | null> {
  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch (error: any) {
    if (error?.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

async function getGitHead(projectRoot: string): Promise<string | undefined> {
  try {
    const { stdout } = await execFileAsync('git', ['rev-parse', 'HEAD'], { cwd: projectRoot });
    return stdout.trim() || undefined;
  } catch {
    return undefined;
  }
}

function normalizePhase2Type(type?: string): Phase2Type {
  if (type === 'optimization' || type === 'verification') {
    return type;
  }
  throw new Error('--type must be optimization or verification');
}

function parseFiles(files?: string): string[] {
  return (files ?? '')
    .split(',')
    .map((file) => file.trim())
    .filter(Boolean);
}

async function findUnchangedOptimizationFiles(
  optimization: VerifyOptimization,
  projectRoot: string
): Promise<string[]> {
  const previous = optimization.affectedFileHashes ?? {};
  const files = Object.keys(previous);
  if (files.length === 0) {
    return [];
  }
  const current = await hashFiles(files, projectRoot);
  return files.filter((file) => current[file] === previous[file]);
}

function countFailedVerificationAttempts(optimization: VerifyOptimization): number {
  return optimization.attempts.filter(
    (attempt) => attempt.type === 'verification' && attempt.result === 'FAIL_NEEDS_REMEDIATION'
  ).length;
}

function phase1Baseline(result: VerifyResult): Omit<VerifyResult, 'optimization'> {
  const { optimization: _optimization, ...baseline } = result;
  return baseline;
}

function writeOutput(options: VerifyCommandOptions, jsonValue: unknown, text: string): void {
  if (options.json) {
    console.log(JSON.stringify(jsonValue, null, 2));
    return;
  }
  console.log(text);
}

async function runWithExitCode(handler: () => Promise<number>): Promise<void> {
  try {
    const code = await handler();
    if (code !== 0) {
      process.exitCode = code;
    }
  } catch (error) {
    console.error(`Error: ${(error as Error).message}`);
    process.exitCode = 1;
  }
}
