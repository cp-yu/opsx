import * as fs from 'fs';
import path from 'path';
import { CommandAdapterRegistry } from './command-generation/index.js';
import { AI_TOOLS } from './config.js';
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

export interface PlannedToolArtifacts {
  skillFiles: string[];
  commandFiles: string[];
}

export function getPlannedToolArtifacts(
  projectPath: string,
  toolId: string,
  plan: WorkflowArtifactPlan
): PlannedToolArtifacts {
  const tool = AI_TOOLS.find((entry) => entry.value === toolId);
  if (!tool?.skillsDir) {
    return { skillFiles: [], commandFiles: [] };
  }

  const skillsDir = path.join(projectPath, tool.skillsDir, 'skills');
  const skillFiles = plan.expectedSkillDirNames.map((dirName) =>
    path.join(skillsDir, dirName, 'SKILL.md')
  );

  const adapter = CommandAdapterRegistry.get(toolId);
  if (!adapter) {
    return { skillFiles, commandFiles: [] };
  }

  const commandFiles = plan.expectedCommandSlugs.map((commandSlug) => {
    const commandPath = adapter.getFilePath(commandSlug);
    return path.isAbsolute(commandPath)
      ? commandPath
      : path.join(projectPath, commandPath);
  });

  return { skillFiles, commandFiles };
}
