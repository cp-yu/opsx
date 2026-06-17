/**
 * Init Command
 *
 * Sets up OpenSpec with Agent Skills and /opsx:* slash commands.
 * This is the unified setup command that replaces both the old init and experimental commands.
 */

import path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import * as fs from 'fs';
import { createRequire } from 'module';
import { FileSystemUtils } from '../utils/file-system.js';
import {
  renderWorkflowInvocation,
} from '../utils/command-references.js';
import {
  AI_TOOLS,
  OPENSPEC_DIR_NAME,
  AIToolOption,
} from './config.js';
import { PALETTE } from './styles/palette.js';
import { isInteractive } from '../utils/interactive.js';
import { serializeConfig } from './config-prompts.js';
import { readProjectConfig } from './project-config.js';
import {
  detectLegacyArtifacts,
  cleanupLegacyArtifacts,
  formatCleanupSummary,
  formatDetectionSummary,
  type LegacyDetectionResult,
} from './legacy-cleanup.js';
import {
  getToolsWithSkillsDir,
  getToolStates,
  type ToolSkillStatus,
} from './shared/index.js';
import { type WorkflowId } from './workflow-surface.js';
import { WorkflowManifestRegistry } from './templates/manifest/index.js';
import { getAvailableTools } from './available-tools.js';
import { migrateIfNeeded } from './migration.js';
import {
  createWorkflowArtifactPlan,
} from './workflow-installation.js';
import { isMap, parseDocument } from 'yaml';
import { ArtifactSyncEngine } from './templates/sync-engine.js';

const require = createRequire(import.meta.url);
const { version: OPENSPEC_VERSION } = require('../../package.json');

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const DEFAULT_SCHEMA = 'spec-driven';

const PROGRESS_SPINNER = {
  interval: 80,
  frames: ['░░░', '▒░░', '▒▒░', '▒▒▒', '▓▒▒', '▓▓▒', '▓▓▓', '▒▓▓', '░▒▓'],
};

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

type InitCommandOptions = {
  tools?: string;
  force?: boolean;
  interactive?: boolean;
};

// -----------------------------------------------------------------------------
// Init Command Class
// -----------------------------------------------------------------------------

export class InitCommand {
  private readonly toolsArg?: string;
  private readonly force: boolean;
  private readonly interactiveOption?: boolean;

  constructor(options: InitCommandOptions = {}) {
    this.toolsArg = options.tools;
    this.force = options.force ?? false;
    this.interactiveOption = options.interactive;
  }

  async execute(targetPath: string): Promise<void> {
    const projectPath = path.resolve(targetPath);
    const openspecDir = OPENSPEC_DIR_NAME;
    const openspecPath = path.join(projectPath, openspecDir);

    // Validation happens silently in the background
    const extendMode = await this.validate(projectPath, openspecPath);

    // Check for legacy artifacts and handle cleanup
    await this.handleLegacyCleanup(projectPath, extendMode);

    // Detect available tools in the project (task 7.1)
    const detectedTools = getAvailableTools(projectPath);

    // Migration check: migrate existing projects to profile system (task 7.3)
    if (extendMode) {
      migrateIfNeeded(projectPath, detectedTools);
    }

    // Show animated welcome screen (interactive mode only)
    const canPrompt = this.canPromptInteractively();
    if (canPrompt) {
      const { showWelcomeScreen } = await import('../ui/welcome-screen.js');
      await showWelcomeScreen();
    }

    // Validate profile override early so invalid values fail before tool setup.
    // The resolved value is consumed later when generation reads effective config.
    const proseLanguage = await this.promptForProseLanguage(projectPath);

    // Get tool states before processing
    const toolStates = getToolStates(projectPath);

    // Get tool selection (pass detected tools for pre-selection)
    const selectedToolIds = await this.getSelectedTools(toolStates, extendMode, detectedTools, projectPath);

    // Validate selected tools
    const validatedTools = this.validateTools(selectedToolIds, toolStates);

    // Create directory structure and config
    await this.createDirectoryStructure(openspecPath, extendMode);

    // Generate OPSX skeleton files on first-time init (non-extend mode)
    if (!extendMode) {
      await this.writeOpsxSkeleton(projectPath, openspecPath);
    }

    // Generate skills and commands for each tool
    const results = await this.generateSkillsAndCommands(projectPath, validatedTools);

    // Create config.yaml if needed
    const configStatus = await this.createConfig(openspecPath, proseLanguage);

    // Display success message
    this.displaySuccessMessage(projectPath, validatedTools, results, configStatus, extendMode, proseLanguage);
  }

  // ═══════════════════════════════════════════════════════════
  // VALIDATION & SETUP
  // ═══════════════════════════════════════════════════════════

  private async validate(
    projectPath: string,
    openspecPath: string
  ): Promise<boolean> {
    const extendMode = await FileSystemUtils.directoryExists(openspecPath);

    // Check write permissions
    if (!(await FileSystemUtils.ensureWritePermissions(projectPath))) {
      throw new Error(`Insufficient permissions to write to ${projectPath}`);
    }
    return extendMode;
  }

  private canPromptInteractively(): boolean {
    if (this.interactiveOption === false) return false;
    if (this.toolsArg !== undefined) return false;
    return isInteractive({ interactive: this.interactiveOption });
  }

  // ═══════════════════════════════════════════════════════════
  // LEGACY CLEANUP
  // ═══════════════════════════════════════════════════════════

  private async handleLegacyCleanup(projectPath: string, extendMode: boolean): Promise<void> {
    // Detect legacy artifacts
    const detection = await detectLegacyArtifacts(projectPath);

    if (!detection.hasLegacyArtifacts) {
      return; // No legacy artifacts found
    }

    // Show what was detected
    console.log();
    console.log(formatDetectionSummary(detection));
    console.log();

    const canPrompt = this.canPromptInteractively();

    if (this.force || !canPrompt) {
      // --force flag or non-interactive mode: proceed with cleanup automatically.
      // Legacy slash commands are 100% OpenSpec-managed, and config file cleanup
      // only removes markers (never deletes files), so auto-cleanup is safe.
      await this.performLegacyCleanup(projectPath, detection);
      return;
    }

    // Interactive mode: prompt for confirmation
    const { confirm } = await import('@inquirer/prompts');
    const shouldCleanup = await confirm({
      message: 'Upgrade and clean up legacy files?',
      default: true,
    });

    if (!shouldCleanup) {
      console.log(chalk.dim('Initialization cancelled.'));
      console.log(chalk.dim('Run with --force to skip this prompt, or manually remove legacy files.'));
      process.exit(0);
    }

    await this.performLegacyCleanup(projectPath, detection);
  }

  private async performLegacyCleanup(projectPath: string, detection: LegacyDetectionResult): Promise<void> {
    const spinner = ora('Cleaning up legacy files...').start();

    const result = await cleanupLegacyArtifacts(projectPath, detection);

    spinner.succeed('Legacy files cleaned up');

    const summary = formatCleanupSummary(result);
    if (summary) {
      console.log();
      console.log(summary);
    }

    console.log();
  }

  // ═══════════════════════════════════════════════════════════
  // TOOL SELECTION
  // ═══════════════════════════════════════════════════════════

  private async getSelectedTools(
    toolStates: Map<string, ToolSkillStatus>,
    extendMode: boolean,
    detectedTools: AIToolOption[],
    projectPath: string
  ): Promise<string[]> {
    // Check for --tools flag first
    const nonInteractiveSelection = this.resolveToolsArg();
    if (nonInteractiveSelection !== null) {
      return nonInteractiveSelection;
    }

    const validTools = getToolsWithSkillsDir();
    const detectedToolIds = new Set(detectedTools.map((t) => t.value));
    const configuredToolIds = new Set(
      [...toolStates.entries()]
        .filter(([, status]) => status.configured)
        .map(([toolId]) => toolId)
    );
    const shouldPreselectDetected = !extendMode && configuredToolIds.size === 0;
    const canPrompt = this.canPromptInteractively();

    // Non-interactive mode: use detected tools as fallback (task 7.8)
    if (!canPrompt) {
      if (detectedToolIds.size > 0) {
        return [...detectedToolIds];
      }
      throw new Error(
        `No tools detected and no --tools flag provided. Valid tools:\n  ${validTools.join('\n  ')}\n\nUse --tools all, --tools none, or --tools claude,cursor,...`
      );
    }

    if (validTools.length === 0) {
      throw new Error(
        `No tools available for skill generation.`
      );
    }

    // Interactive mode: show searchable multi-select
    const { searchableMultiSelect } = await import('../prompts/searchable-multi-select.js');

    // Build choices: pre-select configured tools; keep detected tools visible but unselected.
    const sortedChoices = validTools
      .map((toolId) => {
        const tool = AI_TOOLS.find((t) => t.value === toolId);
        const status = toolStates.get(toolId);
        const configured = status?.configured ?? false;
        const detected = detectedToolIds.has(toolId);

        return {
          name: tool?.name || toolId,
          value: toolId,
          configured,
          detected: detected && !configured,
          preSelected: configured || (shouldPreselectDetected && detected && !configured),
        };
      })
      .sort((a, b) => {
        // Configured tools first, then detected (not configured), then everything else.
        if (a.configured && !b.configured) return -1;
        if (!a.configured && b.configured) return 1;
        if (a.detected && !b.detected) return -1;
        if (!a.detected && b.detected) return 1;
        return 0;
      });

    const configuredNames = validTools
      .filter((toolId) => configuredToolIds.has(toolId))
      .map((toolId) => AI_TOOLS.find((t) => t.value === toolId)?.name || toolId);

    if (configuredNames.length > 0) {
      console.log(`OpenSpec configured: ${configuredNames.join(', ')} (pre-selected)`);
    }

    const detectedOnlyNames = detectedTools
      .filter((tool) => !configuredToolIds.has(tool.value))
      .map((tool) => tool.name);

    if (detectedOnlyNames.length > 0) {
      const detectionLabel = shouldPreselectDetected
        ? 'pre-selected for first-time setup'
        : 'not pre-selected';
      console.log(`Detected tool directories: ${detectedOnlyNames.join(', ')} (${detectionLabel})`);
    }

    const selectedTools = await searchableMultiSelect({
      message: `Select tools to set up (${validTools.length} available)`,
      pageSize: 15,
      choices: sortedChoices,
      validate: (selected: string[]) => selected.length > 0 || 'Select at least one tool',
    });

    if (selectedTools.length === 0) {
      throw new Error('At least one tool must be selected');
    }

    return selectedTools;
  }

  private resolveToolsArg(): string[] | null {
    if (typeof this.toolsArg === 'undefined') {
      return null;
    }

    const raw = this.toolsArg.trim();
    if (raw.length === 0) {
      throw new Error(
        'The --tools option requires a value. Use "all", "none", or a comma-separated list of tool IDs.'
      );
    }

    const availableTools = getToolsWithSkillsDir();
    const availableSet = new Set(availableTools);
    const availableList = ['all', 'none', ...availableTools].join(', ');

    const lowerRaw = raw.toLowerCase();
    if (lowerRaw === 'all') {
      return availableTools;
    }

    if (lowerRaw === 'none') {
      return [];
    }

    const tokens = raw
      .split(',')
      .map((token) => token.trim())
      .filter((token) => token.length > 0);

    if (tokens.length === 0) {
      throw new Error(
        'The --tools option requires at least one tool ID when not using "all" or "none".'
      );
    }

    const normalizedTokens = tokens.map((token) => token.toLowerCase());

    if (normalizedTokens.some((token) => token === 'all' || token === 'none')) {
      throw new Error('Cannot combine reserved values "all" or "none" with specific tool IDs.');
    }

    const invalidTokens = tokens.filter(
      (_token, index) => !availableSet.has(normalizedTokens[index])
    );

    if (invalidTokens.length > 0) {
      throw new Error(
        `Invalid tool(s): ${invalidTokens.join(', ')}. Available values: ${availableList}`
      );
    }

    // Deduplicate while preserving order
    const deduped: string[] = [];
    for (const token of normalizedTokens) {
      if (!deduped.includes(token)) {
        deduped.push(token);
      }
    }

    return deduped;
  }

  private validateTools(
    toolIds: string[],
    toolStates: Map<string, ToolSkillStatus>
  ): Array<{ value: string; name: string; skillsDir: string; wasConfigured: boolean }> {
    const validatedTools: Array<{ value: string; name: string; skillsDir: string; wasConfigured: boolean }> = [];

    for (const toolId of toolIds) {
      const tool = AI_TOOLS.find((t) => t.value === toolId);
      if (!tool) {
        const validToolIds = getToolsWithSkillsDir();
        throw new Error(
          `Unknown tool '${toolId}'. Valid tools:\n  ${validToolIds.join('\n  ')}`
        );
      }

      if (!tool.skillsDir) {
        const validToolsWithSkills = getToolsWithSkillsDir();
        throw new Error(
          `Tool '${toolId}' does not support skill generation.\nTools with skill generation support:\n  ${validToolsWithSkills.join('\n  ')}`
        );
      }

      const preState = toolStates.get(tool.value);
      validatedTools.push({
        value: tool.value,
        name: tool.name,
        skillsDir: tool.skillsDir,
        wasConfigured: preState?.configured ?? false,
      });
    }

    return validatedTools;
  }

  // ═══════════════════════════════════════════════════════════
  // DIRECTORY STRUCTURE
  // ═══════════════════════════════════════════════════════════

  private async createDirectoryStructure(openspecPath: string, extendMode: boolean): Promise<void> {
    if (extendMode) {
      // In extend mode, just ensure directories exist without spinner
      const directories = [
        openspecPath,
        path.join(openspecPath, 'specs'),
        path.join(openspecPath, 'changes'),
        path.join(openspecPath, 'changes', 'archive'),
      ];

      for (const dir of directories) {
        await FileSystemUtils.createDirectory(dir);
      }
      return;
    }

    const spinner = this.startSpinner('Creating OpenSpec structure...');

    const directories = [
      openspecPath,
      path.join(openspecPath, 'specs'),
      path.join(openspecPath, 'changes'),
      path.join(openspecPath, 'changes', 'archive'),
    ];

    for (const dir of directories) {
      await FileSystemUtils.createDirectory(dir);
    }

    spinner.stopAndPersist({
      symbol: PALETTE.white('▌'),
      text: PALETTE.white('OpenSpec structure created'),
    });
  }

  // ═══════════════════════════════════════════════════════════
  // OPSX SKELETON GENERATION
  // ═══════════════════════════════════════════════════════════

  private async writeOpsxSkeleton(projectPath: string, openspecPath: string): Promise<void> {
    const projectName = this.inferProjectName(projectPath);
    const projectId = this.toProjectId(projectName);
    const timestamp = new Date().toISOString();

    const opsxYaml = `schema_version: 1
project:
  id: ${projectId}
  name: ${projectName}
domains: []
capabilities: []
`;

    const relationsYaml = `schema_version: 1
relations: []
`;

    const codeMapYaml = `schema_version: 1
generated_at: "${timestamp}"
nodes: []
`;

    const files: Array<{ name: string; content: string }> = [
      { name: 'project.opsx.yaml', content: opsxYaml },
      { name: 'project.opsx.relations.yaml', content: relationsYaml },
      { name: 'project.opsx.code-map.yaml', content: codeMapYaml },
    ];

    for (const file of files) {
      const filePath = path.join(openspecPath, file.name);
      if (!fs.existsSync(filePath)) {
        await FileSystemUtils.writeFile(filePath, file.content);
      }
    }
  }

  private inferProjectName(projectPath: string): string {
    try {
      const pkgPath = path.join(projectPath, 'package.json');
      if (fs.existsSync(pkgPath)) {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
        if (pkg.name && typeof pkg.name === 'string' && pkg.name.trim().length > 0) {
          return pkg.name.trim();
        }
      }
    } catch {
      // Fall through to basename fallback
    }
    return path.basename(projectPath);
  }

  private toProjectId(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  // ═══════════════════════════════════════════════════════════
  // SKILL & COMMAND GENERATION
  // ═══════════════════════════════════════════════════════════

  private async generateSkillsAndCommands(
    projectPath: string,
    tools: Array<{ value: string; name: string; skillsDir: string; wasConfigured: boolean }>
  ): Promise<{
    createdTools: typeof tools;
    refreshedTools: typeof tools;
    failedTools: Array<{ name: string; error: Error }>;
    commandsSkipped: string[];
    generatedSkillCount: number;
    generatedCommandCount: number;
    removedCommandCount: number;
    removedSkillCount: number;
  }> {
    const createdTools: typeof tools = [];
    const refreshedTools: typeof tools = [];
    const failedTools: Array<{ name: string; error: Error }> = [];
    const commandsSkipped: string[] = [];

    // Workflows are fixed from registry; skills-only surface.
    const allWorkflowIds = WorkflowManifestRegistry.getAllWorkflowIds() as unknown as readonly WorkflowId[];
    const workflows = createWorkflowArtifactPlan(
      allWorkflowIds,
      projectPath
    ).workflows;

    // Build sync requests for all tools
    const requests = tools.map((tool) => ({
      toolId: tool.value,
      projectPath,
      workflows,
      version: OPENSPEC_VERSION,
    }));

    const summary = await ArtifactSyncEngine.syncAll(requests);

    // Map results back to init-style output
    for (const tool of tools) {
      const result = summary.results.find((r) => r.toolId === tool.value);
      if (!result) continue;

      if (result.error) {
        failedTools.push({ name: tool.name, error: result.error });
      } else {
        if (tool.wasConfigured) {
          refreshedTools.push(tool);
        } else {
          createdTools.push(tool);
        }
      }
    }

    return {
      createdTools,
      refreshedTools,
      failedTools,
      commandsSkipped,
      generatedSkillCount: summary.totalSkillsWritten,
      generatedCommandCount: summary.totalCommandsWritten,
      removedCommandCount: summary.totalCommandsRemoved,
      removedSkillCount: summary.totalSkillsRemoved,
    };
  }

  // ═══════════════════════════════════════════════════════════
  // CONFIG FILE
  // ═══════════════════════════════════════════════════════════

  private async promptForProseLanguage(projectPath: string): Promise<string | undefined> {
    if (!this.canPromptInteractively()) {
      return undefined;
    }

    const currentProseLanguage = readProjectConfig(projectPath)?.proseLanguage;
    const { input } = await import('@inquirer/prompts');
    const response = await input({
      message: 'OpenSpec document language (optional, e.g. en, zh-CN, pt-BR)',
      default: currentProseLanguage ?? '',
      validate: (value: string) => {
        if (value.trim().length === 0) {
          return true;
        }
        return value.trim().length > 0 || 'Enter a non-empty language or leave it blank';
      },
    });

    const normalized = response.trim();
    return normalized.length > 0 ? normalized : undefined;
  }

  private async writeProseLanguage(
    configPath: string,
    proseLanguage: string
  ): Promise<void> {
    const content = await fs.promises.readFile(configPath, 'utf-8');
    const document = parseDocument(content);

    if (document.errors.length > 0) {
      throw new Error(`Failed to parse existing ${path.basename(configPath)}`);
    }

    if (!document.contents || !isMap(document.contents)) {
      throw new Error(`${path.basename(configPath)} must contain a YAML object`);
    }

    document.set('proseLanguage', proseLanguage);
    await FileSystemUtils.writeFile(configPath, String(document));
  }

  private async createConfig(
    openspecPath: string,
    proseLanguage?: string
  ): Promise<'created' | 'updated' | 'exists' | 'skipped'> {
    const configPath = path.join(openspecPath, 'config.yaml');
    const configYmlPath = path.join(openspecPath, 'config.yml');
    const configYamlExists = fs.existsSync(configPath);
    const configYmlExists = fs.existsSync(configYmlPath);
    const existingConfigPath = configYamlExists ? configPath : configYmlExists ? configYmlPath : null;

    if (existingConfigPath) {
      if (!proseLanguage) {
        return 'exists';
      }
      await this.writeProseLanguage(existingConfigPath, proseLanguage);
      return 'updated';
    }

    // In non-interactive mode without --force, skip config creation
    if (!this.canPromptInteractively() && !this.force) {
      return 'skipped';
    }

    try {
      const yamlContent = serializeConfig({ schema: DEFAULT_SCHEMA, proseLanguage });
      await FileSystemUtils.writeFile(configPath, yamlContent);
      return 'created';
    } catch {
      return 'skipped';
    }
  }

  // ═══════════════════════════════════════════════════════════
  // UI & OUTPUT
  // ═══════════════════════════════════════════════════════════

  private displaySuccessMessage(
    projectPath: string,
    tools: Array<{ value: string; name: string; skillsDir: string; wasConfigured: boolean }>,
    results: {
      createdTools: typeof tools;
      refreshedTools: typeof tools;
      failedTools: Array<{ name: string; error: Error }>;
      commandsSkipped: string[];
      generatedSkillCount: number;
      generatedCommandCount: number;
      removedCommandCount: number;
      removedSkillCount: number;
    },
    configStatus: 'created' | 'updated' | 'exists' | 'skipped',
    extendMode: boolean,
    proseLanguage?: string
  ): void {
    console.log();
    console.log(chalk.bold('OpenSpec Setup Complete'));
    console.log();

    // Show created vs refreshed tools
    if (results.createdTools.length > 0) {
      console.log(`Created: ${results.createdTools.map((t) => t.name).join(', ')}`);
    }
    if (results.refreshedTools.length > 0) {
      console.log(`Refreshed: ${results.refreshedTools.map((t) => t.name).join(', ')}`);
    }

    // Show counts (skills-only)
    const successfulTools = [...results.createdTools, ...results.refreshedTools];
    if (successfulTools.length > 0) {
      const toolDirs = [...new Set(successfulTools.map((t) => t.skillsDir))].join(', ');
      const skillCount = results.generatedSkillCount;
      if (skillCount > 0) {
        console.log(`${skillCount} skills in ${toolDirs}/`);
      }
    }

    // Show failures
    if (results.failedTools.length > 0) {
      console.log(chalk.red(`Failed: ${results.failedTools.map((f) => `${f.name} (${f.error.message})`).join(', ')}`));
    }

    // Show removed skills (from deselected workflows)
    if (results.removedSkillCount > 0) {
      console.log(chalk.dim(`Removed: ${results.removedSkillCount} skill directories (no longer in workflow manifest)`));
    }

    // Config status
    if (configStatus === 'created') {
      const details = proseLanguage ? `schema: ${DEFAULT_SCHEMA}, proseLanguage: ${proseLanguage}` : `schema: ${DEFAULT_SCHEMA}`;
      console.log(`Config: openspec/config.yaml (${details})`);
    } else if (configStatus === 'updated') {
      console.log(`Config: openspec/config.yaml (updated proseLanguage: ${proseLanguage})`);
    } else if (configStatus === 'exists') {
      // Show actual filename (config.yaml or config.yml)
      const configYaml = path.join(projectPath, OPENSPEC_DIR_NAME, 'config.yaml');
      const configYml = path.join(projectPath, OPENSPEC_DIR_NAME, 'config.yml');
      const configName = fs.existsSync(configYaml) ? 'config.yaml' : fs.existsSync(configYml) ? 'config.yml' : 'config.yaml';
      console.log(`Config: openspec/${configName} (exists)`);
    } else {
      console.log(chalk.dim(`Config: skipped (non-interactive mode)`));
    }

    // Getting started
    const activeWorkflows = [...WorkflowManifestRegistry.getAllWorkflowIds()];
    const guidanceToolId = this.getGuidanceToolId(successfulTools.map((tool) => tool.value));
    console.log();
    if (guidanceToolId && activeWorkflows.includes('propose')) {
      console.log(chalk.bold('Getting started:'));
      console.log(`  Start your first change: ${renderWorkflowInvocation(guidanceToolId, 'propose')} "your idea"`);
    } else {
      console.log("Done. Run 'openspec init' to configure your workflows.");
    }

    // Bootstrap guidance: only when bootstrap-opsx is in active profile and first-time init
    if (!extendMode && activeWorkflows.includes('bootstrap-opsx')) {
      const bootstrapRef = guidanceToolId
        ? renderWorkflowInvocation(guidanceToolId, 'bootstrap-opsx' as WorkflowId)
        : '/opsx:bootstrap-opsx';
      console.log(`  Next: run ${bootstrapRef} to map your architecture`);
    }

    // Links
    console.log();
    console.log(`Learn more: ${chalk.cyan('https://github.com/cp-yu/opsx')}`);
    console.log(`Feedback:   ${chalk.cyan('https://github.com/cp-yu/opsx/issues')}`);

    // Restart instruction if any tools were configured
    if (results.createdTools.length > 0 || results.refreshedTools.length > 0) {
      console.log();
      console.log(chalk.white('Restart your IDE or current session for refreshed skills to take effect.'));
    }

    console.log();
  }

  private getGuidanceToolId(toolIds: readonly string[]): string | undefined {
    return toolIds[0];
  }

  private startSpinner(text: string) {
    return ora({
      text,
      stream: process.stdout,
      color: 'gray',
      spinner: PROGRESS_SPINNER,
    }).start();
  }
}
