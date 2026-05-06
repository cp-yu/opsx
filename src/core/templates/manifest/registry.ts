/**
 * Canonical Workflow Manifest Registry.
 *
 * Single source of truth for all workflow artifact definitions.
 * Projections (skill names, command IDs, workflow lists) are derived from this registry.
 */

import {
  getExploreSkillTemplate,
  getOpsxExploreCommandTemplate,
  getNewChangeSkillTemplate,
  getOpsxNewCommandTemplate,
  getContinueChangeSkillTemplate,
  getOpsxContinueCommandTemplate,
  getApplyChangeSkillTemplate,
  getOpsxApplyCommandTemplate,
  getFfChangeSkillTemplate,
  getOpsxFfCommandTemplate,
  getSyncSpecsSkillTemplate,
  getOpsxSyncCommandTemplate,
  getArchiveChangeSkillTemplate,
  getOpsxArchiveCommandTemplate,
  getBulkArchiveChangeSkillTemplate,
  getOpsxBulkArchiveCommandTemplate,
  getVerifyChangeSkillTemplate,
  getOpsxVerifyCommandTemplate,
  getOnboardSkillTemplate,
  getOpsxOnboardCommandTemplate,
  getOpsxProposeSkillTemplate,
  getOpsxProposeCommandTemplate,
  getBootstrapOpsxSkillTemplate,
  getOpsxBootstrapCommandTemplate,
} from '../skill-templates.js';

import type { WorkflowManifestEntry, WorkflowPreset } from './types.js';

// ---------------------------------------------------------------------------
// Manifest entries
// ---------------------------------------------------------------------------

const MANIFEST_ENTRIES: readonly WorkflowManifestEntry[] = [
  {
    workflowId: 'propose',
    modeMembership: ['core', 'expanded'],
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
    modeMembership: ['core', 'expanded'],
    skillDirName: 'openspec-explore',
    skillName: 'openspec-explore',
    commandSlug: 'explore',
    promptMeta: {
      name: 'Explore ideas',
      description: 'Investigate a problem before implementation',
    },
    getSkillTemplate: getExploreSkillTemplate,
    getCommandTemplate: getOpsxExploreCommandTemplate,
  },
  {
    workflowId: 'new',
    modeMembership: ['expanded'],
    skillDirName: 'openspec-new-change',
    skillName: 'openspec-new-change',
    commandSlug: 'new',
    promptMeta: {
      name: 'New change',
      description: 'Create a new change scaffold quickly',
    },
    getSkillTemplate: getNewChangeSkillTemplate,
    getCommandTemplate: getOpsxNewCommandTemplate,
  },
  {
    workflowId: 'continue',
    modeMembership: ['expanded'],
    skillDirName: 'openspec-continue-change',
    skillName: 'openspec-continue-change',
    commandSlug: 'continue',
    promptMeta: {
      name: 'Continue change',
      description: 'Resume work on an existing change',
    },
    getSkillTemplate: getContinueChangeSkillTemplate,
    getCommandTemplate: getOpsxContinueCommandTemplate,
  },
  {
    workflowId: 'apply',
    modeMembership: ['core', 'expanded'],
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
    workflowId: 'ff',
    modeMembership: ['expanded'],
    skillDirName: 'openspec-ff-change',
    skillName: 'openspec-ff-change',
    commandSlug: 'ff',
    promptMeta: {
      name: 'Fast-forward',
      description: 'Run a faster implementation workflow',
    },
    getSkillTemplate: getFfChangeSkillTemplate,
    getCommandTemplate: getOpsxFfCommandTemplate,
  },
  {
    workflowId: 'sync',
    modeMembership: ['expanded'],
    skillDirName: 'openspec-sync-specs',
    skillName: 'openspec-sync-specs',
    commandSlug: 'sync',
    promptMeta: {
      name: 'Sync specs',
      description: 'Sync change artifacts with specs and OPSX files',
    },
    getSkillTemplate: getSyncSpecsSkillTemplate,
    getCommandTemplate: getOpsxSyncCommandTemplate,
  },
  {
    workflowId: 'archive',
    modeMembership: ['core', 'expanded'],
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
    workflowId: 'bulk-archive',
    modeMembership: ['expanded'],
    skillDirName: 'openspec-bulk-archive-change',
    skillName: 'openspec-bulk-archive-change',
    commandSlug: 'bulk-archive',
    promptMeta: {
      name: 'Bulk archive',
      description: 'Archive multiple completed changes together',
    },
    getSkillTemplate: getBulkArchiveChangeSkillTemplate,
    getCommandTemplate: getOpsxBulkArchiveCommandTemplate,
  },
  {
    workflowId: 'verify',
    modeMembership: ['expanded'],
    skillDirName: 'openspec-verify-change',
    skillName: 'openspec-verify-change',
    commandSlug: 'verify',
    promptMeta: {
      name: 'Verify change',
      description: 'Run verification checks against a change',
    },
    getSkillTemplate: getVerifyChangeSkillTemplate,
    getCommandTemplate: getOpsxVerifyCommandTemplate,
  },
  {
    workflowId: 'onboard',
    modeMembership: ['expanded'],
    skillDirName: 'openspec-onboard',
    skillName: 'openspec-onboard',
    commandSlug: 'onboard',
    promptMeta: {
      name: 'Onboard',
      description: 'Guided onboarding flow for OpenSpec',
    },
    getSkillTemplate: getOnboardSkillTemplate,
    getCommandTemplate: getOpsxOnboardCommandTemplate,
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

  getWorkflowsForPreset(preset: WorkflowPreset): readonly string[] {
    return MANIFEST_ENTRIES
      .filter((e) => (e.modeMembership as readonly WorkflowPreset[]).includes(preset))
      .map((e) => e.workflowId);
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
