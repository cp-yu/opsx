import path from 'path';
import * as fs from 'fs';
import { AI_TOOLS } from './config.js';
import type { Delivery } from './global-config.js';
import {
  createToolWorkflowArtifactPlan,
  getManagedCommandFiles,
} from './workflow-installation.js';
import { getConfiguredTools } from './shared/index.js';
import {
  ALL_WORKFLOWS,
  COMMAND_IDS,
  WORKFLOW_TO_SKILL_DIR,
  getCommandSlug,
  normalizeWorkflowIds,
  type WorkflowId,
} from './workflow-surface.js';

export { WORKFLOW_TO_SKILL_DIR } from './workflow-surface.js';

function toKnownWorkflows(workflows: readonly string[]): WorkflowId[] {
  return normalizeWorkflowIds(workflows);
}

/**
 * Checks whether a tool has at least one generated OpenSpec command file.
 */
export function toolHasAnyConfiguredCommand(projectPath: string, toolId: string): boolean {
  for (const commandId of COMMAND_IDS) {
    const commandFiles = getManagedCommandFiles(
      projectPath,
      toolId,
      [getCommandSlug(commandId)],
      { includeLegacyFiles: true }
    );
    if (commandFiles.some((filePath) => fs.existsSync(filePath))) {
      return true;
    }
  }

  return false;
}

/**
 * Returns tools with at least one generated command file on disk.
 */
export function getCommandConfiguredTools(projectPath: string): string[] {
  return AI_TOOLS
    .filter((tool) => Boolean(tool.skillsDir))
    .map((tool) => tool.value)
    .filter((toolId) => toolHasAnyConfiguredCommand(projectPath, toolId));
}

/**
 * Returns tools that are configured via either skills or commands.
 */
export function getConfiguredToolsForProfileSync(projectPath: string): string[] {
  const skillConfigured = getConfiguredTools(projectPath);
  const commandConfigured = getCommandConfiguredTools(projectPath);
  return [...new Set([...skillConfigured, ...commandConfigured])];
}

/**
 * Detects if a single tool has profile/delivery drift against the desired state.
 */
export function hasToolProfileOrDeliveryDrift(
  projectPath: string,
  toolId: string,
  desiredWorkflows: readonly string[],
  delivery: Delivery
): boolean {
  const tool = AI_TOOLS.find((t) => t.value === toolId);
  if (!tool?.skillsDir) return false;

  const plan = createToolWorkflowArtifactPlan(toolId, toKnownWorkflows(desiredWorkflows), delivery, projectPath);
  const skillsDir = path.join(projectPath, tool.skillsDir, 'skills');

  if (plan.shouldGenerateSkills) {
    for (const dirName of plan.expectedSkillDirNames) {
      const skillFile = path.join(skillsDir, dirName, 'SKILL.md');
      if (!fs.existsSync(skillFile)) {
        return true;
      }
    }

    const expectedSkillDirs = new Set(plan.expectedSkillDirNames);
    for (const dirName of plan.managedSkillDirNames) {
      if (expectedSkillDirs.has(dirName)) continue;
      const skillDir = path.join(skillsDir, dirName);
      if (fs.existsSync(skillDir)) {
        return true;
      }
    }
  } else {
    for (const dirName of plan.managedSkillDirNames) {
      const skillDir = path.join(skillsDir, dirName);
      if (fs.existsSync(skillDir)) {
        return true;
      }
    }
  }

  if (plan.shouldGenerateCommands) {
    for (const commandFile of getManagedCommandFiles(projectPath, toolId, plan.expectedCommandSlugs)) {
      if (!fs.existsSync(commandFile)) {
        return true;
      }
    }

    const expectedCommandSlugs = new Set(plan.expectedCommandSlugs);
    for (const commandSlug of plan.managedCommandSlugs) {
      if (expectedCommandSlugs.has(commandSlug)) continue;
      const commandFiles = getManagedCommandFiles(
        projectPath,
        toolId,
        [commandSlug],
        { includeLegacyFiles: true }
      );
      if (commandFiles.some((filePath) => fs.existsSync(filePath))) {
        return true;
      }
    }
  } else {
    for (const commandFile of getManagedCommandFiles(
      projectPath,
      toolId,
      plan.managedCommandSlugs,
      { includeLegacyFiles: true }
    )) {
      if (fs.existsSync(commandFile)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Returns configured tools that currently need a profile/delivery sync.
 */
export function getToolsNeedingProfileSync(
  projectPath: string,
  desiredWorkflows: readonly string[],
  delivery: Delivery,
  configuredTools?: readonly string[]
): string[] {
  const tools = configuredTools ? [...new Set(configuredTools)] : getConfiguredToolsForProfileSync(projectPath);
  return tools.filter((toolId) =>
    hasToolProfileOrDeliveryDrift(projectPath, toolId, desiredWorkflows, delivery)
  );
}

function getInstalledWorkflowsForTool(
  projectPath: string,
  toolId: string,
  options: { includeSkills: boolean; includeCommands: boolean }
): WorkflowId[] {
  const tool = AI_TOOLS.find((t) => t.value === toolId);
  if (!tool?.skillsDir) return [];

  const installed = new Set<WorkflowId>();
  const skillsDir = path.join(projectPath, tool.skillsDir, 'skills');

  if (options.includeSkills) {
    for (const workflow of ALL_WORKFLOWS) {
      const dirName = WORKFLOW_TO_SKILL_DIR[workflow];
      const skillFile = path.join(skillsDir, dirName, 'SKILL.md');
      if (fs.existsSync(skillFile)) {
        installed.add(workflow);
      }
    }
  }

  if (options.includeCommands) {
    for (const workflow of ALL_WORKFLOWS) {
      const commandFiles = getManagedCommandFiles(
        projectPath,
        toolId,
        [getCommandSlug(workflow)],
        { includeLegacyFiles: true }
      );
      if (commandFiles.some((filePath) => fs.existsSync(filePath))) {
        installed.add(workflow);
      }
    }
  }

  return [...installed];
}

/**
 * Detects whether the current project has any profile/delivery drift.
 */
export function hasProjectConfigDrift(
  projectPath: string,
  desiredWorkflows: readonly string[],
  delivery: Delivery
): boolean {
  const configuredTools = getConfiguredToolsForProfileSync(projectPath);
  if (getToolsNeedingProfileSync(projectPath, desiredWorkflows, delivery, configuredTools).length > 0) {
    return true;
  }

  const desiredSet = new Set(toKnownWorkflows(desiredWorkflows));
  const includeSkills = delivery !== 'commands';
  const includeCommands = delivery !== 'skills';

  for (const toolId of configuredTools) {
    const installed = getInstalledWorkflowsForTool(projectPath, toolId, { includeSkills, includeCommands });
    if (installed.some((workflow) => !desiredSet.has(workflow))) {
      return true;
    }
  }

  return false;
}
