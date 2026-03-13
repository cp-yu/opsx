import { promises as fs } from 'fs';
import path from 'path';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import { z } from 'zod';
import { FileSystemUtils } from './file-system.js';
import {
  OPSX_SCHEMA_VERSION,
  writeProjectOpsx,
  validateReferentialIntegrity,
  validateCodeMapIntegrity,
  type ProjectOpsxBundle,
  type OpsxRelation,
  type CodeMapEntry,
} from './opsx-utils.js';

// ─── Constants ───────────────────────────────────────────────────────────────

export const BOOTSTRAP_DIR = 'openspec/bootstrap';

export const BOOTSTRAP_PHASES = ['init', 'scan', 'map', 'review', 'promote'] as const;
export type BootstrapPhase = typeof BOOTSTRAP_PHASES[number];

export const BOOTSTRAP_MODES = ['full', 'seed'] as const;
export type BootstrapMode = typeof BOOTSTRAP_MODES[number];

// ─── Zod Schemas ─────────────────────────────────────────────────────────────

const BootstrapMetadataSchema = z.object({
  phase: z.enum(BOOTSTRAP_PHASES),
  mode: z.enum(BOOTSTRAP_MODES),
  created_at: z.string(),
});

const ScopeConfigSchema = z.object({
  mode: z.enum(BOOTSTRAP_MODES),
  include: z.array(z.string()).default([]),
  exclude: z.array(z.string()).default([]),
  granularity: z.enum(['coarse', 'fine']).default('coarse'),
});

const EvidenceDomainSchema = z.object({
  id: z.string().regex(/^dom\./),
  confidence: z.enum(['high', 'medium', 'low']),
  sources: z.array(z.string()),
  intent: z.string(),
});

const EvidenceFileSchema = z.object({
  domains: z.array(EvidenceDomainSchema),
});

const DomainCapabilitySchema = z.object({
  id: z.string().regex(/^cap\./),
  type: z.literal('capability').default('capability'),
  intent: z.string(),
  status: z.enum(['draft', 'active']).default('draft'),
});

const DomainNodeSchema = z.object({
  id: z.string().regex(/^dom\./),
  type: z.literal('domain').default('domain'),
  intent: z.string(),
  status: z.enum(['draft', 'active']).default('draft'),
  boundary: z.string().optional(),
});

const DomainRelationSchema = z.object({
  from: z.string(),
  to: z.string(),
  type: z.enum(['contains', 'depends_on', 'constrains', 'implemented_by', 'verified_by', 'relates_to']),
});

const DomainCodeRefSchema = z.object({
  id: z.string(),
  refs: z.array(z.object({
    path: z.string(),
    line_start: z.number().optional(),
    line_end: z.number().optional(),
  })),
});

const DomainMapFileSchema = z.object({
  domain: DomainNodeSchema,
  capabilities: z.array(DomainCapabilitySchema).default([]),
  relations: z.array(DomainRelationSchema).default([]),
  code_refs: z.array(DomainCodeRefSchema).default([]),
});

// ─── Types ───────────────────────────────────────────────────────────────────

export type BootstrapMetadata = z.infer<typeof BootstrapMetadataSchema>;
export type ScopeConfig = z.infer<typeof ScopeConfigSchema>;
export type EvidenceDomain = z.infer<typeof EvidenceDomainSchema>;
export type EvidenceFile = z.infer<typeof EvidenceFileSchema>;
export type DomainMapFile = z.infer<typeof DomainMapFileSchema>;

export interface BootstrapState {
  metadata: BootstrapMetadata;
  scope: ScopeConfig | null;
  evidence: EvidenceFile | null;
  domainMaps: Map<string, DomainMapFile>;
  reviewExists: boolean;
}

export interface BootstrapStatus {
  phase: BootstrapPhase;
  mode: BootstrapMode;
  created_at: string;
  domains: DomainStatus[];
  totalDomains: number;
  mappedDomains: number;
  reviewedDomains: number;
}

export interface DomainStatus {
  id: string;
  confidence: 'high' | 'medium' | 'low';
  mapped: boolean;
  capabilityCount: number;
  reviewed: boolean;
}

export interface GateResult {
  passed: boolean;
  errors: string[];
}

// ─── Path Helpers ────────────────────────────────────────────────────────────

function bootstrapPath(projectRoot: string, ...segments: string[]): string {
  return FileSystemUtils.joinPath(projectRoot, BOOTSTRAP_DIR, ...segments);
}

// ─── Core Functions ──────────────────────────────────────────────────────────

export async function initBootstrap(
  projectRoot: string,
  options: { mode?: BootstrapMode; scope?: string[] } = {}
): Promise<BootstrapMetadata> {
  const bsDir = bootstrapPath(projectRoot);

  if (await FileSystemUtils.directoryExists(bsDir)) {
    throw new Error('Bootstrap workspace already exists. Run `openspec bootstrap status` or delete openspec/bootstrap/ to restart.');
  }

  const mode = options.mode ?? 'full';
  const now = new Date().toISOString();

  const metadata: BootstrapMetadata = {
    phase: 'init',
    mode,
    created_at: now,
  };

  const scope: ScopeConfig = {
    mode,
    include: options.scope ?? [],
    exclude: [],
    granularity: 'coarse',
  };

  // Create workspace
  await FileSystemUtils.createDirectory(bsDir);
  await FileSystemUtils.createDirectory(bootstrapPath(projectRoot, 'domain-map'));
  await FileSystemUtils.createDirectory(bootstrapPath(projectRoot, 'candidate'));

  // Write files
  await writeYaml(bootstrapPath(projectRoot, '.bootstrap.yaml'), metadata);
  await writeYaml(bootstrapPath(projectRoot, 'scope.yaml'), scope);

  return metadata;
}

export async function readBootstrapState(projectRoot: string): Promise<BootstrapState> {
  const bsDir = bootstrapPath(projectRoot);

  if (!await FileSystemUtils.directoryExists(bsDir)) {
    throw new Error('No bootstrap workspace found. Run `openspec bootstrap init` first.');
  }

  const metaRaw = await readYaml(bootstrapPath(projectRoot, '.bootstrap.yaml'));
  const metadata = BootstrapMetadataSchema.parse(metaRaw);

  let scope: ScopeConfig | null = null;
  try {
    const scopeRaw = await readYaml(bootstrapPath(projectRoot, 'scope.yaml'));
    scope = ScopeConfigSchema.parse(scopeRaw);
  } catch { /* scope may not exist yet */ }

  let evidence: EvidenceFile | null = null;
  try {
    const evidenceRaw = await readYaml(bootstrapPath(projectRoot, 'evidence.yaml'));
    evidence = EvidenceFileSchema.parse(evidenceRaw);
  } catch { /* evidence may not exist yet */ }

  // Read domain maps
  const domainMaps = new Map<string, DomainMapFile>();
  const mapDir = bootstrapPath(projectRoot, 'domain-map');
  if (await FileSystemUtils.directoryExists(mapDir)) {
    const entries = await fs.readdir(mapDir);
    for (const entry of entries) {
      if (!entry.endsWith('.yaml')) continue;
      try {
        const raw = await readYaml(path.join(mapDir, entry));
        const parsed = DomainMapFileSchema.parse(raw);
        domainMaps.set(parsed.domain.id, parsed);
      } catch { /* skip invalid */ }
    }
  }

  const reviewPath = bootstrapPath(projectRoot, 'review.md');
  const reviewExists = await FileSystemUtils.fileExists(reviewPath);

  return { metadata, scope, evidence, domainMaps, reviewExists };
}

export async function advancePhase(projectRoot: string, targetPhase: BootstrapPhase): Promise<void> {
  const metaPath = bootstrapPath(projectRoot, '.bootstrap.yaml');
  const metaRaw = await readYaml(metaPath);
  const metadata = BootstrapMetadataSchema.parse(metaRaw);

  const currentIdx = BOOTSTRAP_PHASES.indexOf(metadata.phase);
  const targetIdx = BOOTSTRAP_PHASES.indexOf(targetPhase);

  if (targetIdx <= currentIdx) {
    throw new Error(`Cannot advance to '${targetPhase}' — current phase is '${metadata.phase}'.`);
  }

  if (targetIdx > currentIdx + 1) {
    throw new Error(`Cannot skip phases. Current: '${metadata.phase}', target: '${targetPhase}'.`);
  }

  metadata.phase = targetPhase;
  await writeYaml(metaPath, metadata);
}

export async function updateDomainProgress(
  projectRoot: string,
  domainId: string,
  data: DomainMapFile
): Promise<void> {
  const validated = DomainMapFileSchema.parse(data);
  const fileName = `${domainId}.yaml`;
  await writeYaml(bootstrapPath(projectRoot, 'domain-map', fileName), validated);
}

export async function getBootstrapStatus(projectRoot: string): Promise<BootstrapStatus> {
  const state = await readBootstrapState(projectRoot);
  const domains: DomainStatus[] = [];

  // Read review.md for checked domains
  const checkedDomains = new Set<string>();
  if (state.reviewExists) {
    try {
      const reviewContent = await fs.readFile(
        bootstrapPath(projectRoot, 'review.md'), 'utf-8'
      );
      for (const line of reviewContent.split('\n')) {
        const match = line.match(/^-\s+\[x\]\s+(dom\.\S+)/i);
        if (match) checkedDomains.add(match[1]);
      }
    } catch { /* ignore */ }
  }

  if (state.evidence) {
    for (const dom of state.evidence.domains) {
      const mapFile = state.domainMaps.get(dom.id);
      domains.push({
        id: dom.id,
        confidence: dom.confidence,
        mapped: !!mapFile,
        capabilityCount: mapFile?.capabilities.length ?? 0,
        reviewed: checkedDomains.has(dom.id),
      });
    }
  }

  return {
    phase: state.metadata.phase,
    mode: state.metadata.mode,
    created_at: state.metadata.created_at,
    domains,
    totalDomains: domains.length,
    mappedDomains: domains.filter(d => d.mapped).length,
    reviewedDomains: domains.filter(d => d.reviewed).length,
  };
}

// ─── Gate Validation ─────────────────────────────────────────────────────────

export async function validateGate(
  projectRoot: string,
  gate: 'scan_to_map' | 'map_to_review' | 'review_to_promote'
): Promise<GateResult> {
  const state = await readBootstrapState(projectRoot);
  const errors: string[] = [];

  switch (gate) {
    case 'scan_to_map': {
      if (!state.evidence) {
        errors.push('evidence.yaml not found');
        break;
      }
      const ids = new Set<string>();
      for (const dom of state.evidence.domains) {
        if (!dom.id.startsWith('dom.')) {
          errors.push(`Domain ID '${dom.id}' does not follow dom.<name> convention`);
        }
        if (ids.has(dom.id)) {
          errors.push(`Duplicate domain ID: ${dom.id}`);
        }
        ids.add(dom.id);
      }
      break;
    }
    case 'map_to_review': {
      if (!state.evidence) {
        errors.push('evidence.yaml not found');
        break;
      }
      for (const dom of state.evidence.domains) {
        if (!state.domainMaps.has(dom.id)) {
          errors.push(`Domain '${dom.id}' has no domain-map file`);
        }
      }
      for (const [, mapFile] of state.domainMaps) {
        for (const cap of mapFile.capabilities) {
          if (!cap.id.startsWith('cap.')) {
            errors.push(`Capability ID '${cap.id}' does not follow cap.<domain>.<action> convention`);
          }
        }
        for (const codeRef of mapFile.code_refs) {
          for (const ref of codeRef.refs) {
            const refPath = FileSystemUtils.joinPath(projectRoot, ref.path);
            if (!await FileSystemUtils.fileExists(refPath)) {
              errors.push(`Code-ref path does not exist: ${ref.path} (node: ${codeRef.id})`);
            }
          }
        }
      }
      break;
    }
    case 'review_to_promote': {
      // Check all review checkboxes
      if (!state.reviewExists) {
        errors.push('review.md not found');
        break;
      }
      const reviewContent = await fs.readFile(
        bootstrapPath(projectRoot, 'review.md'), 'utf-8'
      );
      const lines = reviewContent.split('\n');
      for (const line of lines) {
        if (/^-\s+\[\s\]/.test(line)) {
          errors.push(`Unchecked review item: ${line.trim()}`);
        }
      }

      // Run referential integrity + code-map integrity on candidate
      const bundle = assembleBundle(state);
      const refResult = validateReferentialIntegrity(bundle);
      errors.push(...refResult.errors);
      const mapResult = validateCodeMapIntegrity(bundle);
      errors.push(...mapResult.errors);
      break;
    }
  }

  return { passed: errors.length === 0, errors };
}

// ─── Assemble & Promote ─────────────────────────────────────────────────────

function assembleBundle(state: BootstrapState): ProjectOpsxBundle {
  const domains: ProjectOpsxBundle['domains'] = [];
  const capabilities: ProjectOpsxBundle['capabilities'] = [];
  const relations: OpsxRelation[] = [];
  const code_map: CodeMapEntry[] = [];

  for (const [, mapFile] of state.domainMaps) {
    domains.push({
      id: mapFile.domain.id,
      type: 'domain',
      intent: mapFile.domain.intent,
      status: mapFile.domain.status ?? 'active',
      boundary: mapFile.domain.boundary,
    });

    for (const cap of mapFile.capabilities) {
      capabilities.push({
        id: cap.id,
        type: 'capability',
        intent: cap.intent,
        status: cap.status ?? 'active',
      });
    }

    for (const rel of mapFile.relations) {
      relations.push({
        from: rel.from,
        type: rel.type,
        to: rel.to,
      });
    }

    for (const cr of mapFile.code_refs) {
      code_map.push({
        id: cr.id,
        refs: cr.refs.map(r => ({
          path: r.path,
          ...(r.line_start != null ? { line_start: r.line_start } : {}),
          ...(r.line_end != null ? { line_end: r.line_end } : {}),
        })),
      });
    }
  }

  return {
    schema_version: OPSX_SCHEMA_VERSION,
    project: {
      id: 'project',
      name: 'Project',
    },
    domains,
    capabilities,
    relations,
    code_map,
  };
}

export async function assembleCandidate(projectRoot: string): Promise<ProjectOpsxBundle> {
  const state = await readBootstrapState(projectRoot);
  const bundle = assembleBundle(state);

  // Write candidate files for inspection
  const candidateDir = bootstrapPath(projectRoot, 'candidate');
  await FileSystemUtils.createDirectory(candidateDir);

  const mainData = {
    schema_version: bundle.schema_version,
    project: bundle.project,
    ...(bundle.domains.length ? { domains: bundle.domains } : {}),
    ...(bundle.capabilities.length ? { capabilities: bundle.capabilities } : {}),
  };
  const relData = { schema_version: bundle.schema_version, relations: bundle.relations };
  const mapData = {
    schema_version: bundle.schema_version,
    generated_at: new Date().toISOString(),
    nodes: bundle.code_map,
  };

  await Promise.all([
    writeYaml(path.join(candidateDir, 'project.opsx.yaml'), mainData),
    writeYaml(path.join(candidateDir, 'project.opsx.relations.yaml'), relData),
    writeYaml(path.join(candidateDir, 'project.opsx.code-map.yaml'), mapData),
  ]);

  return bundle;
}

export async function generateReview(projectRoot: string): Promise<string> {
  const state = await readBootstrapState(projectRoot);
  if (!state.evidence) throw new Error('No evidence.yaml found. Run scan phase first.');

  const lines: string[] = ['# Bootstrap Review', ''];
  lines.push('Review the mapped architecture before promoting to formal OPSX files.', '');
  lines.push('## Domain Checklist', '');

  for (const dom of state.evidence.domains) {
    const mapFile = state.domainMaps.get(dom.id);
    const capCount = mapFile?.capabilities.length ?? 0;
    const status = mapFile ? `${capCount} capabilities` : 'unmapped';
    lines.push(`- [ ] ${dom.id} — ${status}, confidence: ${dom.confidence}`);
  }

  lines.push('', '## Validation', '');
  lines.push('- [ ] Referential integrity passes');
  lines.push('- [ ] Code-map paths exist on disk');
  lines.push('- [ ] Domain boundaries match mental model');
  lines.push('');

  const content = lines.join('\n');
  await fs.writeFile(bootstrapPath(projectRoot, 'review.md'), content, 'utf-8');
  return content;
}

export async function promoteBootstrap(projectRoot: string): Promise<void> {
  // Validate review gate
  const gate = await validateGate(projectRoot, 'review_to_promote');
  if (!gate.passed) {
    throw new Error(`Cannot promote: gate validation failed.\n${gate.errors.join('\n')}`);
  }

  const state = await readBootstrapState(projectRoot);
  const bundle = assembleBundle(state);

  // Read existing OPSX to merge project metadata if present
  const existingMainPath = FileSystemUtils.joinPath(projectRoot, 'openspec/project.opsx.yaml');
  if (await FileSystemUtils.fileExists(existingMainPath)) {
    try {
      const content = await fs.readFile(existingMainPath, 'utf-8');
      const existing = parseYaml(content);
      if (existing?.project) {
        bundle.project = { ...bundle.project, ...existing.project };
      }
    } catch { /* use default project metadata */ }
  }

  // Write formal OPSX files
  await writeProjectOpsx(projectRoot, bundle);

  // Mark phase as promote
  await advancePhase(projectRoot, 'promote');

  // Clean up workspace
  const bsDir = bootstrapPath(projectRoot);
  await fs.rm(bsDir, { recursive: true, force: true });
}

// ─── YAML Helpers ────────────────────────────────────────────────────────────

async function writeYaml(filePath: string, data: unknown): Promise<void> {
  const dir = path.dirname(filePath);
  await FileSystemUtils.createDirectory(dir);
  await fs.writeFile(filePath, stringifyYaml(data, { lineWidth: 0 }), 'utf-8');
}

async function readYaml(filePath: string): Promise<unknown> {
  const content = await fs.readFile(filePath, 'utf-8');
  return parseYaml(content);
}
