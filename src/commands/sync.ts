import { promises as fs } from 'fs';
import path from 'path';
import type { Command } from 'commander';
import ora from 'ora';
import { selectActiveChange } from '../core/change-utils.js';
import {
  assessChangeSyncState,
  applyPreparedChangeSync,
  prepareChangeSync,
} from '../core/change-sync.js';
import {
  checkArchiveCompatibility,
  checkFreshness,
  formatVerifyGateFailure,
} from '../core/verify/freshness.js';
import { validateChangeExists } from './workflow/shared.js';

export interface SyncOptions {
  noValidate?: boolean;
  validate?: boolean;
  noVerify?: boolean;
  verify?: boolean;
}

export async function syncCommand(
  changeName?: string,
  options: SyncOptions = {}
): Promise<void> {
  const projectRoot = process.cwd();
  const changesDir = path.join(projectRoot, 'openspec', 'changes');

  try {
    await fs.access(changesDir);
  } catch {
    throw new Error("No OpenSpec changes directory found. Run 'openspec init' first.");
  }

  if (!changeName) {
    const selectedChange = await selectActiveChange(changesDir, {
      message: 'Select a change to sync',
    });
    if (!selectedChange) {
      console.log('No change selected. Aborting.');
      return;
    }
    changeName = selectedChange;
  }

  const validatedChangeName = await validateChangeExists(changeName, projectRoot);
  const skipValidation = options.validate === false || options.noValidate === true;
  const skipVerify = options.verify === false || options.noVerify === true;
  if (!skipVerify) {
    const changeDir = path.join(projectRoot, 'openspec', 'changes', validatedChangeName);
    const freshness = await checkFreshness(changeDir, projectRoot);
    const compatibility = freshness.verifyResult
      ? checkArchiveCompatibility(freshness.verifyResult)
      : undefined;
    if (freshness.status !== 'FRESH' || !compatibility?.compatible) {
      throw new Error(
        formatVerifyGateFailure(freshness, compatibility, {
          changeName: validatedChangeName,
          command: 'sync',
        })
      );
    }
  }

  const syncState = await assessChangeSyncState(projectRoot, validatedChangeName);

  if (!syncState.requiresSync) {
    console.log('No sync required.');
    return;
  }

  const prepared = await prepareChangeSync(projectRoot, syncState, { skipValidation });
  if (prepared.specs.writes.length === 0 && !prepared.opsx) {
    console.log('No sync required.');
    return;
  }

  const summary = await applyPreparedChangeSync(projectRoot, prepared);
  console.log(`Sync complete for '${validatedChangeName}'.`);
  console.log(`specs: ${summary.specs}`);
  console.log(`opsx: ${summary.opsx}`);
}

export function registerSyncCommand(program: Command): void {
  program
    .command('sync [change-name]')
    .description('Sync a change into main specs and OPSX files without archiving')
    .option('--no-validate', 'Skip validation while preparing sync output')
    .option('--no-verify', 'Skip verify gate before syncing')
    .action(async (changeName?: string, options: SyncOptions = {}) => {
      try {
        await syncCommand(changeName, options);
      } catch (error) {
        console.log();
        ora().fail(`Error: ${(error as Error).message}`);
        process.exit(1);
      }
    });
}
