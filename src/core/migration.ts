/**
 * Migration Utilities
 *
 * One-time migration logic for existing projects.
 * Called by both init and update commands.
 */

import type { AIToolOption } from './config.js';
import { toolSupportsCommandGeneration } from './config.js';
import { getGlobalConfig, getGlobalConfigPath, saveGlobalConfig } from './global-config.js';
import { createToolWorkflowArtifactPlan, getManagedCommandFiles } from './workflow-installation.js';
import { ALL_WORKFLOWS } from './workflow-surface.js';
import path from 'path';
import * as fs from 'fs';

interface InstalledWorkflowArtifacts {
  workflows: string[];
  hasSkills: boolean;
  hasCommands: boolean;
}

function scanInstalledWorkflowArtifacts(
  projectPath: string,
  tools: AIToolOption[]
): InstalledWorkflowArtifacts {
  const installed = new Set<string>();
  let hasSkills = false;
  let hasCommands = false;

  for (const tool of tools) {
    if (!tool.skillsDir) continue;
    const managedPlan = createToolWorkflowArtifactPlan(tool.value, [], 'both');
    const skillsDir = path.join(projectPath, tool.skillsDir, 'skills');

    for (const [index, workflowId] of ALL_WORKFLOWS.entries()) {
      const skillDirName = managedPlan.managedSkillDirNames[index];
      const skillFile = path.join(skillsDir, skillDirName, 'SKILL.md');
      if (fs.existsSync(skillFile)) {
        installed.add(workflowId);
        hasSkills = true;
      }
    }

    for (const [index, workflowId] of ALL_WORKFLOWS.entries()) {
      const commandFiles = getManagedCommandFiles(
        projectPath,
        tool.value,
        [managedPlan.managedCommandSlugs[index]],
        { includeLegacyFiles: true }
      );
      if (commandFiles.some((filePath) => fs.existsSync(filePath))) {
        installed.add(workflowId);
        if (toolSupportsCommandGeneration(tool)) {
          hasCommands = true;
        }
      }
    }
  }

  return {
    workflows: ALL_WORKFLOWS.filter((workflowId) => installed.has(workflowId)),
    hasSkills,
    hasCommands,
  };
}

/**
 * Scans installed workflow files across all detected tools and returns
 * the union of installed workflow IDs.
 */
export function scanInstalledWorkflows(projectPath: string, tools: AIToolOption[]): string[] {
  return scanInstalledWorkflowArtifacts(projectPath, tools).workflows;
}

function inferDelivery(artifacts: InstalledWorkflowArtifacts): 'both' | 'skills' | 'commands' {
  if (artifacts.hasSkills && artifacts.hasCommands) {
    return 'both';
  }
  if (artifacts.hasCommands) {
    return 'commands';
  }
  return 'skills';
}

/**
 * Performs one-time migration if needed.
 * Now handles cleaning up obsolete profile/workflows fields from global config.
 */
export function migrateIfNeeded(projectPath: string, tools: AIToolOption[]): void {
  const configPath = getGlobalConfigPath();

  let rawConfig: Record<string, unknown> = {};
  try {
    if (fs.existsSync(configPath)) {
      rawConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    }
  } catch {
    return;
  }

  // Only migrate if there are obsolete fields to clean up
  if (rawConfig.profile === undefined && rawConfig.workflows === undefined) {
    return;
  }

  const artifacts = scanInstalledWorkflowArtifacts(projectPath, tools);

  // Infer delivery from existing artifacts if not already set
  if (rawConfig.delivery === undefined && artifacts.workflows.length > 0) {
    const config = getGlobalConfig();
    config.delivery = inferDelivery(artifacts);
    saveGlobalConfig(config);
  }

  // Clean up obsolete fields by re-saving (getGlobalConfig already strips them)
  const config = getGlobalConfig();
  saveGlobalConfig(config);

  console.log('已自动清理过时的 profile/workflows 配置字段。');
}
