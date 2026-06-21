/**
 * Migration Utilities
 *
 * One-time migration logic for existing projects.
 * Called by both init and update commands.
 */

import type { AIToolOption } from './config.js';
import { getGlobalConfig, getGlobalConfigPath, saveGlobalConfig } from './global-config.js';
import { createToolWorkflowArtifactPlan } from './workflow-installation.js';
import { ALL_WORKFLOWS } from './workflow-surface.js';
import path from 'path';
import * as fs from 'fs';

interface InstalledWorkflowArtifacts {
  workflows: string[];
  hasSkills: boolean;
}

function scanInstalledWorkflowArtifacts(
  projectPath: string,
  tools: AIToolOption[]
): InstalledWorkflowArtifacts {
  const installed = new Set<string>();
  let hasSkills = false;

  for (const tool of tools) {
    if (!tool.skillsDir) continue;
    const managedPlan = createToolWorkflowArtifactPlan(tool.value, []);
    const skillsDir = path.join(projectPath, tool.skillsDir, 'skills');

    for (const [index, workflowId] of ALL_WORKFLOWS.entries()) {
      const skillDirName = managedPlan.managedSkillDirNames[index];
      const skillFile = path.join(skillsDir, skillDirName, 'SKILL.md');
      if (fs.existsSync(skillFile)) {
        installed.add(workflowId);
        hasSkills = true;
      }
    }
  }

  return {
    workflows: ALL_WORKFLOWS.filter((workflowId) => installed.has(workflowId)),
    hasSkills,
  };
}

/**
 * Scans installed workflow skills across all detected tools and returns
 * the union of installed workflow IDs.
 */
export function scanInstalledWorkflows(projectPath: string, tools: AIToolOption[]): string[] {
  return scanInstalledWorkflowArtifacts(projectPath, tools).workflows;
}

/**
 * Performs one-time migration if needed.
 * Cleans up obsolete profile/workflows/delivery fields from global config.
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
  if (
    rawConfig.profile === undefined &&
    rawConfig.workflows === undefined &&
    rawConfig.delivery === undefined
  ) {
    return;
  }

  // Clean up obsolete fields by re-saving (getGlobalConfig already strips them)
  const config = getGlobalConfig();
  saveGlobalConfig(config);

  console.log('Automatically cleaned up obsolete profile/workflows/delivery config fields.');
}
