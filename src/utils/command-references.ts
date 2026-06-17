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
 * Tools with precise, known skill invocation syntax.
 * Lookup is explicit; tools not in this map fall back to neutral text.
 */
const PRECISE_SKILL_INVOCATION_TOOLS = new Set<string>(['codex']);

/**
 * Render a workflow invocation for a specific tool.
 *
 * - Codex uses `$<skillDirName>` (precise skill invocation metadata).
 * - Other tools without precise metadata use a neutral skill invocation phrase
 *   that references the explicit skill directory name.
 */
export function renderWorkflowInvocation(toolId: string, workflowId: WorkflowId): string {
  const workflow = getWorkflowSurfaces([workflowId])[0];

  if (PRECISE_SKILL_INVOCATION_TOOLS.has(toolId)) {
    return `$${workflow.skillDirName}`;
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

/**
 * Returns the neutral skill invocation phrase for opencode-style transforms.
 *
 * Skills-only surface: opencode lacks precise metadata, so we emit a neutral
 * skill invocation phrase instead of `/opsx-*` command syntax.
 */
export function transformToHyphenCommands(text: string): string {
  return transformWorkflowReferences(text, 'opencode');
}
