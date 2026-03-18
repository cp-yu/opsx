import {
  getExploreSkillTemplate,
  getNewChangeSkillTemplate,
  getContinueChangeSkillTemplate,
  getApplyChangeSkillTemplate,
  getFfChangeSkillTemplate,
  getSyncSpecsSkillTemplate,
  getArchiveChangeSkillTemplate,
  getBulkArchiveChangeSkillTemplate,
  getVerifyChangeSkillTemplate,
  getOnboardSkillTemplate,
  getOpsxProposeSkillTemplate,
  getBootstrapOpsxSkillTemplate,
  getOpsxExploreCommandTemplate,
  getOpsxNewCommandTemplate,
  getOpsxContinueCommandTemplate,
  getOpsxApplyCommandTemplate,
  getOpsxFfCommandTemplate,
  getOpsxSyncCommandTemplate,
  getOpsxArchiveCommandTemplate,
  getOpsxBulkArchiveCommandTemplate,
  getOpsxVerifyCommandTemplate,
  getOpsxOnboardCommandTemplate,
  getOpsxProposeCommandTemplate,
  getOpsxBootstrapCommandTemplate,
  type SkillTemplate,
  type CommandTemplate,
} from './templates/skill-templates.js';

export type WorkflowPreset = 'core' | 'expanded';

export interface WorkflowPromptMeta {
  name: string;
  description: string;
}

interface WorkflowSurfaceDefinition {
  workflowId: string;
  modeMembership: readonly WorkflowPreset[];
  skillDirName: string;
  skillName: string;
  commandSlug: string;
  promptMeta: WorkflowPromptMeta;
  getSkillTemplate: () => SkillTemplate;
  getCommandTemplate: () => CommandTemplate;
}

export const WORKFLOW_SURFACE_MANIFEST = [
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
] as const satisfies readonly WorkflowSurfaceDefinition[];

export type WorkflowId = (typeof WORKFLOW_SURFACE_MANIFEST)[number]['workflowId'];
export type SkillName = (typeof WORKFLOW_SURFACE_MANIFEST)[number]['skillDirName'];
export type CommandId = WorkflowId;

export const ALL_WORKFLOWS = WORKFLOW_SURFACE_MANIFEST.map(
  (entry) => entry.workflowId
) as readonly WorkflowId[];

export const CORE_WORKFLOWS = WORKFLOW_SURFACE_MANIFEST.filter((entry) =>
  (entry.modeMembership as readonly WorkflowPreset[]).includes('core')
).map((entry) => entry.workflowId) as readonly WorkflowId[];

export const EXPANDED_WORKFLOWS = WORKFLOW_SURFACE_MANIFEST.filter((entry) =>
  (entry.modeMembership as readonly WorkflowPreset[]).includes('expanded')
).map((entry) => entry.workflowId) as readonly WorkflowId[];

export const SKILL_NAMES = WORKFLOW_SURFACE_MANIFEST.map(
  (entry) => entry.skillDirName
) as readonly SkillName[];

export const COMMAND_IDS = ALL_WORKFLOWS;

export const WORKFLOW_TO_COMMAND_SLUG = Object.fromEntries(
  WORKFLOW_SURFACE_MANIFEST.map((entry) => [entry.workflowId, entry.commandSlug])
) as Record<WorkflowId, string>;

export const WORKFLOW_TO_SKILL_DIR = Object.fromEntries(
  WORKFLOW_SURFACE_MANIFEST.map((entry) => [entry.workflowId, entry.skillDirName])
) as Record<WorkflowId, SkillName>;

const WORKFLOW_SURFACE_BY_ID = new Map<WorkflowId, (typeof WORKFLOW_SURFACE_MANIFEST)[number]>(
  WORKFLOW_SURFACE_MANIFEST.map((entry) => [entry.workflowId, entry])
);

export function isWorkflowId(value: string): value is WorkflowId {
  return WORKFLOW_SURFACE_BY_ID.has(value as WorkflowId);
}

export function getWorkflowSurface(workflowId: WorkflowId) {
  return WORKFLOW_SURFACE_BY_ID.get(workflowId)!;
}

export function getWorkflowSurfaces(workflowFilter?: readonly string[]) {
  if (!workflowFilter) {
    return [...WORKFLOW_SURFACE_MANIFEST];
  }

  const filter = new Set(normalizeWorkflowIds(workflowFilter));
  return WORKFLOW_SURFACE_MANIFEST.filter((entry) => filter.has(entry.workflowId));
}

export function getCommandSlug(workflowId: WorkflowId): string {
  return getWorkflowSurface(workflowId).commandSlug;
}

export function getWorkflowPromptMeta(workflowId: string): WorkflowPromptMeta | undefined {
  if (!isWorkflowId(workflowId)) {
    return undefined;
  }
  return getWorkflowSurface(workflowId).promptMeta;
}

export function normalizeWorkflowIds(workflows?: readonly string[]): WorkflowId[] {
  if (!workflows) {
    return [];
  }

  const selected = new Set(workflows.filter(isWorkflowId));
  return ALL_WORKFLOWS.filter((workflowId) => selected.has(workflowId));
}
