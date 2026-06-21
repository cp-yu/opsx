/**
 * Workflow manifest types.
 * Canonical source-of-truth types for workflow artifact generation.
 */

import type { SkillTemplate, CommandTemplate } from '../types.js';

export type WorkflowPreset = 'core' | 'flexible';

export interface WorkflowPromptMeta {
  name: string;
  description: string;
}

export interface WorkflowManifestEntry {
  workflowId: string;
  modeMembership: readonly WorkflowPreset[];
  skillDirName: string;
  skillName: string;
  commandSlug: string;
  promptMeta: WorkflowPromptMeta;
  getSkillTemplate: () => SkillTemplate;
  getCommandTemplate?: () => CommandTemplate;
}

export type WorkflowId = string;
export type SkillName = string;
