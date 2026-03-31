import * as fs from 'fs';
import os from 'os';
import path from 'path';
import { CommandAdapterRegistry } from './command-generation/index.js';
import { AI_TOOLS, getAITool, toolSupportsCommandGeneration } from './config.js';
import type { Delivery } from './global-config.js';
import {
  ALL_WORKFLOWS,
  WORKFLOW_TO_SKILL_DIR,
  getCommandSlug,
  normalizeWorkflowIds,
  type WorkflowId,
} from './workflow-surface.js';
import {
  getSkillTemplates,
  getCommandTemplates,
  getCommandContents,
  type SkillTemplateEntry,
  type CommandTemplateEntry,
} from './shared/skill-generation.js';
import type { CommandContent } from './command-generation/index.js';

export interface WorkflowArtifactPlan {
  workflows: readonly WorkflowId[];
  managedWorkflows: readonly WorkflowId[];
  delivery: Delivery;
  shouldGenerateSkills: boolean;
  shouldGenerateCommands: boolean;
  skillTemplates: SkillTemplateEntry[];
  commandTemplates: CommandTemplateEntry[];
  commandContents: CommandContent[];
  expectedSkillDirNames: string[];
  expectedCommandSlugs: string[];
  managedSkillDirNames: string[];
  managedCommandSlugs: string[];
}

export interface ToolWorkflowDelivery {
  shouldGenerateSkills: boolean;
  shouldGenerateCommands: boolean;
}

export function resolveEffectiveWorkflows(
  projectPath: string,
  workflows: readonly string[]
): readonly WorkflowId[] {
  const effective = new Set<WorkflowId>(normalizeWorkflowIds(workflows));
  const bootstrapDir = path.join(projectPath, 'openspec', 'bootstrap');

  try {
    if (fs.statSync(bootstrapDir).isDirectory()) {
      effective.add('bootstrap-opsx');
    }
  } catch {
    // No bootstrap workspace; keep the requested workflows unchanged.
  }

  return ALL_WORKFLOWS.filter((workflowId) => effective.has(workflowId));
}

export function createWorkflowArtifactPlan(
  workflows: readonly string[],
  delivery: Delivery,
  projectPath?: string
): WorkflowArtifactPlan {
  const normalizedWorkflows = projectPath
    ? resolveEffectiveWorkflows(projectPath, workflows)
    : normalizeWorkflowIds(workflows);
  const shouldGenerateSkills = delivery !== 'commands';
  const shouldGenerateCommands = delivery !== 'skills';
  const skillTemplates = shouldGenerateSkills ? getSkillTemplates(normalizedWorkflows) : [];
  const commandTemplates = shouldGenerateCommands ? getCommandTemplates(normalizedWorkflows) : [];
  const commandContents = shouldGenerateCommands ? getCommandContents(normalizedWorkflows) : [];

  return {
    workflows: normalizedWorkflows,
    managedWorkflows: ALL_WORKFLOWS,
    delivery,
    shouldGenerateSkills,
    shouldGenerateCommands,
    skillTemplates,
    commandTemplates,
    commandContents,
    expectedSkillDirNames: skillTemplates.map((entry) => entry.dirName),
    expectedCommandSlugs: commandTemplates.map((entry) => entry.commandSlug),
    managedSkillDirNames: ALL_WORKFLOWS.map((workflowId) => WORKFLOW_TO_SKILL_DIR[workflowId]),
    managedCommandSlugs: ALL_WORKFLOWS.map((workflowId) => getCommandSlug(workflowId)),
  };
}

export function resolveToolWorkflowDelivery(
  toolId: string,
  delivery: Delivery
): ToolWorkflowDelivery {
  const supportsCommands = toolSupportsCommandGeneration(toolId);
  const keepsSkillsWithoutCommands = toolId === 'codex';

  return {
    shouldGenerateSkills: delivery !== 'commands' || keepsSkillsWithoutCommands,
    shouldGenerateCommands: delivery !== 'skills' && supportsCommands,
  };
}

export function createToolWorkflowArtifactPlan(
  toolId: string,
  workflows: readonly string[],
  delivery: Delivery,
  projectPath?: string
): WorkflowArtifactPlan {
  const normalizedWorkflows = projectPath
    ? resolveEffectiveWorkflows(projectPath, workflows)
    : normalizeWorkflowIds(workflows);
  const effectiveDelivery = resolveToolWorkflowDelivery(toolId, delivery);
  const skillTemplates = effectiveDelivery.shouldGenerateSkills ? getSkillTemplates(normalizedWorkflows) : [];
  const commandTemplates = effectiveDelivery.shouldGenerateCommands ? getCommandTemplates(normalizedWorkflows) : [];
  const commandContents = effectiveDelivery.shouldGenerateCommands ? getCommandContents(normalizedWorkflows) : [];

  return {
    workflows: normalizedWorkflows,
    managedWorkflows: ALL_WORKFLOWS,
    delivery,
    shouldGenerateSkills: effectiveDelivery.shouldGenerateSkills,
    shouldGenerateCommands: effectiveDelivery.shouldGenerateCommands,
    skillTemplates,
    commandTemplates,
    commandContents,
    expectedSkillDirNames: skillTemplates.map((entry) => entry.dirName),
    expectedCommandSlugs: commandTemplates.map((entry) => entry.commandSlug),
    managedSkillDirNames: ALL_WORKFLOWS.map((workflowId) => WORKFLOW_TO_SKILL_DIR[workflowId]),
    managedCommandSlugs: ALL_WORKFLOWS.map((workflowId) => getCommandSlug(workflowId)),
  };
}

export interface PlannedToolArtifacts {
  skillFiles: string[];
  commandFiles: string[];
}

function getLegacyCodexCommandHome(): string {
  const envHome = process.env.CODEX_HOME;
  return path.resolve(envHome ? envHome : path.join(os.homedir(), '.codex'));
}

export function getLegacyManagedCommandFiles(
  toolId: string,
  commandSlugs: readonly string[]
): string[] {
  if (toolId !== 'codex') {
    return [];
  }

  return commandSlugs.map((commandSlug) =>
    path.join(getLegacyCodexCommandHome(), 'prompts', `opsx-${commandSlug}.md`)
  );
}

export function getManagedCommandFiles(
  projectPath: string,
  toolId: string,
  commandSlugs: readonly string[],
  options?: { includeLegacyFiles?: boolean }
): string[] {
  const files: string[] = [];

  if (toolSupportsCommandGeneration(toolId)) {
    const adapter = CommandAdapterRegistry.get(toolId);
    if (adapter) {
      for (const commandSlug of commandSlugs) {
        const commandPath = adapter.getFilePath(commandSlug);
        files.push(path.isAbsolute(commandPath) ? commandPath : path.join(projectPath, commandPath));
      }
    }
  }

  if (options?.includeLegacyFiles) {
    files.push(...getLegacyManagedCommandFiles(toolId, commandSlugs));
  }

  return files;
}

export function getPlannedToolArtifacts(
  projectPath: string,
  toolId: string,
  plan: WorkflowArtifactPlan
): PlannedToolArtifacts {
  const tool = getAITool(toolId);
  if (!tool?.skillsDir) {
    return { skillFiles: [], commandFiles: [] };
  }

  const skillsDir = path.join(projectPath, tool.skillsDir, 'skills');
  const skillFiles = plan.expectedSkillDirNames.map((dirName) =>
    path.join(skillsDir, dirName, 'SKILL.md')
  );

  if (!toolSupportsCommandGeneration(toolId)) {
    return { skillFiles, commandFiles: [] };
  }
  const commandFiles = getManagedCommandFiles(projectPath, toolId, plan.expectedCommandSlugs);

  return { skillFiles, commandFiles };
}
