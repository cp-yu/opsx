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
import { getClaudeOpsxVerifyCommandTemplate, getClaudeVerifyChangeSkillTemplate } from '../templates/workflows/.claude/verify-change.js';
import { getCodexVerifyChangeSkillTemplate } from '../templates/workflows/.codex/verify-change.js';
import { getWorkflowSurfaces, type CommandId, type WorkflowId } from '../workflow-surface.js';

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
  if (workflowId === 'verify') {
    if (toolId === 'claude') {
      return getClaudeVerifyChangeSkillTemplate();
    }
    if (toolId === 'codex') {
      return getCodexVerifyChangeSkillTemplate();
    }
  }

  return fallback();
}

function resolveCommandTemplate(
  workflowId: WorkflowId,
  toolId: string | undefined,
  fallback: () => CommandTemplate
): CommandTemplate {
  if (workflowId === 'verify' && toolId === 'claude') {
    return getClaudeOpsxVerifyCommandTemplate();
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
  return getWorkflowSurfaces(workflowFilter).map((entry) => ({
    template: resolveSkillTemplate(entry.workflowId, toolId, entry.getSkillTemplate),
    dirName: entry.skillDirName,
    workflowId: entry.workflowId,
  }));
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
  return getWorkflowSurfaces(workflowFilter).map((entry) => ({
    template: resolveCommandTemplate(entry.workflowId, toolId, entry.getCommandTemplate),
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
name: ${template.name}
description: ${template.description}
license: ${template.license || 'MIT'}
compatibility: ${template.compatibility || 'Requires openspec CLI.'}
metadata:
  author: ${template.metadata?.author || 'openspec'}
  version: "${template.metadata?.version || '1.0'}"
  generatedBy: "${generatedByVersion}"
---

${instructions}
`;
}
