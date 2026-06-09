import { promises as fs } from 'fs';
import path from 'path';
import {
  applyOpsxDelta,
  OPSX_PATHS,
  readOpsxDelta,
  readProjectOpsx,
  validateCodeMapIntegrity,
  validateReferentialIntegrity,
  writeProjectOpsx,
  type OpsxDeltaApplyResult,
  type ProjectOpsxBundle,
} from '../utils/opsx-utils.js';
import {
  buildUpdatedSpec,
  findSpecUpdates,
  isDeltaSpecAlreadyApplied,
  type SpecUpdate,
} from './specs-apply.js';
import { refreshVerifyEvidenceAfterSync } from './verify/freshness.js';
import { Validator } from './validation/validator.js';
import { extractRequirementsSection, parseDeltaSpec } from './parsers/requirement-blocks.js';

type SpecCounts = { added: number; modified: number; removed: number; renamed: number };

export interface ChangeSyncState {
  changeName: string;
  changeDir: string;
  specUpdates: SpecUpdate[];
  hasDeltaSpecs: boolean;
  hasOpsxDelta: boolean;
  requiresSync: boolean;
}

interface PreparedSpecWrite {
  update: SpecUpdate;
  rebuilt: string;
  counts: SpecCounts;
  originalContent: string | null;
  action: 'write' | 'delete';
}

interface PreparedOpsxWrite {
  originalBundle: ProjectOpsxBundle;
  mergedBundle: ProjectOpsxBundle;
  result: OpsxDeltaApplyResult;
}

export interface PreparedChangeSync {
  state: ChangeSyncState;
  specs: {
    writes: PreparedSpecWrite[];
    totals: SpecCounts;
  };
  opsx: PreparedOpsxWrite | null;
}

export interface AppliedChangeSyncSummary {
  specs: 'no-delta' | 'synced';
  opsx: 'no-delta' | 'synced';
  files: string[];
}

export interface PendingChangeSync {
  specs: number;
  opsx: boolean;
}

export async function assessChangeSyncState(
  projectRoot: string,
  changeName: string
): Promise<ChangeSyncState> {
  const changeDir = path.join(projectRoot, 'openspec', 'changes', changeName);
  const mainSpecsDir = path.join(projectRoot, 'openspec', 'specs');
  const specUpdates = await findSpecUpdates(changeDir, mainSpecsDir);
  const opsxDeltaPath = path.join(changeDir, 'opsx-delta.yaml');

  let hasOpsxDelta = false;
  try {
    await fs.access(opsxDeltaPath);
    hasOpsxDelta = true;
  } catch {
    hasOpsxDelta = false;
  }

  return {
    changeName,
    changeDir,
    specUpdates,
    hasDeltaSpecs: specUpdates.length > 0,
    hasOpsxDelta,
    requiresSync: specUpdates.length > 0 || hasOpsxDelta,
  };
}

export async function getPendingChangeSync(
  projectRoot: string,
  state: ChangeSyncState
): Promise<PendingChangeSync> {
  let pendingSpecs = 0;

  for (const update of state.specUpdates) {
    const changeContent = await fs.readFile(update.source, 'utf-8');
    const originalContent = await readOptionalFile(update.target);
    if (
      originalContent !== null &&
      isDeltaSpecAlreadyApplied(changeContent, originalContent)
    ) {
      continue;
    }
    if (originalContent === null && isRemovalOnlyDelta(changeContent)) {
      continue;
    }
    pendingSpecs += 1;
  }

  let pendingOpsx = false;
  if (state.hasOpsxDelta) {
    const originalBundle = await readProjectOpsx(projectRoot);
    const delta = await readOpsxDelta(projectRoot, state.changeName);
    pendingOpsx = !originalBundle || !delta || applyOpsxDelta(originalBundle, delta).changed;
  }

  return { specs: pendingSpecs, opsx: pendingOpsx };
}

export async function prepareChangeSync(
  projectRoot: string,
  state: ChangeSyncState,
  options: { skipValidation?: boolean } = {}
): Promise<PreparedChangeSync> {
  const writes: PreparedSpecWrite[] = [];
  const totals: SpecCounts = { added: 0, modified: 0, removed: 0, renamed: 0 };
  const validator = options.skipValidation ? null : new Validator();

  for (const update of state.specUpdates) {
    const changeContent = await fs.readFile(update.source, 'utf-8');
    const originalContent = await readOptionalFile(update.target);
    if (
      originalContent !== null &&
      isDeltaSpecAlreadyApplied(changeContent, originalContent)
    ) {
      continue;
    }

    const built = await buildUpdatedSpec(update, state.changeName, projectRoot);
    const action = shouldDeleteRebuiltSpec(built.rebuilt) ? 'delete' : 'write';
    if (validator) {
      const specName = path.basename(path.dirname(update.target));
      if (action === 'write') {
        const report = await validator.validateSpecContent(specName, built.rebuilt);
        if (!report.valid) {
          const errors = report.issues
            .filter((issue) => issue.level === 'ERROR')
            .map((issue) => `  ✗ ${issue.message}`)
            .join('\n');
          throw new Error(`Validation errors in rebuilt spec for ${specName}:\n${errors}`);
        }
      }
    }

    writes.push({
      update,
      rebuilt: built.rebuilt,
      counts: built.counts,
      originalContent,
      action,
    });

    totals.added += built.counts.added;
    totals.modified += built.counts.modified;
    totals.removed += built.counts.removed;
    totals.renamed += built.counts.renamed;
  }

  let opsx: PreparedOpsxWrite | null = null;
  if (state.hasOpsxDelta) {
    const originalBundle = await readProjectOpsx(projectRoot);
    if (!originalBundle) {
      throw new Error(
        `Cannot apply opsx-delta for change '${state.changeName}': openspec/project.opsx.yaml not found.`
      );
    }

    const delta = await readOpsxDelta(projectRoot, state.changeName);
    if (!delta) {
      throw new Error(`opsx-delta.yaml disappeared while preparing change '${state.changeName}'.`);
    }

    const result = applyOpsxDelta(originalBundle, delta);
    if (!result.changed) {
      return {
        state,
        specs: { writes, totals },
        opsx: null,
      };
    }
    const referentialIntegrity = validateReferentialIntegrity(result.bundle);
    if (!referentialIntegrity.valid) {
      throw new Error(
        `OPSX referential integrity validation failed:\n${referentialIntegrity.errors
          .map((error) => `  ✗ ${error}`)
          .join('\n')}`
      );
    }

    const codeMapIntegrity = validateCodeMapIntegrity(result.bundle);
    if (!codeMapIntegrity.valid) {
      throw new Error(
        `OPSX code-map integrity validation failed:\n${codeMapIntegrity.errors
          .map((error) => `  ✗ ${error}`)
          .join('\n')}`
      );
    }

    opsx = {
      originalBundle,
      mergedBundle: result.bundle,
      result,
    };
  }

  return {
    state,
    specs: { writes, totals },
    opsx,
  };
}

export async function applyPreparedChangeSync(
  projectRoot: string,
  prepared: PreparedChangeSync,
  options: { silent?: boolean } = {}
): Promise<AppliedChangeSyncSummary> {
  const silent = options.silent ?? false;
  const syncedFiles: string[] = [];

  if (prepared.opsx) {
    await writeProjectOpsx(projectRoot, prepared.opsx.mergedBundle);
    syncedFiles.push(OPSX_PATHS.PROJECT_FILE, OPSX_PATHS.RELATIONS_FILE, OPSX_PATHS.CODE_MAP_FILE);
    if (!silent) {
      console.log(formatOpsxSummary(prepared.opsx.result));
      console.log('OPSX updated successfully.');
    }
  }

  try {
    if (prepared.specs.writes.length > 0) {
      await writePreparedSpecs(prepared.specs.writes, silent);
      syncedFiles.push(
        ...prepared.specs.writes.map((write) => toPosixProjectRelative(projectRoot, write.update.target))
      );
      if (!silent) {
        console.log(
          `Totals: + ${prepared.specs.totals.added}, ~ ${prepared.specs.totals.modified}, - ${prepared.specs.totals.removed}, → ${prepared.specs.totals.renamed}`
        );
        console.log('Specs updated successfully.');
      }
    }
  } catch (error) {
    if (prepared.opsx) {
      await writeProjectOpsx(projectRoot, prepared.opsx.originalBundle).catch(() => undefined);
    }
    throw error;
  }

  await refreshVerifyEvidenceAfterSync(prepared.state.changeDir, projectRoot, syncedFiles);

  return {
    specs: prepared.specs.writes.length > 0 ? 'synced' : 'no-delta',
    opsx: prepared.opsx ? 'synced' : 'no-delta',
    files: syncedFiles,
  };
}

async function readOptionalFile(filePath: string): Promise<string | null> {
  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch (error: any) {
    if (error?.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

async function writePreparedSpecs(writes: PreparedSpecWrite[], silent: boolean): Promise<void> {
  const applied: PreparedSpecWrite[] = [];

  try {
    for (const write of writes) {
      if (write.action === 'delete') {
        await fs.rm(write.update.target, { force: true });
      } else {
        await fs.mkdir(path.dirname(write.update.target), { recursive: true });
        await fs.writeFile(write.update.target, write.rebuilt, 'utf-8');
      }
      applied.push(write);

      if (!silent) {
        const specName = path.basename(path.dirname(write.update.target));
        console.log(`Applying changes to openspec/specs/${specName}/spec.md:`);
        if (write.counts.added) console.log(`  + ${write.counts.added} added`);
        if (write.counts.modified) console.log(`  ~ ${write.counts.modified} modified`);
        if (write.counts.removed) console.log(`  - ${write.counts.removed} removed`);
        if (write.counts.renamed) console.log(`  → ${write.counts.renamed} renamed`);
      }
    }
  } catch (error) {
    for (const write of applied.reverse()) {
      if (write.originalContent === null) {
        await fs.rm(write.update.target, { force: true }).catch(() => undefined);
        continue;
      }
      await fs.writeFile(write.update.target, write.originalContent, 'utf-8').catch(() => undefined);
    }
    throw error;
  }
}

function shouldDeleteRebuiltSpec(content: string): boolean {
  return extractRequirementsSection(content).bodyBlocks.length === 0;
}

function isRemovalOnlyDelta(content: string): boolean {
  const plan = parseDeltaSpec(content);
  return plan.removed.length > 0 &&
    plan.added.length === 0 &&
    plan.modified.length === 0 &&
    plan.renamed.length === 0;
}

function formatOpsxSummary(result: OpsxDeltaApplyResult): string {
  const nodeAdded = result.counts.added.domains + result.counts.added.capabilities;
  const nodeModified = result.counts.modified.domains + result.counts.modified.capabilities;
  const nodeRemoved = result.counts.removed.domains + result.counts.removed.capabilities;

  return `OPSX delta applied: + ${nodeAdded} nodes, ~ ${nodeModified} nodes, - ${nodeRemoved} nodes; + ${result.counts.added.relations} relations, ~ ${result.counts.modified.relations} relations, - ${result.counts.removed.relations} relations.`;
}

function toPosixProjectRelative(projectRoot: string, filePath: string): string {
  return path.relative(projectRoot, filePath).split(path.sep).join('/');
}
