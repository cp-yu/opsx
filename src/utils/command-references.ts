/**
 * Workflow Reference Utilities
 *
 * Utilities for rendering workflow references to tool-specific invocation formats.
 * Skills-only workflow surface: tools without precise skill invocation metadata
 * receive a neutral skill invocation phrase rather than command syntax.
 */

import { getWorkflowSurfaces, type WorkflowId } from '../core/workflow-surface.js';

interface RegisteredWorkflowReference {
  workflowId: WorkflowId;
  source: string;
}

const REGISTERED_WORKFLOW_REFERENCES: readonly RegisteredWorkflowReference[] = getWorkflowSurfaces().map(
  (entry) => ({
    workflowId: entry.workflowId,
    source: `/opsx:${entry.commandSlug}`,
  })
);

/**
 * Render a workflow invocation for a specific tool.
 *
 * - Codex uses `$<skillDirName>` (precise skill invocation metadata).
 * - Claude uses `/<skillDirName>`.
 * - Pi uses `/skill:<skillDirName>`.
 * - OpenCode uses `/opsx-<commandSlug>`.
 * - Other tools use a neutral skill invocation phrase.
 */
export function renderWorkflowInvocation(toolId: string, workflowId: WorkflowId): string {
  const workflow = getWorkflowSurfaces([workflowId])[0];

  if (toolId === 'codex') {
    return `$${workflow.skillDirName}`;
  }
  if (toolId === 'claude') {
    return `/${workflow.skillDirName}`;
  }
  if (toolId === 'pi') {
    return `/skill:${workflow.skillDirName}`;
  }
  if (toolId === 'opencode') {
    return `/opsx-${workflow.commandSlug}`;
  }

  return `invoke the ${workflow.skillDirName} skill`;
}

export function transformWorkflowReferences(text: string, toolId: string): string {
  let transformed = text;

  for (const reference of REGISTERED_WORKFLOW_REFERENCES) {
    const target = renderWorkflowInvocation(toolId, reference.workflowId);
    if (target === reference.source) {
      continue;
    }
    transformed = transformed.split(reference.source).join(target);
  }

  return transformed;
}

export function transformToHyphenCommands(text: string): string {
  return transformWorkflowReferences(text, 'opencode');
}
