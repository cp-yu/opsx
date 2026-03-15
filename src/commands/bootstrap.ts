import ora from 'ora';
import chalk from 'chalk';
import {
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
  if (!mode) {
    return 'full';
  }

  if (mode === 'full' || mode === 'opsx-first') {
    return mode;
  }

  throw new Error(`Invalid bootstrap mode '${mode}'. Valid modes: full, opsx-first`);
}

export async function bootstrapInitCommand(options: BootstrapInitOptions): Promise<void> {
  const projectRoot = process.cwd();
  const mode = parseBootstrapMode(options.mode);
  const scope = options.scope ? options.scope.split(',').map(s => s.trim()) : undefined;

  const spinner = ora(`Initializing bootstrap workspace (mode: ${mode})...`).start();

  try {
    const metadata = await initBootstrap(projectRoot, { mode, scope });
    spinner.succeed(`Bootstrap workspace created at openspec/bootstrap/`);
    console.log(`  Phase: ${metadata.phase}`);
    console.log(`  Mode: ${metadata.mode}`);
    console.log();
    if (metadata.mode === 'opsx-first') {
      console.log('This mode writes formal OPSX only. Add specs later through normal change workflows.');
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

  const phaseIdx = BOOTSTRAP_PHASES.indexOf(status.phase);

  console.log(`Phase: ${status.phase} (${phaseIdx + 1}/${BOOTSTRAP_PHASES.length})`);
  console.log(`Baseline: ${status.baselineType}`);
  console.log(`Mode: ${status.mode}`);
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
    const instructions = getPhaseInstructions(targetPhase, status.mode, status.baselineType);

    if (options.json) {
      console.log(JSON.stringify({
        initialized: true,
        phase: targetPhase,
        currentPhase: status.phase,
        baselineType: status.baselineType,
        mode: status.mode,
        instruction: instructions,
      }, null, 2));
      return;
    }

    console.log(`## Bootstrap: ${targetPhase} phase`);
    console.log();
    console.log(instructions);
  } catch (error) {
    spinner?.stop();
    throw error;
  }
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

  if (status.baselineType === 'specs-only') {
    lines.push('', 'Bootstrap will preserve existing specs and add formal OPSX output aligned to them.');
  }

  if (status.baselineType === 'no-spec') {
    lines.push('', 'Use `full` to prepare both specs and OPSX starting artifacts.');
    lines.push('Use `opsx-first` to focus on formal OPSX now and add specs later through normal change workflows.');
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
  ? 'This mode prepares formal OPSX output first. Add specs incrementally later through normal change workflows.'
  : baselineType === 'specs-only'
    ? 'This mode preserves existing specs and adds formal OPSX output aligned to them.'
    : 'This mode prepares formal OPSX output and a starter openspec/specs/ structure for later spec work.'}
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
2. Review review.md — check each domain's boundaries, capabilities, code refs
3. Mark each domain checkbox as reviewed
4. If evidence or domain maps change, run validate again and re-approve the regenerated review

Low-confidence domains appear first for priority review.
When all checkboxes are checked, proceed to promote.`;

    case 'promote':
      return `Promote the candidate OPSX to formal project files.

Run: openspec bootstrap promote

This re-validates scan, map, and review gates before writing any formal OPSX files.
Successful promotion writes the three formal OPSX files and cleans up the bootstrap workspace.
${mode === 'opsx-first'
  ? 'Opsx-first writes only formal OPSX files. Add specs later through normal change workflows.'
  : baselineType === 'specs-only'
    ? 'Full mode preserves your existing specs and adds formal OPSX files aligned to them.'
    : 'Full mode also creates an openspec/specs starter so you can add behavior specs incrementally.'}`;
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
    console.log('This will write formal OPSX files and clean up the bootstrap workspace.');
    console.log('Run with -y to confirm, or use the /opsx:bootstrap skill.');
    return;
  }

  const spinner = ora('Promoting bootstrap to formal OPSX...').start();

  try {
    await promoteBootstrap(projectRoot);
    spinner.succeed('Bootstrap promoted to formal OPSX files');
    console.log('  Written: openspec/project.opsx.yaml');
    console.log('  Written: openspec/project.opsx.relations.yaml');
    console.log('  Written: openspec/project.opsx.code-map.yaml');
    console.log('  Cleaned: openspec/bootstrap/');
  } catch (error) {
    spinner.fail('Failed to promote bootstrap');
    throw error;
  }
}
