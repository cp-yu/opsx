import path from 'path';
import * as fs from 'fs';
import { AI_TOOLS } from './config.js';
import {
  createToolWorkflowArtifactPlan,
} from './workflow-installation.js';
import { getConfiguredTools } from './shared/index.js';
import {
  ALL_WORKFLOWS,
  WORKFLOW_TO_SKILL_DIR,
  normalizeWorkflowIds,
  type WorkflowId,
} from './workflow-surface.js';

export { WORKFLOW_TO_SKILL_DIR } from './workflow-surface.js';

function toKnownWorkflows(workflows: readonly string[]): WorkflowId[] {
  return normalizeWorkflowIds(workflows);
}

/**
 * Returns tools that are configured via generated skill files.
 * Skills-only surface: tools with only command files are NOT configured.
 */
export function getConfiguredToolsForProfileSync(projectPath: string): string[] {
  return getConfiguredTools(projectPath);
}

/**
 * Detects if a single tool has profile drift against the desired state.
 * Skills-only surface: only skill files drive drift detection.
 */
export function hasToolProfileOrDeliveryDrift(
  projectPath: string,
  toolId: string,
  desiredWorkflows: readonly string[]
): boolean {
  const tool = AI_TOOLS.find((t) => t.value === toolId);
  if (!tool?.skillsDir) return false;

  const plan = createToolWorkflowArtifactPlan(toolId, toKnownWorkflows(desiredWorkflows), projectPath);
  const skillsDir = path.join(projectPath, tool.skillsDir, 'skills');

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

  return false;
}

/**
 * Returns configured tools that currently need a profile sync.
 */
export function getToolsNeedingProfileSync(
  projectPath: string,
  desiredWorkflows: readonly string[],
  configuredTools?: readonly string[]
): string[] {
  const tools = configuredTools ? [...new Set(configuredTools)] : getConfiguredToolsForProfileSync(projectPath);
  return tools.filter((toolId) =>
    hasToolProfileOrDeliveryDrift(projectPath, toolId, desiredWorkflows)
  );
}

function getInstalledWorkflowsForTool(
  projectPath: string,
  toolId: string
): WorkflowId[] {
  const tool = AI_TOOLS.find((t) => t.value === toolId);
  if (!tool?.skillsDir) return [];

  const installed = new Set<WorkflowId>();
  const skillsDir = path.join(projectPath, tool.skillsDir, 'skills');

  for (const workflow of ALL_WORKFLOWS) {
    const dirName = WORKFLOW_TO_SKILL_DIR[workflow];
    const skillFile = path.join(skillsDir, dirName, 'SKILL.md');
    if (fs.existsSync(skillFile)) {
      installed.add(workflow);
    }
  }

  return [...installed];
}

/**
 * Detects whether the current project has any profile drift.
 * Skills-only surface: command files are ignored.
 */
export function hasProjectConfigDrift(
  projectPath: string,
  desiredWorkflows: readonly string[]
): boolean {
  const configuredTools = getConfiguredToolsForProfileSync(projectPath);
  if (getToolsNeedingProfileSync(projectPath, desiredWorkflows, configuredTools).length > 0) {
    return true;
  }

  const desiredSet = new Set(toKnownWorkflows(desiredWorkflows));

  for (const toolId of configuredTools) {
    const installed = getInstalledWorkflowsForTool(projectPath, toolId);
    if (installed.some((workflow) => !desiredSet.has(workflow))) {
      return true;
    }
  }

  return false;
}
