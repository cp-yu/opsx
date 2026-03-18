/**
 * Migration Utilities
 *
 * One-time migration logic for existing projects when profile system is introduced.
 * Called by both init and update commands before profile resolution.
 */

import type { AIToolOption } from './config.js';
import { getGlobalConfig, getGlobalConfigPath, saveGlobalConfig, type Delivery } from './global-config.js';
import { CommandAdapterRegistry } from './command-generation/index.js';
import { createWorkflowArtifactPlan } from './workflow-installation.js';
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
  const managedPlan = createWorkflowArtifactPlan([], 'both');
  const installed = new Set<string>();
  let hasSkills = false;
  let hasCommands = false;

  for (const tool of tools) {
    if (!tool.skillsDir) continue;
    const skillsDir = path.join(projectPath, tool.skillsDir, 'skills');

    for (const [index, workflowId] of ALL_WORKFLOWS.entries()) {
      const skillDirName = managedPlan.managedSkillDirNames[index];
      const skillFile = path.join(skillsDir, skillDirName, 'SKILL.md');
      if (fs.existsSync(skillFile)) {
        installed.add(workflowId);
        hasSkills = true;
      }
    }

    const adapter = CommandAdapterRegistry.get(tool.value);
    if (!adapter) continue;

    for (const [index, workflowId] of ALL_WORKFLOWS.entries()) {
      const commandPath = adapter.getFilePath(managedPlan.managedCommandSlugs[index]);
      const fullPath = path.isAbsolute(commandPath)
        ? commandPath
        : path.join(projectPath, commandPath);
      if (fs.existsSync(fullPath)) {
        installed.add(workflowId);
        hasCommands = true;
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

function inferDelivery(artifacts: InstalledWorkflowArtifacts): Delivery {
  if (artifacts.hasSkills && artifacts.hasCommands) {
    return 'both';
  }
  if (artifacts.hasCommands) {
    return 'commands';
  }
  return 'skills';
}

/**
 * Performs one-time migration if the global config does not yet have a profile field.
 * Called by both init and update before profile resolution.
 */
export function migrateIfNeeded(projectPath: string, tools: AIToolOption[]): void {
  const config = getGlobalConfig();

  const configPath = getGlobalConfigPath();

  let rawConfig: Record<string, unknown> = {};
  try {
    if (fs.existsSync(configPath)) {
      rawConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    }
  } catch {
    return;
  }

  if (rawConfig.profile !== undefined) {
    return;
  }

  const artifacts = scanInstalledWorkflowArtifacts(projectPath, tools);
  const installedWorkflows = artifacts.workflows;

  if (installedWorkflows.length === 0) {
    return;
  }

  config.profile = 'custom';
  config.workflows = installedWorkflows;
  if (rawConfig.delivery === undefined) {
    config.delivery = inferDelivery(artifacts);
  }
  saveGlobalConfig(config);

  console.log(`Migrated: custom profile with ${installedWorkflows.length} workflows`);
  console.log("New in this version: /opsx:propose. Try 'openspec config profile core' for the streamlined experience.");
}
