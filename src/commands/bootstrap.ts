import ora from 'ora';
import chalk from 'chalk';
import {
  getBootstrapPreInitStatus,
  getAllowedBootstrapModes,
  initBootstrap,
  getBootstrapStatus,
  validateGate,
  refreshBootstrapDerivedArtifacts,
  promoteBootstrap,
  readBootstrapState,
  advancePhase,
  BOOTSTRAP_PHASES,
  type BootstrapPhase,
  type BootstrapMode,
  type BootstrapStatus,
} from '../utils/bootstrap-utils.js';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface BootstrapInitOptions {
  mode?: string;
  scope?: string;
  restart?: boolean;
}

export interface BootstrapStatusOptions {
  json?: boolean;
}

export interface BootstrapInstructionsOptions {
  phase?: string;
  json?: boolean;
}

export interface BootstrapValidateOptions {
  json?: boolean;
}

export interface BootstrapPromoteOptions {
  yes?: boolean;
}

// ─── Init ────────────────────────────────────────────────────────────────────

function parseBootstrapMode(mode: string | undefined): BootstrapMode {
  if (mode === 'full' || mode === 'opsx-first' || mode === 'refresh') {
    return mode;
  }

  throw new Error(`Invalid bootstrap mode '${mode}'. Valid modes: full, opsx-first, refresh`);
}

async function resolveBootstrapMode(
  projectRoot: string,
  requestedMode: string | undefined
): Promise<BootstrapMode> {
  if (requestedMode) {
    return parseBootstrapMode(requestedMode);
  }

  const preInitStatus = await getBootstrapPreInitStatus(projectRoot);
  if (!preInitStatus.supported) {
    throw new Error(preInitStatus.reason);
  }

  const allowedModes = getAllowedBootstrapModes(preInitStatus.baselineType);
  const isTTY = Boolean((process.stdout as NodeJS.WriteStream & { isTTY?: boolean }).isTTY);
  if (!isTTY) {
    throw new Error(
      `Missing required option --mode in non-interactive mode. Valid modes: ${allowedModes.join(', ')}`
    );
  }

  const { select } = await import('@inquirer/prompts');
  return select({
    message: 'Select bootstrap mode',
    choices: allowedModes.map((mode) => ({ name: mode, value: mode })),
  });
}

export async function bootstrapInitCommand(options: BootstrapInitOptions): Promise<void> {
  const projectRoot = process.cwd();
  const mode = await resolveBootstrapMode(projectRoot, options.mode);
  const scope = options.scope ? options.scope.split(',').map(s => s.trim()) : undefined;

  const spinner = ora(`${options.restart ? 'Restarting' : 'Initializing'} bootstrap workspace (mode: ${mode})...`).start();

  try {
    const result = await initBootstrap(projectRoot, { mode, scope, restart: options.restart });
    const metadata = result.metadata;
    spinner.succeed(`Bootstrap workspace ${result.restarted ? 'restarted' : 'created'} at openspec/bootstrap/`);
    console.log(`  Phase: ${metadata.phase}`);
    console.log(`  Mode: ${metadata.mode}`);
    if (result.historyPath) {
      console.log(`  Previous workspace snapshot: ${result.historyPath}`);
    }
    console.log();
    if (metadata.mode === 'opsx-first') {
      console.log('This mode writes the formal OPSX bundle plus a README-only specs starter. Add behavior specs later through normal change workflows.');
      console.log();
    } else if (metadata.mode === 'refresh') {
      console.log('Refresh mode treats the current formal OPSX bundle as the baseline and rebuilds only reviewed deltas.');
      console.log('Git diff only narrows scan scope; it does not replace the existing formal OPSX bundle as source of truth.');
      console.log();
    } else if (metadata.baseline_type === 'raw') {
      console.log('Full mode will generate the formal OPSX bundle plus complete valid candidate specs for each capability.');
      console.log();
    }
    if (result.restarted) {
      console.log('This run starts fresh from init while retaining the previous workspace as audit history.');
      console.log();
    }
    console.log('Next: Run the scan phase to discover domains.');
    console.log('  Use /opsx:bootstrap or openspec bootstrap instructions scan');
  } catch (error) {
    spinner.fail(`Failed to initialize bootstrap`);
    throw error;
  }
}

// ─── Status ──────────────────────────────────────────────────────────────────

export async function bootstrapStatusCommand(options: BootstrapStatusOptions): Promise<void> {
  const projectRoot = process.cwd();
  const spinner = options.json ? null : ora('Loading bootstrap status...').start();

  try {
    const status = await getBootstrapStatus(projectRoot);
    spinner?.stop();

    if (options.json) {
      console.log(JSON.stringify(status, null, 2));
      return;
    }

    printBootstrapStatus(status);
  } catch (error) {
    spinner?.stop();
    throw error;
  }
}

function printBootstrapStatus(status: BootstrapStatus): void {
  console.log('Bootstrap: openspec');

  if (!status.initialized) {
    console.log('Initialized: no');
    console.log(`Baseline: ${status.baselineType}`);
    console.log(`Supported: ${status.supported ? 'yes' : 'no'}`);
    console.log(`Allowed modes: ${status.allowedModes.length > 0 ? status.allowedModes.join(', ') : '(none)'}`);
    console.log(`Reason: ${status.reason}`);
    if (status.nextAction === 'init' && status.allowedModes.length > 0) {
      console.log();
      console.log(`Next: openspec bootstrap init --mode ${status.allowedModes[0]}`);
    }
    return;
  }

  console.log(`Workspace: ${status.workspaceState}`);
  const phaseIdx = BOOTSTRAP_PHASES.indexOf(status.phase);
  console.log(`Baseline: ${status.baselineType}`);
  console.log(`Mode: ${status.mode}`);
  if (status.workspaceState === 'completed') {
    console.log(`Completed at: ${status.completedAt ?? 'legacy retained workspace'}`);
    if (status.restartCommand) {
      console.log();
      console.log(`Next: ${status.restartCommand}`);
      console.log('Restart snapshots the retained workspace into openspec/bootstrap-history/ before creating a fresh openspec/bootstrap/.');
    }
    return;
  }

  console.log(`Phase: ${status.phase} (${phaseIdx + 1}/${BOOTSTRAP_PHASES.length})`);
  console.log(`Candidate: ${status.candidateState}`);
  console.log(`Review: ${status.reviewState}${status.reviewApproved ? ' (approved)' : ''}`);

  if (status.totalDomains > 0) {
    console.log(`Domains: ${status.mappedDomains}/${status.totalDomains} mapped`);
    console.log();

    for (const dom of status.domains) {
      const indicator = dom.reviewed
        ? chalk.green('[x]')
        : dom.mapped
          ? chalk.yellow('[~]')
          : chalk.red('[ ]');

      const capText = dom.mapped ? `${dom.capabilityCount} capabilities` : 'discovered, unmapped';
      console.log(`  ${indicator} ${dom.id}  ${capText}  confidence: ${dom.confidence}`);
    }
  } else if (phaseIdx < BOOTSTRAP_PHASES.indexOf('scan')) {
    console.log();
    console.log('No domains discovered yet. Run scan phase next.');
  }
}

// ─── Instructions ────────────────────────────────────────────────────────────

export async function bootstrapInstructionsCommand(
  phase: string | undefined,
  options: BootstrapInstructionsOptions
): Promise<void> {
  const projectRoot = process.cwd();
  const spinner = options.json ? null : ora('Loading bootstrap instructions...').start();

  try {
    const requestedPhase = (phase ?? 'init') as BootstrapPhase;

    if (!BOOTSTRAP_PHASES.includes(requestedPhase)) {
      spinner?.stop();
      throw new Error(`Invalid phase '${requestedPhase}'. Valid phases: ${BOOTSTRAP_PHASES.join(', ')}`);
    }

    const status = await getBootstrapStatus(projectRoot);
    spinner?.stop();

    if (!status.initialized) {
      const instructions = getPreInitInstructions(status, requestedPhase);

      if (options.json) {
        console.log(JSON.stringify({
          initialized: false,
          phase: 'init',
          requestedPhase,
          currentPhase: null,
          baselineType: status.baselineType,
          supported: status.supported,
          allowedModes: status.allowedModes,
          nextAction: status.nextAction,
          reason: status.reason,
          instruction: instructions,
        }, null, 2));
        return;
      }

      console.log('## Bootstrap: init phase');
      console.log();
      console.log(instructions);
      return;
    }

    const targetPhase = (phase ?? status.phase) as BootstrapPhase;
    const instructions = status.workspaceState === 'completed'
      ? getCompletedWorkspaceInstructions(status)
      : getPhaseInstructions(targetPhase, status.mode, status.baselineType);

    if (options.json) {
      console.log(JSON.stringify({
        initialized: true,
        phase: targetPhase,
        currentPhase: status.phase,
        baselineType: status.baselineType,
        mode: status.mode,
        workspaceState: status.workspaceState,
        completedAt: status.completedAt,
        restartCommand: status.restartCommand,
        nextAction: status.nextAction,
        instruction: instructions,
      }, null, 2));
      return;
    }

    console.log(status.workspaceState === 'completed'
      ? '## Bootstrap: completed workspace'
      : `## Bootstrap: ${targetPhase} phase`);
    console.log();
    console.log(instructions);
  } catch (error) {
    spinner?.stop();
    throw error;
  }
}

function getCompletedWorkspaceInstructions(status: Extract<BootstrapStatus, { initialized: true }>): string {
  const lines = [
    'The retained bootstrap workspace belongs to a completed run.',
    '',
    `Baseline: ${status.baselineType}`,
    `Mode: ${status.mode}`,
  ];

  if (status.completedAt) {
    lines.push(`Completed at: ${status.completedAt}`);
  } else {
    lines.push('Completed at: legacy retained workspace (inferred)');
  }

  if (status.restartCommand) {
    lines.push('', `Run: ${status.restartCommand}`);
    lines.push('Restart moves the current openspec/bootstrap/ into openspec/bootstrap-history/ and creates a fresh workspace from init.');
    lines.push('Use the retained snapshot for audit or diff; do not delete openspec/bootstrap/ as the normal restart path.');
  } else {
    lines.push('', 'The current repository baseline does not expose a supported restart mode.');
  }

  return lines.join('\n');
}

function getPreInitInstructions(status: Extract<BootstrapStatus, { initialized: false }>, requestedPhase: BootstrapPhase): string {
  const lines = [
    'Initialize the bootstrap workspace.',
    '',
    `Detected baseline: ${status.baselineType}`,
    status.reason,
  ];

  if (!status.supported) {
    lines.push('', 'Bootstrap cannot start on this repository baseline.');
    return lines.join('\n');
  }

  if (requestedPhase !== 'init') {
    lines.push('', `The requested phase '${requestedPhase}' is unavailable before initialization. Start with init first.`);
  }

  lines.push('', `Allowed modes: ${status.allowedModes.join(', ')}`);
  lines.push(`Run: openspec bootstrap init --mode ${status.allowedModes[0]}`);

  if (status.baselineType === 'specs-based') {
    lines.push('', 'Bootstrap will preserve existing specs, add missing capability specs, and fail fast on target-path conflicts.');
  }

  if (status.baselineType === 'formal-opsx') {
    lines.push('', 'Refresh preserves the current formal OPSX bundle as the baseline.');
    lines.push('Git diff is used only to narrow the scan scope when a prior refresh anchor is available.');
    lines.push('Promotion merges reviewed deltas back into the formal OPSX bundle instead of overwriting it wholesale.');
  }

  if (status.baselineType === 'raw') {
    lines.push('', 'Use `full` to prepare the formal OPSX bundle plus complete valid specs for each mapped capability.');
    lines.push('Use `opsx-first` to prepare the formal OPSX bundle plus a README-only specs starter, then add behavior specs later through normal change workflows.');
  }

  return lines.join('\n');
}

function getPhaseInstructions(
  phase: BootstrapPhase,
  mode: BootstrapMode,
  baselineType: Extract<BootstrapStatus, { initialized: true }>['baselineType']
): string {
  switch (phase) {
    case 'init':
      return `Initialize the bootstrap workspace.

Run: openspec bootstrap init --mode ${mode}

This creates the workspace at openspec/bootstrap/ with scope configuration.
${mode === 'opsx-first'
  ? 'This mode prepares the formal OPSX bundle plus a README-only specs starter. Add behavior specs incrementally later through normal change workflows.'
  : mode === 'refresh'
    ? 'This mode treats the current formal OPSX bundle as the source-of-truth baseline, uses git diff only to narrow scan scope when possible, and prepares delta-first review/promote outputs.'
  : baselineType === 'specs-based'
    ? 'This mode preserves existing specs, adds missing capability specs, and fails fast if a generated target path already exists.'
    : 'This mode prepares the formal OPSX bundle plus complete valid candidate specs for each mapped capability.'}
After init, advance to scan: the agent will analyze the codebase for domain candidates.`;

    case 'scan':
      return `Scan the codebase to discover candidate domains.

1. Read package.json, README, and OpenSpec config for project context
2. Inspect openspec/specs/ for existing domain/capability evidence
3. Scan source code for structural boundaries (directories, modules, entrypoints)
4. Write evidence.yaml with candidate domains, confidence levels, and sources

Each domain entry should have:
- id: dom.<area> (e.g., dom.auth, dom.cli)
- confidence: high | medium | low
- sources: evidence trail (spec:<path>, code:<path>)
- intent: one-sentence domain description

Prefer fewer domains with solid evidence over exhaustive noise.
${mode === 'refresh'
  ? '\nFor refresh, treat the existing formal OPSX bundle and current specs as the baseline. If git is available, use diff only to narrow the scan scope; fall back to a full scan when the diff cannot be mapped confidently.'
  : ''}
After writing evidence.yaml, run: openspec bootstrap validate`;

    case 'map':
      return `Map capabilities, relations, and code references per domain.

For each domain in evidence.yaml, create domain-map/<domain-id>.yaml:
- domain: the domain node definition
- capabilities: list of cap.<domain>.<action> entries
- relations: contains/depends_on relationships
- code_refs: file paths and line ranges for each node

This phase is incremental — map one domain at a time.
Run: openspec bootstrap status to see per-domain progress.
After mapping all domains, run: openspec bootstrap validate`;

    case 'review':
      return `Review the mapped architecture before promotion.

1. Run: openspec bootstrap validate (regenerates candidate files and review.md from current evidence.yaml + domain-map/*.yaml)
2. Review review.md — check each domain's boundaries, capabilities, code refs${mode === 'refresh' ? ', and the delta against the current formal OPSX baseline' : ''}
3. Mark each domain checkbox as reviewed
4. If evidence or domain maps change, run validate again and re-approve the regenerated review

Low-confidence domains appear first for priority review.
When all checkboxes are checked, proceed to promote.`;

    case 'promote':
      return `Promote the candidate OPSX to formal project files.

Run: openspec bootstrap promote

This re-validates scan, map, and review gates before writing any formal OPSX files.
Successful promotion writes the three formal OPSX files and retains the bootstrap workspace as audit history.
${mode === 'opsx-first'
  ? 'Opsx-first writes the formal OPSX bundle plus only openspec/specs/README.md.'
  : mode === 'refresh'
    ? 'Refresh merges the reviewed delta back into the existing formal OPSX bundle, preserves existing specs, adds only missing specs for newly added capabilities, and fails fast on spec-path conflicts.'
    : baselineType === 'specs-based'
    ? 'Full mode preserves your existing specs, adds only missing capability specs, and fails fast on target-path conflicts.'
    : 'Full mode writes the formal OPSX bundle and one validated spec file per mapped capability.'}
After a completed retained workspace, start the next refresh run with: openspec bootstrap init --mode refresh --restart`;
  }
}

// ─── Validate ────────────────────────────────────────────────────────────────

export async function bootstrapValidateCommand(options: BootstrapValidateOptions): Promise<void> {
  const projectRoot = process.cwd();
  const spinner = options.json ? null : ora('Validating bootstrap...').start();

  try {
    const state = await readBootstrapState(projectRoot);
    const phase = state.metadata.phase;
    const results: Array<{ gate: string; passed: boolean; errors: string[] }> = [];

    // Validate gates based on current phase
    if (BOOTSTRAP_PHASES.indexOf(phase) >= BOOTSTRAP_PHASES.indexOf('scan')) {
      const r = await validateGate(projectRoot, 'scan_to_map');
      results.push({ gate: 'scan_to_map', ...r });
    }
    if (BOOTSTRAP_PHASES.indexOf(phase) >= BOOTSTRAP_PHASES.indexOf('map')) {
      const r = await validateGate(projectRoot, 'map_to_review');
      results.push({ gate: 'map_to_review', ...r });
    }
    if (BOOTSTRAP_PHASES.indexOf(phase) >= BOOTSTRAP_PHASES.indexOf('review')) {
      await refreshBootstrapDerivedArtifacts(projectRoot);
      const r = await validateGate(projectRoot, 'review_to_promote');
      results.push({ gate: 'review_to_promote', ...r });
    }

    spinner?.stop();

    if (options.json) {
      console.log(JSON.stringify({ phase, results }, null, 2));
      return;
    }

    console.log(`Bootstrap phase: ${phase}`);
    console.log();

    let allPassed = true;
    for (const r of results) {
      const icon = r.passed ? chalk.green('✓') : chalk.red('✗');
      console.log(`${icon} ${r.gate}`);
      if (!r.passed) {
        allPassed = false;
        for (const err of r.errors) {
          console.log(`  ${chalk.red('•')} ${err}`);
        }
      }
    }

    if (results.length === 0) {
      console.log('No gates to validate at current phase.');
    }

    // Auto-advance phase if next gate passes
    if (allPassed && results.length > 0) {
      const nextPhaseIdx = BOOTSTRAP_PHASES.indexOf(phase) + 1;
      if (nextPhaseIdx < BOOTSTRAP_PHASES.length) {
        const nextPhase = BOOTSTRAP_PHASES[nextPhaseIdx];
        try {
          await advancePhase(projectRoot, nextPhase);
          console.log();
          console.log(chalk.green(`Phase advanced to: ${nextPhase}`));
        } catch { /* already at or past this phase */ }
      }
    }

    if (!allPassed) {
      process.exitCode = 1;
    }
  } catch (error) {
    spinner?.stop();
    throw error;
  }
}

// ─── Promote ─────────────────────────────────────────────────────────────────

export async function bootstrapPromoteCommand(options: BootstrapPromoteOptions): Promise<void> {
  const projectRoot = process.cwd();

  if (!options.yes) {
    console.log('This will write formal OPSX files and retain the bootstrap workspace as audit history.');
    console.log('Run with -y to confirm, or use the /opsx:bootstrap skill.');
    return;
  }

  const spinner = ora('Promoting bootstrap to formal OPSX...').start();

  try {
    const result = await promoteBootstrap(projectRoot);
    spinner.succeed('Bootstrap promoted to formal OPSX files');
    console.log('  Written: openspec/project.opsx.yaml');
    console.log('  Written: openspec/project.opsx.relations.yaml');
    console.log('  Written: openspec/project.opsx.code-map.yaml');
    console.log(`  ${result.retainedWorkspaceNotice}`);
  } catch (error) {
    spinner.fail('Failed to promote bootstrap');
    throw error;
  }
}
