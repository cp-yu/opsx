import * as fs from 'fs';
import path from 'path';
import { AI_TOOLS, getAITool } from './config.js';
import {
  ALL_WORKFLOWS,
  getCommandSlug,
  normalizeWorkflowIds,
  type WorkflowId,
} from './workflow-surface.js';
import {
  getSkillTemplates,
  getManagedSkillDirNames,
  type SkillTemplateEntry,
} from './shared/skill-generation.js';
import { collectSharedReferenceFiles } from './templates/sync-engine.js';

export { MANAGED_STALE_INTERNAL_SKILL_DIR_NAMES } from './shared/skill-generation.js';

export interface WorkflowArtifactPlan {
  workflows: readonly WorkflowId[];
  managedWorkflows: readonly WorkflowId[];
  shouldGenerateSkills: boolean;
  skillTemplates: SkillTemplateEntry[];
  expectedSkillDirNames: string[];
  managedSkillDirNames: string[];
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
  projectPath?: string
): WorkflowArtifactPlan {
  const normalizedWorkflows = projectPath
    ? resolveEffectiveWorkflows(projectPath, workflows)
    : normalizeWorkflowIds(workflows);
  const skillTemplates = getSkillTemplates(normalizedWorkflows);

  return {
    workflows: normalizedWorkflows,
    managedWorkflows: ALL_WORKFLOWS,
    shouldGenerateSkills: true,
    skillTemplates,
    expectedSkillDirNames: skillTemplates.map((entry) => entry.dirName),
    managedSkillDirNames: getManagedSkillDirNames(),
  };
}

export function createToolWorkflowArtifactPlan(
  toolId: string,
  workflows: readonly string[],
  projectPath?: string
): WorkflowArtifactPlan {
  const normalizedWorkflows = projectPath
    ? resolveEffectiveWorkflows(projectPath, workflows)
    : normalizeWorkflowIds(workflows);
  const skillTemplates = getSkillTemplates(normalizedWorkflows, toolId);

  return {
    workflows: normalizedWorkflows,
    managedWorkflows: ALL_WORKFLOWS,
    shouldGenerateSkills: true,
    skillTemplates,
    expectedSkillDirNames: skillTemplates.map((entry) => entry.dirName),
    managedSkillDirNames: getManagedSkillDirNames(),
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
  const tool = getAITool(toolId);
  if (!tool?.skillsDir) {
    return { skillFiles: [], commandFiles: [] };
  }

  const skillsDir = path.join(projectPath, tool.skillsDir, 'skills');
  const referenceFiles = collectSharedReferenceFiles(plan.skillTemplates).map((referenceFile) =>
    path.join(projectPath, 'openspec', 'references', referenceFile.fileName)
  );
  const skillFiles = plan.skillTemplates.flatMap((entry) => {
    const skillDir = path.join(skillsDir, entry.dirName);
    return [path.join(skillDir, 'SKILL.md')];
  });
  skillFiles.push(...referenceFiles);

  return { skillFiles, commandFiles: [] };
}
