import { promises as fs } from 'fs';
import path from 'path';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import { z } from 'zod';
import { FileSystemUtils } from './file-system.js';

/**
 * OPSX Path Constants
 *
 * Centralized path definitions for all OPSX-related files.
 * All workflow templates MUST use these constants.
 */
export const OPSX_PATHS = {
  /** Single-file mode: openspec/project.opsx.yaml */
  SINGLE_FILE: 'openspec/project.opsx.yaml',

  /** Sharded mode directory: openspec/project.opsx/ */
  SHARDED_DIR: 'openspec/project.opsx',

  /** Shard metadata file: openspec/project.opsx/_meta.yaml */
  SHARDED_META: 'openspec/project.opsx/_meta.yaml',

  /** Delta template: openspec/changes/{name}/opsx-delta.yaml */
  deltaPath: (changeName: string) => `openspec/changes/${changeName}/opsx-delta.yaml`,
} as const;

/**
 * Default configuration
 */
export const OPSX_CONFIG = {
  /** Maximum lines per file before sharding (default: 1000) */
  MAX_LINES: 1000,
} as const;

/**
 * Zod Schemas for OPSX structures
 */

// Node ID pattern: prefix.identifier (e.g., cap.user-auth, dom.core)
const NodeIdSchema = z.string().regex(/^(cap|dom|inv|ifc|dec|rel|evd)\./);

// Base node schema (common fields)
const BaseNodeSchema = z.object({
  id: NodeIdSchema,
  intent: z.string().optional(),
  status: z.enum(['draft', 'active', 'deprecated']).optional(),
  spec_refs: z.array(z.object({
    path: z.string(),
    section: z.string().optional(),
  })).optional(),
  code_refs: z.array(z.object({
    path: z.string(),
    line: z.number().optional(),
  })).optional(),
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

// Project metadata
const ProjectMetadataSchema = z.object({
  name: z.string(),
  version: z.string(),
  description: z.string().optional(),
});

// Full project.opsx.yaml structure
export const ProjectOpsxSchema = z.object({
  project: ProjectMetadataSchema,
  domains: z.array(DomainNodeSchema).optional(),
  capabilities: z.array(CapabilityNodeSchema).optional(),
  invariants: z.array(InvariantNodeSchema).optional(),
  interfaces: z.array(InterfaceNodeSchema).optional(),
  decisions: z.array(DecisionNodeSchema).optional(),
  evidence: z.array(EvidenceNodeSchema).optional(),
  relations: z.array(OpsxRelationSchema).optional(),
});

// opsx-delta.yaml structure
export const OpsxDeltaSchema = z.object({
  ADDED: z.object({
    domains: z.array(DomainNodeSchema).optional(),
    capabilities: z.array(CapabilityNodeSchema).optional(),
    invariants: z.array(InvariantNodeSchema).optional(),
    interfaces: z.array(InterfaceNodeSchema).optional(),
    decisions: z.array(DecisionNodeSchema).optional(),
    evidence: z.array(EvidenceNodeSchema).optional(),
    relations: z.array(OpsxRelationSchema).optional(),
  }).optional(),
  MODIFIED: z.object({
    domains: z.array(DomainNodeSchema).optional(),
    capabilities: z.array(CapabilityNodeSchema).optional(),
    invariants: z.array(InvariantNodeSchema).optional(),
    interfaces: z.array(InterfaceNodeSchema).optional(),
    decisions: z.array(DecisionNodeSchema).optional(),
    evidence: z.array(EvidenceNodeSchema).optional(),
    relations: z.array(OpsxRelationSchema).optional(),
  }).optional(),
  REMOVED: z.object({
    node_ids: z.array(NodeIdSchema).optional(),
    relation_ids: z.array(z.string()).optional(),
  }).optional(),
});

// TypeScript types
export type OpsxNode = z.infer<typeof OpsxNodeSchema>;
export type OpsxRelation = z.infer<typeof OpsxRelationSchema>;
export type ProjectOpsx = z.infer<typeof ProjectOpsxSchema>;
export type OpsxDelta = z.infer<typeof OpsxDeltaSchema>;

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Read project.opsx.yaml (handles both single-file and sharded modes)
 *
 * @param projectRoot - Project root directory
 * @returns Parsed OPSX data or null if file doesn't exist
 */
export async function readProjectOpsx(projectRoot: string): Promise<ProjectOpsx | null> {
  const singleFilePath = FileSystemUtils.joinPath(projectRoot, OPSX_PATHS.SINGLE_FILE);
  const shardedDirPath = FileSystemUtils.joinPath(projectRoot, OPSX_PATHS.SHARDED_DIR);

  // Check single-file mode first
  if (await FileSystemUtils.fileExists(singleFilePath)) {
    const content = await fs.readFile(singleFilePath, 'utf-8');
    const data = parseYaml(content);

    // Validate structure
    const result = ProjectOpsxSchema.safeParse(data);
    if (!result.success) {
      console.warn(`Invalid project.opsx.yaml structure: ${result.error.message}`);
      return null;
    }

    return result.data;
  }

  // Check sharded mode
  if (await FileSystemUtils.fileExists(shardedDirPath)) {
    return await readShardedOpsx(projectRoot);
  }

  return null;
}

/**
 * Read sharded OPSX files and merge into single structure
 */
async function readShardedOpsx(projectRoot: string): Promise<ProjectOpsx | null> {
  const metaPath = FileSystemUtils.joinPath(projectRoot, OPSX_PATHS.SHARDED_META);

  if (!await FileSystemUtils.fileExists(metaPath)) {
    console.warn('Sharded OPSX directory exists but _meta.yaml is missing');
    return null;
  }

  const metaContent = await fs.readFile(metaPath, 'utf-8');
  const meta = parseYaml(metaContent) as { project: any; shard_manifest: string[] };

  const merged: ProjectOpsx = {
    project: meta.project,
    domains: [],
    capabilities: [],
    invariants: [],
    interfaces: [],
    decisions: [],
    evidence: [],
    relations: [],
  };

  // Read all shards
  const shardedDir = FileSystemUtils.joinPath(projectRoot, OPSX_PATHS.SHARDED_DIR);
  for (const shardName of meta.shard_manifest) {
    const shardPath = FileSystemUtils.joinPath(shardedDir, shardName);
    const shardContent = await fs.readFile(shardPath, 'utf-8');
    const shardData = parseYaml(shardContent) as Partial<ProjectOpsx>;

    // Merge arrays
    if (shardData.domains) merged.domains!.push(...shardData.domains);
    if (shardData.capabilities) merged.capabilities!.push(...shardData.capabilities);
    if (shardData.invariants) merged.invariants!.push(...shardData.invariants);
    if (shardData.interfaces) merged.interfaces!.push(...shardData.interfaces);
    if (shardData.decisions) merged.decisions!.push(...shardData.decisions);
    if (shardData.evidence) merged.evidence!.push(...shardData.evidence);
    if (shardData.relations) merged.relations!.push(...shardData.relations);
  }

  return merged;
}

/**
 * Write project.opsx.yaml atomically (auto-shards if exceeding max_lines)
 *
 * @param projectRoot - Project root directory
 * @param data - OPSX data to write
 * @param maxLines - Maximum lines per file (default: 1000)
 */
export async function writeProjectOpsx(
  projectRoot: string,
  data: ProjectOpsx,
  maxLines: number = OPSX_CONFIG.MAX_LINES
): Promise<void> {
  const lines = estimateLines(data);

  if (lines <= maxLines) {
    await writeSingleFileOpsx(projectRoot, data);
  } else {
    await writeShardedOpsx(projectRoot, data, maxLines);
  }
}

/**
 * Write single-file project.opsx.yaml atomically
 */
async function writeSingleFileOpsx(projectRoot: string, data: ProjectOpsx): Promise<void> {
  const targetPath = FileSystemUtils.joinPath(projectRoot, OPSX_PATHS.SINGLE_FILE);
  const tempPath = `${targetPath}.tmp`;

  // Ensure directory exists
  await FileSystemUtils.createDirectory(path.dirname(targetPath));

  // Write to temp file
  const yaml = stringifyYaml(data, { lineWidth: 0 });
  await fs.writeFile(tempPath, yaml, 'utf-8');

  // Atomic rename
  await fs.rename(tempPath, targetPath);
}

/**
 * Write sharded project.opsx.yaml atomically
 */
async function writeShardedOpsx(
  projectRoot: string,
  data: ProjectOpsx,
  maxLines: number
): Promise<void> {
  const shards = shardByDomain(data, maxLines);
  const targetDir = FileSystemUtils.joinPath(projectRoot, OPSX_PATHS.SHARDED_DIR);
  const tempDir = `${targetDir}.tmp`;

  // Create temp directory
  await FileSystemUtils.createDirectory(tempDir);

  // Write all shards to temp directory
  for (const [name, content] of Object.entries(shards)) {
    const shardPath = FileSystemUtils.joinPath(tempDir, name);
    const yaml = stringifyYaml(content, { lineWidth: 0 });
    await fs.writeFile(shardPath, yaml, 'utf-8');
  }

  // Atomic swap
  const oldDir = `${targetDir}.old`;
  if (await FileSystemUtils.fileExists(targetDir)) {
    await fs.rename(targetDir, oldDir);
  }
  await fs.rename(tempDir, targetDir);

  // Cleanup old directory
  if (await FileSystemUtils.fileExists(oldDir)) {
    await fs.rm(oldDir, { recursive: true, force: true });
  }
}

/**
 * Shard OPSX data by domain
 */
function shardByDomain(data: ProjectOpsx, maxLines: number): Record<string, any> {
  const shards: Record<string, any> = {};
  const manifest: string[] = [];

  // Create metadata shard
  shards['_meta.yaml'] = {
    project: data.project,
    shard_manifest: manifest,
  };

  // Group capabilities by domain
  const domainGroups: Record<string, any[]> = {};
  for (const cap of data.capabilities || []) {
    const domain = cap.domain || 'default';
    if (!domainGroups[domain]) domainGroups[domain] = [];
    domainGroups[domain].push(cap);
  }

  // Create domain shards
  for (const [domain, caps] of Object.entries(domainGroups)) {
    const shardName = `domain-${domain}.yaml`;
    shards[shardName] = { capabilities: caps };
    manifest.push(shardName);
  }

  // Relations in separate shard
  if (data.relations && data.relations.length > 0) {
    shards['relations.yaml'] = { relations: data.relations };
    manifest.push('relations.yaml');
  }

  // Other node types in separate shards if needed
  if (data.domains && data.domains.length > 0) {
    shards['domains.yaml'] = { domains: data.domains };
    manifest.push('domains.yaml');
  }

  return shards;
}

/**
 * Estimate line count for OPSX data
 */
function estimateLines(data: ProjectOpsx): number {
  const yaml = stringifyYaml(data, { lineWidth: 0 });
  return yaml.split('\n').length;
}

/**
 * Validate referential integrity (all relation from/to references exist)
 *
 * @param data - OPSX data to validate
 * @returns Validation result with errors
 */
export function validateReferentialIntegrity(data: ProjectOpsx): ValidationResult {
  const errors: string[] = [];

  // Collect all node IDs
  const nodeIds = new Set<string>();
  for (const collection of [
    data.domains,
    data.capabilities,
    data.invariants,
    data.interfaces,
    data.decisions,
    data.evidence,
  ]) {
    if (collection) {
      for (const node of collection) {
        nodeIds.add(node.id);
      }
    }
  }

  // Check all relations
  if (data.relations) {
    for (const rel of data.relations) {
      if (!nodeIds.has(rel.from)) {
        errors.push(`Relation references non-existent 'from' node: ${rel.from}`);
      }
      if (!nodeIds.has(rel.to)) {
        errors.push(`Relation references non-existent 'to' node: ${rel.to}`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate spec_refs path existence
 *
 * @param projectRoot - Project root directory
 * @param data - OPSX data to validate
 * @returns Validation result with errors
 */
export async function validateSpecRefs(
  projectRoot: string,
  data: ProjectOpsx
): Promise<ValidationResult> {
  const errors: string[] = [];

  // Check all nodes with spec_refs
  for (const collection of [
    data.domains,
    data.capabilities,
    data.invariants,
    data.interfaces,
    data.decisions,
    data.evidence,
  ]) {
    if (collection) {
      for (const node of collection) {
        if (node.spec_refs) {
          for (const ref of node.spec_refs) {
            const specPath = FileSystemUtils.joinPath(projectRoot, ref.path);
            if (!await FileSystemUtils.fileExists(specPath)) {
              errors.push(`Node ${node.id} references non-existent spec: ${ref.path}`);
            }
          }
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
