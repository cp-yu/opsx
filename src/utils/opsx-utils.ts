import { promises as fs } from 'fs';
import path from 'path';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import { z } from 'zod';
import { FileSystemUtils } from './file-system.js';

export const OPSX_SCHEMA_VERSION = 1;

export const OPSX_PATHS = {
  PROJECT_FILE: 'openspec/project.opsx.yaml',
  RELATIONS_FILE: 'openspec/project.opsx.relations.yaml',
  CODE_MAP_FILE: 'openspec/project.opsx.code-map.yaml',
  deltaPath: (changeName: string) => `openspec/changes/${changeName}/opsx-delta.yaml`,
} as const;

/**
 * Zod Schemas for OPSX structures
 */

const NodeIdSchema = z.string().regex(/^(cap|dom|inv|ifc|dec|rel|evd)\./);

const ProgressSchema = z.object({
  phase: z.enum(['implementing', 'verifying']),
}).optional();

const BaseNodeSchema = z.object({
  id: NodeIdSchema,
  intent: z.string().optional(),
  status: z.enum(['draft', 'active']).optional(),
  progress: ProgressSchema,
});

// Capability node
export const CapabilityNodeSchema = BaseNodeSchema.extend({
  type: z.literal('capability'),
  domain: z.string().optional(),
});

// Domain node
export const DomainNodeSchema = BaseNodeSchema.extend({
  type: z.literal('domain'),
  boundary: z.string().optional(),
});

// Invariant node
export const InvariantNodeSchema = BaseNodeSchema.extend({
  type: z.literal('invariant'),
  property: z.string().optional(),
});

// Interface node
export const InterfaceNodeSchema = BaseNodeSchema.extend({
  type: z.literal('interface'),
  protocol: z.string().optional(),
});

// Decision node
export const DecisionNodeSchema = BaseNodeSchema.extend({
  type: z.literal('decision'),
  rationale: z.string().optional(),
});

// Evidence node
export const EvidenceNodeSchema = BaseNodeSchema.extend({
  type: z.literal('evidence'),
  source: z.string().optional(),
});

// Union of all node types
export const OpsxNodeSchema = z.union([
  CapabilityNodeSchema,
  DomainNodeSchema,
  InvariantNodeSchema,
  InterfaceNodeSchema,
  DecisionNodeSchema,
  EvidenceNodeSchema,
]);

// Relation schema
export const OpsxRelationSchema = z.object({
  from: NodeIdSchema,
  type: z.enum(['contains', 'depends_on', 'constrains', 'implemented_by', 'verified_by', 'relates_to']),
  to: NodeIdSchema,
  metadata: z.record(z.string(), z.string()).optional(),
});

const ProjectMetadataSchema = z.object({
  id: z.string(),
  name: z.string(),
  intent: z.string().optional(),
  scope: z.string().optional(),
  roots: z.array(z.object({ path: z.string() })).optional(),
});

// Code reference schema (for code-map file)
export const CodeRefSchema = z.object({
  path: z.string(),
  line_start: z.number().optional(),
  line_end: z.number().optional(),
});

// --- Disk file schemas ---

export const ProjectOpsxFileSchema = z.object({
  schema_version: z.number(),
  project: ProjectMetadataSchema,
  domains: z.array(DomainNodeSchema).optional(),
  capabilities: z.array(CapabilityNodeSchema).optional(),
  invariants: z.array(InvariantNodeSchema).optional(),
  interfaces: z.array(InterfaceNodeSchema).optional(),
  decisions: z.array(DecisionNodeSchema).optional(),
  evidence: z.array(EvidenceNodeSchema).optional(),
});

export const ProjectOpsxRelationsFileSchema = z.object({
  schema_version: z.number(),
  relations: z.array(OpsxRelationSchema),
});

const CodeMapEntrySchema = z.object({
  id: NodeIdSchema,
  refs: z.array(CodeRefSchema),
});

export const ProjectOpsxCodeMapFileSchema = z.object({
  schema_version: z.number(),
  generated_at: z.string().optional(),
  nodes: z.array(CodeMapEntrySchema),
});

// --- Runtime bundle (merged view) ---

export interface ProjectOpsxBundle {
  schema_version: number;
  project: z.infer<typeof ProjectMetadataSchema>;
  domains: z.infer<typeof DomainNodeSchema>[];
  capabilities: z.infer<typeof CapabilityNodeSchema>[];
  invariants?: z.infer<typeof InvariantNodeSchema>[];
  interfaces?: z.infer<typeof InterfaceNodeSchema>[];
  decisions?: z.infer<typeof DecisionNodeSchema>[];
  evidence?: z.infer<typeof EvidenceNodeSchema>[];
  relations: z.infer<typeof OpsxRelationSchema>[];
  code_map: z.infer<typeof CodeMapEntrySchema>[];
}

const DeltaCollectionSchema = z.object({
  domains: z.array(DomainNodeSchema).optional(),
  capabilities: z.array(CapabilityNodeSchema).optional(),
  relations: z.array(OpsxRelationSchema).optional(),
});

export const OpsxDeltaSchema = z.object({
  schema_version: z.number().optional(),
  ADDED: DeltaCollectionSchema.optional(),
  MODIFIED: DeltaCollectionSchema.optional(),
  REMOVED: DeltaCollectionSchema.optional(),
});

// TypeScript types
export type OpsxNode = z.infer<typeof OpsxNodeSchema>;
export type OpsxRelation = z.infer<typeof OpsxRelationSchema>;
export type ProjectOpsxFile = z.infer<typeof ProjectOpsxFileSchema>;
export type OpsxDelta = z.infer<typeof OpsxDeltaSchema>;
export type CodeMapEntry = z.infer<typeof CodeMapEntrySchema>;

interface DeltaCounts {
  domains: number;
  capabilities: number;
  relations: number;
}

export interface OpsxDeltaApplyResult {
  bundle: ProjectOpsxBundle;
  counts: {
    added: DeltaCounts;
    modified: DeltaCounts;
    removed: DeltaCounts;
  };
  changed: boolean;
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

// WHY: Legacy files use `implemented` status and embed code_refs/spec_refs in nodes.
// This normalizer converts them to the new schema during the migration window.
export function normalizeFromLegacy(raw: any): ProjectOpsxBundle {
  const nodes = [
    ...(raw.domains || []),
    ...(raw.capabilities || []),
    ...(raw.invariants || []),
    ...(raw.interfaces || []),
    ...(raw.decisions || []),
    ...(raw.evidence || []),
  ];

  // Extract code_refs from nodes into code_map
  const code_map: CodeMapEntry[] = [];
  for (const node of nodes) {
    if (node.code_refs?.length) {
      code_map.push({
        id: node.id,
        refs: node.code_refs.map((ref: any) => ({
          path: ref.path,
          ...(ref.line_start != null ? { line_start: ref.line_start } : {}),
          ...(ref.line_end != null ? { line_end: ref.line_end } : {}),
          ...(ref.line != null && ref.line_start == null ? { line_start: ref.line } : {}),
        })),
      });
    }
  }

  const stripNode = (node: any) => {
    const { code_refs, spec_refs, status, ...rest } = node;
    const normalized: any = { ...rest };
    if (status === 'implemented') normalized.status = 'active';
    else if (status === 'deprecated') normalized.status = 'active';
    else if (status) normalized.status = status;
    return normalized;
  };

  return {
    schema_version: OPSX_SCHEMA_VERSION,
    project: raw.project,
    domains: (raw.domains || []).map(stripNode),
    capabilities: (raw.capabilities || []).map(stripNode),
    invariants: raw.invariants?.map(stripNode),
    interfaces: raw.interfaces?.map(stripNode),
    decisions: raw.decisions?.map(stripNode),
    evidence: raw.evidence?.map(stripNode),
    relations: raw.relations || [],
    code_map,
  };
}

/**
 * Read the main project.opsx.yaml file
 */
export async function readProjectOpsxFile(
  projectRoot: string
): Promise<ProjectOpsxFile | null> {
  const filePath = FileSystemUtils.joinPath(projectRoot, OPSX_PATHS.PROJECT_FILE);
  if (!await FileSystemUtils.fileExists(filePath)) return null;

  const content = await fs.readFile(filePath, 'utf-8');
  const data = parseYaml(content);

  const result = ProjectOpsxFileSchema.safeParse(data);
  if (!result.success) {
    console.warn(`Invalid project.opsx.yaml: ${result.error.message}`);
    return null;
  }
  return result.data;
}

/**
 * Read the relations companion file (empty array if missing)
 */
export async function readProjectOpsxRelations(
  projectRoot: string
): Promise<OpsxRelation[]> {
  const filePath = FileSystemUtils.joinPath(projectRoot, OPSX_PATHS.RELATIONS_FILE);
  if (!await FileSystemUtils.fileExists(filePath)) return [];

  const content = await fs.readFile(filePath, 'utf-8');
  const data = parseYaml(content);

  const result = ProjectOpsxRelationsFileSchema.safeParse(data);
  if (!result.success) {
    console.warn(`Invalid project.opsx.relations.yaml: ${result.error.message}`);
    return [];
  }
  return result.data.relations;
}

/**
 * Read the code-map companion file (empty array if missing)
 */
export async function readProjectOpsxCodeMap(
  projectRoot: string
): Promise<CodeMapEntry[]> {
  const filePath = FileSystemUtils.joinPath(projectRoot, OPSX_PATHS.CODE_MAP_FILE);
  if (!await FileSystemUtils.fileExists(filePath)) return [];

  const content = await fs.readFile(filePath, 'utf-8');
  const data = parseYaml(content);

  const result = ProjectOpsxCodeMapFileSchema.safeParse(data);
  if (!result.success) {
    console.warn(`Invalid project.opsx.code-map.yaml: ${result.error.message}`);
    return [];
  }
  return result.data.nodes;
}

/**
 * Read and assemble the full OPSX bundle from three files.
 * Falls back to legacy normalizer if schema_version is missing.
 */
export async function readProjectOpsx(
  projectRoot: string
): Promise<ProjectOpsxBundle | null> {
  const mainPath = FileSystemUtils.joinPath(projectRoot, OPSX_PATHS.PROJECT_FILE);
  if (!await FileSystemUtils.fileExists(mainPath)) return null;

  const content = await fs.readFile(mainPath, 'utf-8');
  const raw = parseYaml(content);

  // Legacy detection: no schema_version → normalize
  if (!raw?.schema_version) {
    return normalizeFromLegacy(raw);
  }

  const mainFile = ProjectOpsxFileSchema.safeParse(raw);
  if (!mainFile.success) {
    console.warn(`Invalid project.opsx.yaml: ${mainFile.error.message}`);
    return null;
  }

  const [relations, code_map] = await Promise.all([
    readProjectOpsxRelations(projectRoot),
    readProjectOpsxCodeMap(projectRoot),
  ]);

  return {
    schema_version: mainFile.data.schema_version,
    project: mainFile.data.project,
    domains: mainFile.data.domains || [],
    capabilities: mainFile.data.capabilities || [],
    invariants: mainFile.data.invariants,
    interfaces: mainFile.data.interfaces,
    decisions: mainFile.data.decisions,
    evidence: mainFile.data.evidence,
    relations,
    code_map,
  };
}

/**
 * Write the full OPSX bundle atomically to three files.
 */
export async function writeProjectOpsx(
  projectRoot: string,
  bundle: ProjectOpsxBundle
): Promise<void> {
  const mainPath = FileSystemUtils.joinPath(projectRoot, OPSX_PATHS.PROJECT_FILE);
  const relPath = FileSystemUtils.joinPath(projectRoot, OPSX_PATHS.RELATIONS_FILE);
  const mapPath = FileSystemUtils.joinPath(projectRoot, OPSX_PATHS.CODE_MAP_FILE);

  const mainData: ProjectOpsxFile = {
    schema_version: bundle.schema_version,
    project: bundle.project,
    ...(bundle.domains?.length ? { domains: bundle.domains } : {}),
    ...(bundle.capabilities?.length ? { capabilities: bundle.capabilities } : {}),
    ...(bundle.invariants?.length ? { invariants: bundle.invariants } : {}),
    ...(bundle.interfaces?.length ? { interfaces: bundle.interfaces } : {}),
    ...(bundle.decisions?.length ? { decisions: bundle.decisions } : {}),
    ...(bundle.evidence?.length ? { evidence: bundle.evidence } : {}),
  };

  const relData = {
    schema_version: bundle.schema_version,
    relations: bundle.relations,
  };

  const mapData = {
    schema_version: bundle.schema_version,
    generated_at: new Date().toISOString(),
    nodes: bundle.code_map,
  };

  const mainTmp = `${mainPath}.tmp`;
  const relTmp = `${relPath}.tmp`;
  const mapTmp = `${mapPath}.tmp`;
  const originals = await Promise.all([
    readOptionalTextFile(mainPath),
    readOptionalTextFile(relPath),
    readOptionalTextFile(mapPath),
  ]);

  try {
    await FileSystemUtils.createDirectory(path.dirname(mainPath));

    const mainYaml = stringifyYaml(mainData, { lineWidth: 0 });
    const relYaml = stringifyYaml(relData, { lineWidth: 0 });
    const mapYaml = stringifyYaml(mapData, { lineWidth: 0 });

    await Promise.all([
      fs.writeFile(mainTmp, mainYaml, 'utf-8'),
      fs.writeFile(relTmp, relYaml, 'utf-8'),
      fs.writeFile(mapTmp, mapYaml, 'utf-8'),
    ]);

    // Atomic rename all three
    await fs.rename(mainTmp, mainPath);
    await fs.rename(relTmp, relPath);
    await fs.rename(mapTmp, mapPath);
  } catch (err) {
    // Cleanup tmp files on failure
    for (const tmp of [mainTmp, relTmp, mapTmp]) {
      try { await fs.unlink(tmp); } catch { /* ignore */ }
    }
    await Promise.all([
      restoreOptionalTextFile(mainPath, originals[0]),
      restoreOptionalTextFile(relPath, originals[1]),
      restoreOptionalTextFile(mapPath, originals[2]),
    ]);
    throw err;
  }
}

export async function readOpsxDelta(projectRoot: string, changeName: string): Promise<OpsxDelta | null> {
  const deltaPath = FileSystemUtils.joinPath(projectRoot, OPSX_PATHS.deltaPath(changeName));
  if (!await FileSystemUtils.fileExists(deltaPath)) return null;

  const content = await fs.readFile(deltaPath, 'utf-8');
  const data = parseYaml(content);
  const result = OpsxDeltaSchema.safeParse(data);
  if (!result.success) {
    throw new Error(`Invalid opsx-delta.yaml for change '${changeName}': ${result.error.message}`);
  }
  return result.data;
}

export function applyOpsxDelta(bundle: ProjectOpsxBundle, delta: OpsxDelta): OpsxDeltaApplyResult {
  const next: ProjectOpsxBundle = {
    ...bundle,
    domains: [...bundle.domains],
    capabilities: [...bundle.capabilities],
    relations: [...bundle.relations],
    code_map: [...bundle.code_map],
    ...(bundle.invariants ? { invariants: [...bundle.invariants] } : {}),
    ...(bundle.interfaces ? { interfaces: [...bundle.interfaces] } : {}),
    ...(bundle.decisions ? { decisions: [...bundle.decisions] } : {}),
    ...(bundle.evidence ? { evidence: [...bundle.evidence] } : {}),
  };

  const counts = {
    added: { domains: 0, capabilities: 0, relations: 0 },
    modified: { domains: 0, capabilities: 0, relations: 0 },
    removed: { domains: 0, capabilities: 0, relations: 0 },
  };

  const relationKey = (relation: OpsxRelation) => `${relation.from}|${relation.to}|${relation.type}`;
  const relationPairKey = (relation: OpsxRelation) => `${relation.from}|${relation.to}`;

  for (const domain of delta.ADDED?.domains || []) {
    if (next.domains.some((candidate) => candidate.id === domain.id)) continue;
    next.domains.push(domain);
    counts.added.domains += 1;
  }
  for (const capability of delta.ADDED?.capabilities || []) {
    if (next.capabilities.some((candidate) => candidate.id === capability.id)) continue;
    next.capabilities.push(capability);
    counts.added.capabilities += 1;
  }
  for (const relation of delta.ADDED?.relations || []) {
    if (next.relations.some((candidate) => relationKey(candidate) === relationKey(relation))) continue;
    next.relations.push(relation);
    counts.added.relations += 1;
  }

  for (const domain of delta.MODIFIED?.domains || []) {
    const index = next.domains.findIndex((candidate) => candidate.id === domain.id);
    if (index === -1) {
      throw new Error(`OPSX MODIFIED failed for domain '${domain.id}' - not found`);
    }
    next.domains[index] = domain;
    counts.modified.domains += 1;
  }
  for (const capability of delta.MODIFIED?.capabilities || []) {
    const index = next.capabilities.findIndex((candidate) => candidate.id === capability.id);
    if (index === -1) {
      throw new Error(`OPSX MODIFIED failed for capability '${capability.id}' - not found`);
    }
    next.capabilities[index] = capability;
    counts.modified.capabilities += 1;
  }
  for (const relation of delta.MODIFIED?.relations || []) {
    const pairKey = relationPairKey(relation);
    const index = next.relations.findIndex((candidate) => relationPairKey(candidate) === pairKey);
    if (index === -1) {
      throw new Error(`OPSX MODIFIED failed for relation '${relation.from}' -> '${relation.to}' - not found`);
    }
    next.relations[index] = relation;
    counts.modified.relations += 1;
  }

  const removedNodeIds = new Set<string>();
  for (const domain of delta.REMOVED?.domains || []) {
    const before = next.domains.length;
    next.domains = next.domains.filter((candidate) => candidate.id !== domain.id);
    if (next.domains.length !== before) {
      removedNodeIds.add(domain.id);
      counts.removed.domains += 1;
    }
  }
  for (const capability of delta.REMOVED?.capabilities || []) {
    const before = next.capabilities.length;
    next.capabilities = next.capabilities.filter((candidate) => candidate.id !== capability.id);
    if (next.capabilities.length !== before) {
      removedNodeIds.add(capability.id);
      counts.removed.capabilities += 1;
    }
  }
  if (removedNodeIds.size > 0) {
    next.code_map = next.code_map.filter((entry) => !removedNodeIds.has(entry.id));
  }
  for (const relation of delta.REMOVED?.relations || []) {
    const before = next.relations.length;
    const removeKey = relationKey(relation);
    next.relations = next.relations.filter((candidate) => relationKey(candidate) !== removeKey);
    if (next.relations.length !== before) {
      counts.removed.relations += 1;
    }
  }

  const changed = [
    counts.added.domains,
    counts.added.capabilities,
    counts.added.relations,
    counts.modified.domains,
    counts.modified.capabilities,
    counts.modified.relations,
    counts.removed.domains,
    counts.removed.capabilities,
    counts.removed.relations,
  ].some((count) => count > 0);

  return {
    bundle: next,
    counts,
    changed,
  };
}

/**
 * Validate referential integrity: all relation from/to must reference existing nodes.
 */
export function validateReferentialIntegrity(bundle: ProjectOpsxBundle): ValidationResult {
  const errors: string[] = [];
  const nodeIds = new Set<string>();

  for (const node of [...bundle.domains, ...bundle.capabilities]) {
    nodeIds.add(node.id);
  }

  for (const rel of bundle.relations) {
    if (!nodeIds.has(rel.from)) {
      errors.push(`Relation references non-existent 'from' node: ${rel.from}`);
    }
    if (!nodeIds.has(rel.to)) {
      errors.push(`Relation references non-existent 'to' node: ${rel.to}`);
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate code-map integrity: all code_map entry IDs must reference existing nodes.
 */
export function validateCodeMapIntegrity(bundle: ProjectOpsxBundle): ValidationResult {
  const errors: string[] = [];
  const nodeIds = new Set<string>();

  for (const node of [...bundle.domains, ...bundle.capabilities]) {
    nodeIds.add(node.id);
  }

  for (const entry of bundle.code_map) {
    if (!nodeIds.has(entry.id)) {
      errors.push(`Code map references non-existent node: ${entry.id}`);
    }
  }

  return { valid: errors.length === 0, errors };
}

async function readOptionalTextFile(filePath: string): Promise<string | null> {
  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch (error: any) {
    if (error?.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

async function restoreOptionalTextFile(filePath: string, content: string | null): Promise<void> {
  if (content === null) {
    await fs.rm(filePath, { force: true }).catch(() => undefined);
    return;
  }
  await FileSystemUtils.createDirectory(path.dirname(filePath));
  await fs.writeFile(filePath, content, 'utf-8');
}
