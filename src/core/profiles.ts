/**
 * Profile System
 *
 * Defines workflow profiles that control which workflows are installed.
 * Profiles determine WHICH workflows; delivery (in global config) determines HOW.
 */

import type { Profile } from './global-config.js';
import {
  ALL_WORKFLOWS,
  CORE_WORKFLOWS,
  EXPANDED_WORKFLOWS,
  normalizeWorkflowIds,
  type WorkflowId,
} from './workflow-surface.js';

export { ALL_WORKFLOWS, CORE_WORKFLOWS, EXPANDED_WORKFLOWS } from './workflow-surface.js';
export type { WorkflowId } from './workflow-surface.js';
export type CoreWorkflowId = (typeof CORE_WORKFLOWS)[number];

/**
 * Resolves which workflows should be active for a given profile configuration.
 */
export function getProfileWorkflows(
  profile: Profile,
  customWorkflows?: string[]
): readonly WorkflowId[] {
  if (profile === 'custom') {
    return normalizeWorkflowIds(customWorkflows);
  }

  if (profile === 'expanded') {
    return EXPANDED_WORKFLOWS;
  }

  return CORE_WORKFLOWS;
}
