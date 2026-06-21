/**
 * Update Command
 *
 * Refreshes OpenSpec skills for configured tools.
 * Supports stale-config cleanup, migration, and smart update detection.
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
import { AI_TOOLS, OPENSPEC_DIR_NAME } from './config.js';
import {
  getToolVersionStatus,
  getToolsWithSkillsDir,
  type ToolVersionStatus,
} from './shared/index.js';
import {
  detectLegacyArtifacts,
  cleanupLegacyArtifacts,
  formatCleanupSummary,
  formatDetectionSummary,
  getToolsFromLegacyArtifacts,
  type LegacyDetectionResult,
} from './legacy-cleanup.js';
import { isInteractive } from '../utils/interactive.js';
import { getGlobalConfig, getGlobalConfigPath, saveGlobalConfig } from './global-config.js';
import { getAvailableTools } from './available-tools.js';
import {
  getConfiguredToolsForProfileSync,
  getToolsNeedingProfileSync,
} from './profile-sync-drift.js';
import {
  createWorkflowArtifactPlan,
} from './workflow-installation.js';
import {
  scanInstalledWorkflows as scanInstalledWorkflowsShared,
  migrateIfNeeded as migrateIfNeededShared,
} from './migration.js';
import { migrateProjectConfigDefaults } from './project-config.js';
import { ArtifactSyncEngine } from './templates/sync-engine.js';
import { WorkflowManifestRegistry } from './templates/manifest/index.js';

const require = createRequire(import.meta.url);
const { version: OPENSPEC_VERSION } = require('../../package.json');

/**
 * Options for the update command.
 */
export interface UpdateCommandOptions {
  /** Force update even when tools are up to date */
  force?: boolean;
}

/**
 * Scans installed workflow artifacts (skills and managed commands) across all configured tools.
 * Returns the union of detected workflow IDs that match ALL_WORKFLOWS.
 *
 * Wrapper around the shared migration module's scanInstalledWorkflows that accepts tool IDs.
 */
export function scanInstalledWorkflows(projectPath: string, toolIds: string[]): string[] {
  const tools = toolIds
    .map((id) => AI_TOOLS.find((t) => t.value === id))
    .filter((t): t is NonNullable<typeof t> => t != null);
  return scanInstalledWorkflowsShared(projectPath, tools);
}

export class UpdateCommand {
  private readonly force: boolean;

  constructor(options: UpdateCommandOptions = {}) {
    this.force = options.force ?? false;
  }

  async execute(projectPath: string): Promise<void> {
    const resolvedProjectPath = path.resolve(projectPath);
    const openspecPath = path.join(resolvedProjectPath, OPENSPEC_DIR_NAME);

    // 1. Check openspec directory exists
    if (!await FileSystemUtils.directoryExists(openspecPath)) {
      throw new Error(`No OpenSpec directory found. Run 'openspec init' first.`);
    }

    const configMigration = migrateProjectConfigDefaults(resolvedProjectPath);
    if (configMigration.status === 'skipped') {
      console.warn(
        chalk.yellow(
          `Project config default migration skipped for ${path.relative(resolvedProjectPath, configMigration.path)} (${configMigration.reason})`
        )
      );
    }

    // 2. Perform one-time migration if needed before any legacy upgrade generation.
    // Use detected tool directories to preserve existing opsx skills/commands.
    const detectedTools = getAvailableTools(resolvedProjectPath);
    migrateIfNeededShared(resolvedProjectPath, detectedTools);

    // 3. Workflows are fixed from registry; skills-only surface.
    const allWorkflowIds = WorkflowManifestRegistry.getAllWorkflowIds();
    const plan = createWorkflowArtifactPlan(allWorkflowIds, resolvedProjectPath);
    const desiredWorkflows = [...plan.workflows];

    // 3b. Clean up obsolete profile/workflows/delivery fields from global config
    this.cleanupObsoleteConfigFields();

    // 3c. Clean up expanded workflow remnants (7 removed workflows)
    this.cleanupExpandedWorkflowRemnants(resolvedProjectPath);

    // 4. Detect and handle legacy artifacts + upgrade legacy tools
    const newlyConfiguredTools = await this.handleLegacyCleanup(
      resolvedProjectPath,
      desiredWorkflows
    );

    // 5. Find configured tools (skills-only surface)
    const configuredTools = getConfiguredToolsForProfileSync(resolvedProjectPath);

    if (configuredTools.length === 0 && newlyConfiguredTools.length === 0) {
      console.log(chalk.yellow('No configured tools found.'));
      console.log(chalk.dim('Run "openspec init" to set up tools.'));
      return;
    }

    // 6. Check version status for all configured tools
    const toolStatuses = configuredTools.map((toolId) =>
      getToolVersionStatus(resolvedProjectPath, toolId, OPENSPEC_VERSION)
    );
    const statusByTool = new Map(toolStatuses.map((status) => [status.toolId, status] as const));

    // 7. Smart update detection (skills-only drift)
    const toolsNeedingVersionUpdate = toolStatuses
      .filter((s) => s.needsUpdate)
      .map((s) => s.toolId);
    const toolsNeedingConfigSync = getToolsNeedingProfileSync(
      resolvedProjectPath,
      desiredWorkflows,
      configuredTools
    );
    const toolsToUpdateSet = new Set<string>([
      ...toolsNeedingVersionUpdate,
      ...toolsNeedingConfigSync,
    ]);
    const toolsUpToDate = toolStatuses.filter((s) => !toolsToUpdateSet.has(s.toolId));

    if (!this.force && toolsToUpdateSet.size === 0) {
      // All tools are up to date
      this.displayUpToDateMessage(toolStatuses);

      // Still check for new tool directories and extra workflows
      this.detectNewTools(resolvedProjectPath, configuredTools);
      this.displayExtraWorkflowsNote(resolvedProjectPath, configuredTools, desiredWorkflows);
      return;
    }

    // 8. Display update plan
    if (this.force) {
      console.log(`Force updating ${configuredTools.length} tool(s): ${configuredTools.join(', ')}`);
    } else {
      this.displayUpdatePlan([...toolsToUpdateSet], statusByTool, toolsUpToDate);
    }
    console.log();

    // 9. Update tools (all if force, otherwise only those needing update)
    const toolsToUpdate = this.force ? configuredTools : [...toolsToUpdateSet];

    const syncRequests = toolsToUpdate.map((toolId) => ({
      toolId,
      projectPath: resolvedProjectPath,
      workflows: desiredWorkflows,
      version: OPENSPEC_VERSION,
    }));

    const summary = await ArtifactSyncEngine.syncAll(syncRequests);

    const updatedTools: string[] = [];
    const failedTools: Array<{ name: string; error: string }> = [];

    for (const result of summary.results) {
      const tool = AI_TOOLS.find((t) => t.value === result.toolId);
      if (result.error) {
        failedTools.push({ name: tool?.name || result.toolId, error: result.error.message });
      } else {
        updatedTools.push(tool?.name || result.toolId);
      }
    }

    // 11. Summary
    console.log();
    if (updatedTools.length > 0) {
      console.log(chalk.green(`✓ Updated: ${updatedTools.join(', ')} (v${OPENSPEC_VERSION})`));
    }
    if (failedTools.length > 0) {
      console.log(chalk.red(`✗ Failed: ${failedTools.map(f => `${f.name} (${f.error})`).join(', ')}`));
    }
    if (summary.totalSkillsRemoved > 0) {
      console.log(chalk.dim(`Removed: ${summary.totalSkillsRemoved} skill directories`));
    }

    // 12. Show onboarding message for newly configured tools from legacy upgrade
    if (newlyConfiguredTools.length > 0) {
      const guidanceToolId = this.getGuidanceToolId(newlyConfiguredTools);
      console.log();
      console.log(chalk.bold('Getting started:'));
      console.log(`  ${renderWorkflowInvocation(guidanceToolId, 'propose')}     Start a new change`);
      console.log(`  ${renderWorkflowInvocation(guidanceToolId, 'explore')}     Investigate a problem`);
      console.log(`  ${renderWorkflowInvocation(guidanceToolId, 'apply')}       Implement tasks`);
      console.log();
      console.log(`Learn more: ${chalk.cyan('https://github.com/cp-yu/opsx')}`);
    }

    const configuredAndNewTools = [...new Set([...configuredTools, ...newlyConfiguredTools])];

    // 13. Detect new tool directories not currently configured
    this.detectNewTools(resolvedProjectPath, configuredAndNewTools);

    // 14. Display note about extra workflows not in profile
    this.displayExtraWorkflowsNote(resolvedProjectPath, configuredAndNewTools, desiredWorkflows);

    // 15. List affected tools
    if (updatedTools.length > 0) {
      const toolDisplayNames = updatedTools;
      console.log(chalk.dim(`Tools: ${toolDisplayNames.join(', ')}`));
    }

    console.log();
    console.log(chalk.dim('Restart your IDE or current session for refreshed skills to take effect.'));
  }

  private getGuidanceToolId(toolIds: readonly string[]): string {
    return toolIds[0] ?? 'codex';
  }

  /**
   * Display message when all tools are up to date.
   */
  private displayUpToDateMessage(toolStatuses: ToolVersionStatus[]): void {
    const toolNames = toolStatuses.map((s) => s.toolId);
    console.log(chalk.green(`✓ All ${toolStatuses.length} tool(s) up to date (v${OPENSPEC_VERSION})`));
    console.log(chalk.dim(`  Tools: ${toolNames.join(', ')}`));
    console.log();
    console.log(chalk.dim('Use --force to refresh files anyway.'));
  }

  /**
   * Display the update plan showing which tools need updating.
   */
  private displayUpdatePlan(
    toolsToUpdate: string[],
    statusByTool: Map<string, ToolVersionStatus>,
    upToDate: ToolVersionStatus[]
  ): void {
    const updates = toolsToUpdate.map((toolId) => {
      const status = statusByTool.get(toolId);
      if (status?.needsUpdate) {
        const fromVersion = status.generatedByVersion ?? 'unknown';
        return `${status.toolId} (${fromVersion} → ${OPENSPEC_VERSION})`;
      }
      return `${toolId} (config sync)`;
    });

    console.log(`Updating ${toolsToUpdate.length} tool(s): ${updates.join(', ')}`);

    if (upToDate.length > 0) {
      const upToDateNames = upToDate.map((s) => s.toolId);
      console.log(chalk.dim(`Already up to date: ${upToDateNames.join(', ')}`));
    }
  }

  /**
   * Detects new tool directories that aren't currently configured and displays a hint.
   */
  private detectNewTools(projectPath: string, configuredTools: string[]): void {
    const availableTools = getAvailableTools(projectPath);
    const configuredSet = new Set(configuredTools);

    const newTools = availableTools.filter((t) => !configuredSet.has(t.value));

    if (newTools.length > 0) {
      const newToolNames = newTools.map((tool) => tool.name);
      const isSingleTool = newToolNames.length === 1;
      const toolNoun = isSingleTool ? 'tool' : 'tools';
      const pronoun = isSingleTool ? 'it' : 'them';
      console.log();
      console.log(
        chalk.yellow(
          `Detected new ${toolNoun}: ${newToolNames.join(', ')}. Run 'openspec init' to add ${pronoun}.`
        )
      );
    }
  }

  /**
   * Displays a note about extra workflows installed outside the fixed workflow set.
   */
  private displayExtraWorkflowsNote(
    projectPath: string,
    configuredTools: string[],
    profileWorkflows: readonly string[]
  ): void {
    const installedWorkflows = scanInstalledWorkflows(projectPath, configuredTools);
    const profileSet = new Set(profileWorkflows);
    const extraWorkflows = installedWorkflows.filter((w) => !profileSet.has(w));

    if (extraWorkflows.length > 0) {
      console.log(chalk.dim(`Note: ${extraWorkflows.length} extra workflows installed outside the standard set. Run 'openspec update' to sync.`));
    }
  }

  /**
   * Detect and handle legacy OpenSpec artifacts.
   * Unlike init, update warns but continues if legacy files found in non-interactive mode.
   * Returns array of tool IDs that were newly configured during legacy upgrade.
   */
  private async handleLegacyCleanup(
    projectPath: string,
    desiredWorkflows: readonly string[]
  ): Promise<string[]> {
    // Detect legacy artifacts
    const detection = await detectLegacyArtifacts(projectPath);

    if (!detection.hasLegacyArtifacts) {
      return []; // No legacy artifacts found
    }

    // Show what was detected
    console.log();
    console.log(formatDetectionSummary(detection));
    console.log();

    const canPrompt = isInteractive();

    if (this.force) {
      // --force flag: proceed with cleanup automatically
      await this.performLegacyCleanup(projectPath, detection);
      // Then upgrade legacy tools to new skills
      return this.upgradeLegacyTools(projectPath, detection, canPrompt, desiredWorkflows);
    }

    if (!canPrompt) {
      // Non-interactive mode without --force: warn and continue
      // (Unlike init, update doesn't abort - user may just want to update skills)
      console.log(chalk.yellow('⚠ Run with --force to auto-cleanup legacy files, or run interactively.'));
      console.log();
      return [];
    }

    // Interactive mode: prompt for confirmation
    const { confirm } = await import('@inquirer/prompts');
    const shouldCleanup = await confirm({
      message: 'Upgrade and clean up legacy files?',
      default: true,
    });

    if (shouldCleanup) {
      await this.performLegacyCleanup(projectPath, detection);
      // Then upgrade legacy tools to new skills
      return this.upgradeLegacyTools(projectPath, detection, canPrompt, desiredWorkflows);
    } else {
      console.log(chalk.dim('Skipping legacy cleanup. Continuing with skill update...'));
      console.log();
      return [];
    }
  }

  /**
   * Perform cleanup of legacy artifacts.
   */
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

  /**
   * Upgrade legacy tools to new skills system.
   * Returns array of tool IDs that were newly configured.
   */
  private async upgradeLegacyTools(
    projectPath: string,
    detection: LegacyDetectionResult,
    canPrompt: boolean,
    desiredWorkflows: readonly string[]
  ): Promise<string[]> {
    // Get tools that had legacy artifacts
    const legacyTools = getToolsFromLegacyArtifacts(detection);

    if (legacyTools.length === 0) {
      return [];
    }

    // Get currently configured tools
    const configuredTools = getConfiguredToolsForProfileSync(projectPath);
    const configuredSet = new Set(configuredTools);

    // Filter to tools that aren't already configured
    const unconfiguredLegacyTools = legacyTools.filter((t) => !configuredSet.has(t));

    if (unconfiguredLegacyTools.length === 0) {
      return [];
    }

    // Get valid tools (those with skillsDir)
    const validToolIds = new Set(getToolsWithSkillsDir());
    const validUnconfiguredTools = unconfiguredLegacyTools.filter((t) => validToolIds.has(t));

    if (validUnconfiguredTools.length === 0) {
      return [];
    }

    // Show what tools were detected from legacy artifacts
    console.log(chalk.bold('Tools detected from legacy artifacts:'));
    for (const toolId of validUnconfiguredTools) {
      const tool = AI_TOOLS.find((t) => t.value === toolId);
      console.log(`  • ${tool?.name || toolId}`);
    }
    console.log();

    let selectedTools: string[];

    if (this.force || !canPrompt) {
      // Non-interactive with --force: auto-select detected tools
      selectedTools = validUnconfiguredTools;
      console.log(`Setting up skills for: ${selectedTools.join(', ')}`);
    } else {
      // Interactive mode: prompt for tool selection with detected tools pre-selected
      const { searchableMultiSelect } = await import('../prompts/searchable-multi-select.js');

      const sortedChoices = validUnconfiguredTools.map((toolId) => {
        const tool = AI_TOOLS.find((t) => t.value === toolId);
        return {
          name: tool?.name || toolId,
          value: toolId,
          configured: false,
          preSelected: true, // Pre-select all detected legacy tools
        };
      });

      selectedTools = await searchableMultiSelect({
        message: 'Select tools to set up with the new skill system:',
        pageSize: 15,
        choices: sortedChoices,
        validate: (_selected: string[]) => true, // Allow empty selection (user can skip)
      });

      if (selectedTools.length === 0) {
        console.log(chalk.dim('Skipping tool setup.'));
        console.log();
        return [];
      }
    }

    // Create skills for selected tools using fixed workflow set.
    const plan = createWorkflowArtifactPlan(desiredWorkflows, projectPath);

    const syncRequests = selectedTools.map((toolId) => ({
      toolId,
      projectPath,
      workflows: [...plan.workflows],
      version: OPENSPEC_VERSION,
    }));

    const summary = await ArtifactSyncEngine.syncAll(syncRequests);
    const newlyConfigured: string[] = [];

    for (const result of summary.results) {
      const tool = AI_TOOLS.find((t) => t.value === result.toolId);
      if (result.error) {
        console.log(chalk.red(`  ${result.error.message}`));
      } else {
        newlyConfigured.push(result.toolId);
        console.log(chalk.green(`Setup complete for ${tool?.name || result.toolId}`));
      }
    }

    if (newlyConfigured.length > 0) {
      console.log();
    }

    return newlyConfigured;
  }

  /**
   * Clean up obsolete profile/workflows/delivery fields from global config.
   * Re-saves the config without those fields (getGlobalConfig already strips them).
   */
  private cleanupObsoleteConfigFields(): void {
    const configPath = getGlobalConfigPath();
    try {
      if (!fs.existsSync(configPath)) return;
      const raw = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      if (raw.profile === undefined && raw.workflows === undefined && raw.delivery === undefined) return;
      console.warn(chalk.yellow('Obsolete config fields detected (profile/workflows/delivery), auto-cleaning...'));
      const config = getGlobalConfig();
      saveGlobalConfig(config);
      console.log(chalk.dim('Obsolete fields auto-cleaned.'));
    } catch {
      // Silently ignore config cleanup failures
    }
  }

  /**
   * Remove expanded workflow remnants: skill dirs and command files for
   * the 7 workflows that were removed from the registry.
   */
  private cleanupExpandedWorkflowRemnants(projectPath: string): void {
    const removedSkillDirNames = [
      'openspec-new-change',
      'openspec-continue-change',
      'openspec-ff-change',
      'openspec-verify-change',
      'openspec-sync-specs',
      'openspec-bulk-archive-change',
      'openspec-onboard',
    ];

    const removedCommandSlugs = ['new', 'continue', 'ff', 'verify', 'sync', 'bulk-archive', 'onboard'];

    const toolDirs: Array<{ skills: string; commands: string }> = [
      { skills: '.claude/skills', commands: '.claude/commands/opsx' },
      { skills: '.cursor/skills', commands: '.cursor/commands' },
      { skills: '.windsurf/skills', commands: '.windsurf/workflows' },
      { skills: '.codex/skills', commands: '' },
      { skills: '.gemini/skills', commands: '.gemini/commands/opsx' },
      { skills: '.continue/skills', commands: '.continue/prompts' },
      { skills: '.clinerules/skills', commands: '.clinerules/workflows' },
    ];

    let cleaned = 0;

    for (const { skills, commands } of toolDirs) {
      const skillsBase = path.join(projectPath, skills);
      for (const dirName of removedSkillDirNames) {
        const skillDir = path.join(skillsBase, dirName);
        try {
          if (fs.existsSync(skillDir)) {
            fs.rmSync(skillDir, { recursive: true, force: true });
            cleaned++;
          }
        } catch {
          // Ignore errors
        }
      }

      if (commands) {
        const commandsBase = path.join(projectPath, commands);
        for (const slug of removedCommandSlugs) {
          // Try multiple extensions
          for (const ext of ['.md', '.toml', '.prompt', '.prompt.md']) {
            const cmdFile = path.join(commandsBase, `opsx-${slug}${ext}`);
            try {
              if (fs.existsSync(cmdFile)) {
                fs.rmSync(cmdFile, { force: true });
                cleaned++;
              }
            } catch {
              // Ignore errors
            }
          }
          // Claude-style flat slug commands
          const flatCmdFile = path.join(commandsBase, `${slug}.md`);
          try {
            if (fs.existsSync(flatCmdFile)) {
              fs.rmSync(flatCmdFile, { force: true });
              cleaned++;
            }
          } catch {
            // Ignore errors
          }
        }
      }
    }

    if (cleaned > 0) {
      console.log(chalk.dim(`Cleaned ${cleaned} deprecated workflow remnant files.`));
    }
  }
}
