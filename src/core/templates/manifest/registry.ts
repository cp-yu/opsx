/**
 * Canonical Workflow Manifest Registry.
 *
 * Single source of truth for all workflow artifact definitions.
 * Projections (skill names, command IDs, workflow lists) are derived from this registry.
 */

import {
  getExploreSkillTemplate,
  getApplyChangeSkillTemplate,
  getOpsxApplyCommandTemplate,
  getArchiveChangeSkillTemplate,
  getOpsxArchiveCommandTemplate,
  getOpsxProposeSkillTemplate,
  getOpsxProposeCommandTemplate,
  getBootstrapOpsxSkillTemplate,
  getOpsxBootstrapCommandTemplate,
  getSnackSkillTemplate,
} from '../skill-templates.js';

import type { WorkflowManifestEntry } from './types.js';

// ---------------------------------------------------------------------------
// Manifest entries
// ---------------------------------------------------------------------------

const MANIFEST_ENTRIES: readonly WorkflowManifestEntry[] = [
  {
    workflowId: 'propose',
    modeMembership: ['core'],
    skillDirName: 'openspec-propose',
    skillName: 'openspec-propose',
    commandSlug: 'propose',
    promptMeta: {
      name: 'Propose change',
      description: 'Create proposal, design, and tasks from a request',
    },
    getSkillTemplate: getOpsxProposeSkillTemplate,
    getCommandTemplate: getOpsxProposeCommandTemplate,
  },
  {
    workflowId: 'explore',
    modeMembership: ['core'],
    skillDirName: 'openspec-explore',
    skillName: 'openspec-explore',
    commandSlug: 'explore',
    promptMeta: {
      name: 'Explore ideas',
      description: 'Investigate a problem before implementation',
    },
    getSkillTemplate: getExploreSkillTemplate,
  },
  {
    workflowId: 'apply',
    modeMembership: ['core'],
    skillDirName: 'openspec-apply-change',
    skillName: 'openspec-apply-change',
    commandSlug: 'apply',
    promptMeta: {
      name: 'Apply tasks',
      description: 'Implement tasks from the current change',
    },
    getSkillTemplate: getApplyChangeSkillTemplate,
    getCommandTemplate: getOpsxApplyCommandTemplate,
  },
  {
    workflowId: 'archive',
    modeMembership: ['core'],
    skillDirName: 'openspec-archive-change',
    skillName: 'openspec-archive-change',
    commandSlug: 'archive',
    promptMeta: {
      name: 'Archive change',
      description: 'Finalize and archive a completed change',
    },
    getSkillTemplate: getArchiveChangeSkillTemplate,
    getCommandTemplate: getOpsxArchiveCommandTemplate,
  },
  {
    workflowId: 'bootstrap-opsx',
    modeMembership: [],
    skillDirName: 'openspec-bootstrap-opsx',
    skillName: 'openspec-bootstrap-opsx',
    commandSlug: 'bootstrap',
    promptMeta: {
      name: 'Bootstrap OPSX',
      description: 'Bootstrap project OPSX structure for architecture tracking',
    },
    getSkillTemplate: getBootstrapOpsxSkillTemplate,
    getCommandTemplate: getOpsxBootstrapCommandTemplate,
  },
  {
    workflowId: 'snack',
    modeMembership: ['flexible'],
    skillDirName: 'openspec-snack',
    skillName: 'openspec-snack',
    commandSlug: 'snack',
    promptMeta: {
      name: 'Snack sync',
      description: 'Quick sync from code to specs',
    },
    getSkillTemplate: getSnackSkillTemplate,
  },
];

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

const BY_ID = new Map<string, WorkflowManifestEntry>(
  MANIFEST_ENTRIES.map((e) => [e.workflowId, e])
);

export const WorkflowManifestRegistry = {
  entries: MANIFEST_ENTRIES,

  get(workflowId: string): WorkflowManifestEntry | undefined {
    return BY_ID.get(workflowId);
  },

  has(workflowId: string): boolean {
    return BY_ID.has(workflowId);
  },

  getAllWorkflowIds(): readonly string[] {
    return MANIFEST_ENTRIES.map((e) => e.workflowId);
  },

  getSkillNames(): readonly string[] {
    return MANIFEST_ENTRIES.map((e) => e.skillDirName);
  },

  getCommandSlugMap(): Record<string, string> {
    return Object.fromEntries(MANIFEST_ENTRIES.map((e) => [e.workflowId, e.commandSlug]));
  },

  getSkillDirMap(): Record<string, string> {
    return Object.fromEntries(MANIFEST_ENTRIES.map((e) => [e.workflowId, e.skillDirName]));
  },

  filterByWorkflowIds(workflowFilter?: readonly string[]): readonly WorkflowManifestEntry[] {
    if (!workflowFilter || workflowFilter.length === 0) {
      return MANIFEST_ENTRIES;
    }
    const filter = new Set(workflowFilter);
    return MANIFEST_ENTRIES.filter((e) => filter.has(e.workflowId));
  },
} as const;
