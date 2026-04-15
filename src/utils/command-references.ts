/**
 * Command Reference Utilities
 *
 * Utilities for rendering workflow references to tool-specific invocation formats.
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

export function renderWorkflowInvocation(toolId: string, workflowId: WorkflowId): string {
  const workflow = getWorkflowSurfaces([workflowId])[0];

  if (toolId === 'codex') {
    return `$${workflow.skillDirName}`;
  }

  if (toolId === 'opencode') {
    return `/opsx-${workflow.commandSlug}`;
  }

  return `/opsx:${workflow.commandSlug}`;
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

export function getWorkflowReferenceTransformer(toolId: string): ((text: string) => string) | undefined {
  if (toolId === 'codex' || toolId === 'opencode') {
    return (text: string) => transformWorkflowReferences(text, toolId);
  }

  return undefined;
}

/**
 * Transforms colon-based command references to hyphen-based format.
 * Converts `/opsx:` patterns to `/opsx-` for tools that use hyphen syntax.
 *
 * @param text - The text containing command references
 * @returns Text with command references transformed to hyphen format
 *
 * @example
 * transformToHyphenCommands('/opsx:new') // returns '/opsx-new'
 * transformToHyphenCommands('Use /opsx:apply to implement') // returns 'Use /opsx-apply to implement'
 */
export function transformToHyphenCommands(text: string): string {
  return transformWorkflowReferences(text, 'opencode');
}
