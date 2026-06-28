import {
  type WorkflowPreset,
  type WorkflowPromptMeta,
  type WorkflowManifestEntry,
  WorkflowManifestRegistry,
} from './templates/manifest/index.js';

export type { WorkflowPreset, WorkflowPromptMeta };

type WorkflowSurfaceDefinition = WorkflowManifestEntry;

export const WORKFLOW_SURFACE_MANIFEST: readonly WorkflowSurfaceDefinition[] =
  WorkflowManifestRegistry.entries as unknown as readonly WorkflowSurfaceDefinition[];

export type WorkflowId = (typeof WORKFLOW_SURFACE_MANIFEST)[number]['workflowId'];
export type SkillName = (typeof WORKFLOW_SURFACE_MANIFEST)[number]['skillDirName'];
export type CommandId = WorkflowId;

export const ALL_WORKFLOWS = WorkflowManifestRegistry.getAllWorkflowIds() as unknown as readonly WorkflowId[];

export const SKILL_NAMES = WorkflowManifestRegistry.getSkillNames() as unknown as readonly SkillName[];

export const COMMAND_IDS = ALL_WORKFLOWS;

export const WORKFLOW_TO_COMMAND_SLUG = WorkflowManifestRegistry.getCommandSlugMap() as Record<WorkflowId, string>;

export const WORKFLOW_TO_SKILL_DIR = WorkflowManifestRegistry.getSkillDirMap() as Record<WorkflowId, SkillName>;

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
  return [...WorkflowManifestRegistry.filterByWorkflowIds(workflowFilter)] as unknown as readonly WorkflowSurfaceDefinition[];
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
  return (ALL_WORKFLOWS as unknown as readonly string[]).filter((workflowId) => selected.has(workflowId)) as WorkflowId[];
}
