/**
 * Skill Generation Utilities
 *
 * Shared utilities for generating skill and command files.
 */

import {
  type SkillTemplate,
  type CommandTemplate,
} from '../templates/skill-templates.js';
import type { CommandContent } from '../command-generation/index.js';
import {
  createArchiveChangeSkillTemplateForExecutionModel,
  createOpsxArchiveCommandTemplateForExecutionModel,
} from '../templates/workflows/archive-change.js';
import { resolveVerifyExecutionModel } from '../templates/workflows/verify-execution-model.js';
import { getReviewerSkillTemplate } from '../templates/workflows/reviewer.js';
import { getOptimizerSkillTemplate } from '../templates/workflows/optimizer.js';
import { getImpactSweeperSkillTemplate } from '../templates/workflows/impact-sweeper.js';
import {
  ALL_WORKFLOWS,
  WORKFLOW_TO_SKILL_DIR,
  getWorkflowSurfaces,
  type CommandId,
  type WorkflowId,
} from '../workflow-surface.js';

/**
 * Internal subagent skill templates.
 *
 * These are NOT workflow entries — they have no command, no promptMeta, no
 * mode membership. They are installed as skill-only files for subagent
 * invoke in verify/apply/archive workflows.
 */
const INTERNAL_SKILL_TEMPLATES: ReadonlyArray<{
  dirName: string;
  getSkillTemplate: () => import('../templates/skill-templates.js').SkillTemplate;
}> = [
  {
    dirName: 'openspec-reviewer',
    getSkillTemplate: getReviewerSkillTemplate,
  },
  {
    dirName: 'openspec-optimizer',
    getSkillTemplate: getOptimizerSkillTemplate,
  },
  {
    dirName: 'openspec-impact-sweeper',
    getSkillTemplate: getImpactSweeperSkillTemplate,
  },
];

export const MANAGED_STALE_INTERNAL_SKILL_DIR_NAMES = ['openspec-implementer'] as const;

export function getManagedSkillDirNames(): string[] {
  return [
    ...ALL_WORKFLOWS.map((workflowId) => WORKFLOW_TO_SKILL_DIR[workflowId]),
    ...MANAGED_STALE_INTERNAL_SKILL_DIR_NAMES,
  ];
}

const EXECUTION_MODEL_SKILL_TEMPLATES: Partial<
  Record<WorkflowId, (executionModel: ReturnType<typeof resolveVerifyExecutionModel>) => SkillTemplate>
> = {
  archive: createArchiveChangeSkillTemplateForExecutionModel,
};

const EXECUTION_MODEL_COMMAND_TEMPLATES: Partial<
  Record<WorkflowId, (executionModel: ReturnType<typeof resolveVerifyExecutionModel>) => CommandTemplate>
> = {
  archive: createOpsxArchiveCommandTemplateForExecutionModel,
};

/**
 * Skill template with directory name and workflow ID mapping.
 */
export interface SkillTemplateEntry {
  template: SkillTemplate;
  dirName: string;
  workflowId: string;
}

/**
 * Command template with ID mapping.
 */
export interface CommandTemplateEntry {
  template: CommandTemplate;
  id: CommandId;
  commandSlug: string;
}

function resolveSkillTemplate(
  workflowId: WorkflowId,
  toolId: string | undefined,
  fallback: () => SkillTemplate
): SkillTemplate {
  const createTemplate = EXECUTION_MODEL_SKILL_TEMPLATES[workflowId];
  if (createTemplate) {
    return createTemplate(resolveVerifyExecutionModel(toolId));
  }

  return fallback();
}

function resolveCommandTemplate(
  workflowId: WorkflowId,
  toolId: string | undefined,
  fallback: () => CommandTemplate
): CommandTemplate {
  const createTemplate = EXECUTION_MODEL_COMMAND_TEMPLATES[workflowId];
  if (createTemplate) {
    return createTemplate(resolveVerifyExecutionModel(toolId));
  }

  return fallback();
}

/**
 * Gets skill templates with their directory names, optionally filtered by workflow IDs.
 *
 * @param workflowFilter - If provided, only return templates whose workflowId is in this array
 */
export function getSkillTemplates(
  workflowFilter?: readonly string[],
  toolId?: string
): SkillTemplateEntry[] {
  const workflowSurfaces = getWorkflowSurfaces(workflowFilter).map((entry) => ({
    template: resolveSkillTemplate(entry.workflowId, toolId, entry.getSkillTemplate),
    dirName: entry.skillDirName,
    workflowId: entry.workflowId,
  }));

  // Internal skill templates are always included — they are part of every
  // installation (both core and expanded presets).
  const internalEntries: SkillTemplateEntry[] = INTERNAL_SKILL_TEMPLATES.map((entry) => ({
    template: entry.getSkillTemplate(),
    dirName: entry.dirName,
    workflowId: entry.dirName,
  }));

  return [...workflowSurfaces, ...internalEntries];
}

/**
 * Gets command templates with their IDs, optionally filtered by workflow IDs.
 *
 * @param workflowFilter - If provided, only return templates whose id is in this array
 */
export function getCommandTemplates(
  workflowFilter?: readonly string[],
  toolId?: string
): CommandTemplateEntry[] {
  return getWorkflowSurfaces(workflowFilter)
    .filter((entry) => entry.getCommandTemplate !== undefined)
    .map((entry) => ({
      template: resolveCommandTemplate(entry.workflowId, toolId, entry.getCommandTemplate!),
      id: entry.workflowId,
      commandSlug: entry.commandSlug,
    }));
}

/**
 * Converts command templates to CommandContent array, optionally filtered by workflow IDs.
 *
 * @param workflowFilter - If provided, only return contents whose id is in this array
 */
export function getCommandContents(
  workflowFilter?: readonly string[],
  toolId?: string
): CommandContent[] {
  const commandTemplates = getCommandTemplates(workflowFilter, toolId);
  return commandTemplates.map(({ template, id, commandSlug }) => ({
    id,
    commandSlug,
    name: template.name,
    description: template.description,
    category: template.category,
    tags: template.tags,
    body: template.content,
  }));
}

function escapeYamlString(value: string): string {
  return `"${value
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')}"`;
}

/**
 * Generates skill file content with YAML frontmatter.
 *
 * @param template - The skill template
 * @param generatedByVersion - The OpenSpec version to embed in the file
 * @param transformInstructions - Optional callback to transform the instructions content
 */
export function generateSkillContent(
  template: SkillTemplate,
  generatedByVersion: string,
  transformInstructions?: (instructions: string) => string
): string {
  const instructions = transformInstructions
    ? transformInstructions(template.instructions)
    : template.instructions;

  return `---
name: ${escapeYamlString(template.name)}
description: ${escapeYamlString(template.description)}
license: ${escapeYamlString(template.license || 'MIT')}
compatibility: ${escapeYamlString(template.compatibility || 'Requires openspec CLI.')}
metadata:
  author: ${escapeYamlString(template.metadata?.author || 'openspec')}
  version: ${escapeYamlString(template.metadata?.version || '1.0')}
  generatedBy: ${escapeYamlString(generatedByVersion)}
---

${instructions}
`;
}
