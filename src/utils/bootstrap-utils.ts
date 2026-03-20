import { promises as fs } from 'fs';
import { createHash } from 'crypto';
import path from 'path';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import { z } from 'zod';
import { FileSystemUtils } from './file-system.js';
import {
  OPSX_SCHEMA_VERSION,
  OPSX_PATHS,
  ProjectOpsxFileSchema,
  ProjectOpsxRelationsFileSchema,
  ProjectOpsxCodeMapFileSchema,
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

export const BOOTSTRAP_MODES = ['full', 'opsx-first'] as const;
export type BootstrapMode = typeof BOOTSTRAP_MODES[number];

export const BOOTSTRAP_BASELINE_TYPES = [
  'raw',
  'specs-based',
  'formal-opsx',
  'invalid-partial-opsx',
] as const;
export type BootstrapBaselineType = typeof BOOTSTRAP_BASELINE_TYPES[number];

// ─── Zod Schemas ─────────────────────────────────────────────────────────────

const BootstrapDiskModeSchema = z.union([z.enum(BOOTSTRAP_MODES), z.literal('seed')]);

const BaselineTypeDiskSchema = z.enum([
  'raw',
  'specs-based',
  'formal-opsx',
  'invalid-partial-opsx',
  'no-spec',
  'specs-only',
]).transform((value): BootstrapBaselineType => {
  if (value === 'no-spec') return 'raw';
  if (value === 'specs-only') return 'specs-based';
  return value;
});

const BootstrapMetadataDiskSchema = z.object({
  phase: z.enum(BOOTSTRAP_PHASES),
  baseline_type: BaselineTypeDiskSchema.optional(),
  mode: BootstrapDiskModeSchema,
  created_at: z.string(),
  source_fingerprint: z.string().nullable().optional(),
  candidate_fingerprint: z.string().nullable().optional(),
  review_fingerprint: z.string().nullable().optional(),
});

const ScopeConfigDiskSchema = z.object({
  mode: BootstrapDiskModeSchema,
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

export interface BootstrapMetadata {
  phase: BootstrapPhase;
  baseline_type: BootstrapBaselineType;
  mode: BootstrapMode;
  created_at: string;
  source_fingerprint: string | null;
  candidate_fingerprint: string | null;
  review_fingerprint: string | null;
}

export interface ScopeConfig {
  mode: BootstrapMode;
  include: string[];
  exclude: string[];
  granularity: 'coarse' | 'fine';
}
export type EvidenceDomain = z.infer<typeof EvidenceDomainSchema>;
export type EvidenceFile = z.infer<typeof EvidenceFileSchema>;
export type DomainMapFile = z.infer<typeof DomainMapFileSchema>;

export interface InvalidDomainMap {
  file: string;
  domainId: string;
  error: string;
}

export interface BootstrapState {
  metadata: BootstrapMetadata;
  scope: ScopeConfig | null;
  evidence: EvidenceFile | null;
  domainMaps: Map<string, DomainMapFile>;
  invalidDomainMaps: Map<string, InvalidDomainMap>;
  reviewExists: boolean;
}

export interface BootstrapInitializedStatus {
  initialized: true;
  phase: BootstrapPhase;
  baselineType: BootstrapBaselineType;
  mode: BootstrapMode;
  nextAction: BootstrapPhase | null;
  created_at: string;
  domains: DomainStatus[];
  totalDomains: number;
  mappedDomains: number;
  reviewedDomains: number;
  candidateState: 'missing' | 'current' | 'stale';
  reviewState: 'missing' | 'current' | 'stale';
  reviewApproved: boolean;
}

export interface BootstrapPreInitStatus {
  initialized: false;
  baselineType: BootstrapBaselineType;
  supported: boolean;
  allowedModes: BootstrapMode[];
  nextAction: 'init' | null;
  reason: string;
}

export type BootstrapStatus = BootstrapInitializedStatus | BootstrapPreInitStatus;

export interface DomainStatus {
  id: string;
  confidence: 'high' | 'medium' | 'low';
  mapped: boolean;
  mapState: 'valid' | 'missing' | 'invalid';
  mapError?: string;
  capabilityCount: number;
  reviewed: boolean;
}

export interface GateResult {
  passed: boolean;
  errors: string[];
}

interface DerivedBootstrapArtifacts {
  bundle: ProjectOpsxBundle | null;
  sourceFingerprint: string | null;
  candidateFingerprint: string | null;
  candidateState: 'missing' | 'current' | 'stale';
  reviewState: 'missing' | 'current' | 'stale';
  reviewApproved: boolean;
  checkedDomains: Set<string>;
}

// ─── Path Helpers ────────────────────────────────────────────────────────────

function bootstrapPath(projectRoot: string, ...segments: string[]): string {
  return FileSystemUtils.joinPath(projectRoot, BOOTSTRAP_DIR, ...segments);
}

function normalizeBootstrapMode(mode: BootstrapMode | 'seed'): BootstrapMode {
  return mode === 'seed' ? 'opsx-first' : mode;
}

const DOMAIN_CONFIDENCE_ORDER: Record<EvidenceDomain['confidence'], number> = {
  low: 0,
  medium: 1,
  high: 2,
};

async function hasRealSpecContent(projectRoot: string): Promise<boolean> {
  const specsDir = FileSystemUtils.joinPath(projectRoot, 'openspec/specs');
  if (!await FileSystemUtils.directoryExists(specsDir)) {
    return false;
  }

  const entries = await fs.readdir(specsDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const specPath = FileSystemUtils.joinPath(specsDir, entry.name, 'spec.md');
    if (await FileSystemUtils.fileExists(specPath)) {
      return true;
    }
  }

  return false;
}

async function inferLegacyBaselineType(projectRoot: string): Promise<BootstrapBaselineType> {
  return await hasRealSpecContent(projectRoot) ? 'specs-based' : 'raw';
}

function parseBootstrapMetadata(
  raw: unknown,
  fallbackBaselineType: BootstrapBaselineType
): BootstrapMetadata {
  const parsed = BootstrapMetadataDiskSchema.parse(raw);
  return {
    phase: parsed.phase,
    baseline_type: parsed.baseline_type ?? fallbackBaselineType,
    mode: normalizeBootstrapMode(parsed.mode),
    created_at: parsed.created_at,
    source_fingerprint: parsed.source_fingerprint ?? null,
    candidate_fingerprint: parsed.candidate_fingerprint ?? null,
    review_fingerprint: parsed.review_fingerprint ?? null,
  };
}

function parseScopeConfig(raw: unknown): ScopeConfig {
  const parsed = ScopeConfigDiskSchema.parse(raw);
  return {
    mode: normalizeBootstrapMode(parsed.mode),
    include: parsed.include,
    exclude: parsed.exclude,
    granularity: parsed.granularity,
  };
}

function formalOpsxPaths(projectRoot: string): string[] {
  return [
    FileSystemUtils.joinPath(projectRoot, OPSX_PATHS.PROJECT_FILE),
    FileSystemUtils.joinPath(projectRoot, OPSX_PATHS.RELATIONS_FILE),
    FileSystemUtils.joinPath(projectRoot, OPSX_PATHS.CODE_MAP_FILE),
  ];
}

function candidatePath(projectRoot: string, fileName: string): string {
  return bootstrapPath(projectRoot, 'candidate', fileName);
}

function compareConfidence(a: EvidenceDomain['confidence'], b: EvidenceDomain['confidence']): number {
  return DOMAIN_CONFIDENCE_ORDER[a] - DOMAIN_CONFIDENCE_ORDER[b];
}

function compareEvidenceDomains(a: EvidenceDomain, b: EvidenceDomain): number {
  const confidenceComparison = compareConfidence(a.confidence, b.confidence);
  return confidenceComparison !== 0 ? confidenceComparison : a.id.localeCompare(b.id);
}

function normalizeEvidenceForFingerprint(evidence: EvidenceFile): EvidenceFile {
  return {
    domains: [...evidence.domains]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((domain) => ({
        ...domain,
        sources: [...domain.sources].sort(),
      })),
  };
}

function normalizeDomainMapForFingerprint(mapFile: DomainMapFile): DomainMapFile {
  return {
    domain: { ...mapFile.domain },
    capabilities: [...mapFile.capabilities].sort((a, b) => a.id.localeCompare(b.id)),
    relations: [...mapFile.relations].sort((a, b) => {
      const fromComparison = a.from.localeCompare(b.from);
      if (fromComparison !== 0) return fromComparison;
      const typeComparison = a.type.localeCompare(b.type);
      return typeComparison !== 0 ? typeComparison : a.to.localeCompare(b.to);
    }),
    code_refs: [...mapFile.code_refs]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((entry) => ({
        ...entry,
        refs: [...entry.refs].sort((a, b) => {
          const pathComparison = a.path.localeCompare(b.path);
          if (pathComparison !== 0) return pathComparison;
          const startComparison = (a.line_start ?? 0) - (b.line_start ?? 0);
          return startComparison !== 0 ? startComparison : (a.line_end ?? 0) - (b.line_end ?? 0);
        }),
      })),
  };
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, entryValue]) => entryValue !== undefined)
      .sort(([left], [right]) => left.localeCompare(right));
    return `{${entries.map(([key, entryValue]) => `${JSON.stringify(key)}:${stableStringify(entryValue)}`).join(',')}}`;
  }

  return JSON.stringify(value);
}

function fingerprintValue(value: unknown): string {
  return createHash('sha256').update(stableStringify(value)).digest('hex');
}

async function countExistingFormalOpsxFiles(projectRoot: string): Promise<number> {
  const results = await Promise.all(formalOpsxPaths(projectRoot).map((filePath) => FileSystemUtils.fileExists(filePath)));
  return results.filter(Boolean).length;
}

async function validateYamlFile(filePath: string, schema: z.ZodTypeAny): Promise<boolean> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return schema.safeParse(parseYaml(content)).success;
  } catch {
    return false;
  }
}

export async function detectBootstrapBaseline(projectRoot: string): Promise<BootstrapBaselineType> {
  const formalOpsxCount = await countExistingFormalOpsxFiles(projectRoot);
  if (formalOpsxCount === 3) {
    const [mainPath, relationsPath, codeMapPath] = formalOpsxPaths(projectRoot);
    const [mainValid, relationsValid, codeMapValid] = await Promise.all([
      validateYamlFile(mainPath, ProjectOpsxFileSchema),
      validateYamlFile(relationsPath, ProjectOpsxRelationsFileSchema),
      validateYamlFile(codeMapPath, ProjectOpsxCodeMapFileSchema),
    ]);
    return mainValid && relationsValid && codeMapValid ? 'formal-opsx' : 'invalid-partial-opsx';
  }
  if (formalOpsxCount > 0) {
    return 'invalid-partial-opsx';
  }

  if (await hasRealSpecContent(projectRoot)) {
    return 'specs-based';
  }

  return 'raw';
}

export function getAllowedBootstrapModes(baselineType: BootstrapBaselineType): BootstrapMode[] {
  switch (baselineType) {
    case 'raw':
      return ['full', 'opsx-first'];
    case 'specs-based':
      return ['full'];
    case 'formal-opsx':
    case 'invalid-partial-opsx':
      return [];
  }
}

export function getBootstrapBaselineReason(baselineType: BootstrapBaselineType): string {
  switch (baselineType) {
    case 'raw':
      return 'Repository has no spec content or formal OPSX files.';
    case 'specs-based':
      return 'Repository has spec content but no formal OPSX files.';
    case 'formal-opsx':
      return 'Bootstrap does not support repositories with existing formal OPSX files.';
    case 'invalid-partial-opsx':
      return 'Bootstrap does not support repositories with partial or invalid formal OPSX files.';
  }
}

export function buildBootstrapPreInitStatus(baselineType: BootstrapBaselineType): BootstrapPreInitStatus {
  const allowedModes = getAllowedBootstrapModes(baselineType);
  return {
    initialized: false,
    baselineType,
    supported: allowedModes.length > 0,
    allowedModes,
    nextAction: allowedModes.length > 0 ? 'init' : null,
    reason: getBootstrapBaselineReason(baselineType),
  };
}

export async function getBootstrapPreInitStatus(projectRoot: string): Promise<BootstrapPreInitStatus> {
  return buildBootstrapPreInitStatus(await detectBootstrapBaseline(projectRoot));
}

function formatAllowedModes(allowedModes: BootstrapMode[]): string {
  return allowedModes.length > 0 ? allowedModes.join(', ') : '(none)';
}

function assertBootstrapModeAllowed(baselineType: BootstrapBaselineType, mode: BootstrapMode): void {
  const allowedModes = getAllowedBootstrapModes(baselineType);
  if (!allowedModes.includes(mode)) {
    throw new Error(
      `Bootstrap mode '${mode}' is not supported for baseline '${baselineType}'. Valid modes: ${formatAllowedModes(allowedModes)}`
    );
  }
}

function getNextBootstrapAction(phase: BootstrapPhase): BootstrapPhase | null {
  const currentIdx = BOOTSTRAP_PHASES.indexOf(phase);
  return currentIdx >= 0 && currentIdx < BOOTSTRAP_PHASES.length - 1
    ? BOOTSTRAP_PHASES[currentIdx + 1]
    : null;
}

async function candidateFilesExist(projectRoot: string): Promise<boolean> {
  const results = await Promise.all([
    FileSystemUtils.fileExists(candidatePath(projectRoot, 'project.opsx.yaml')),
    FileSystemUtils.fileExists(candidatePath(projectRoot, 'project.opsx.relations.yaml')),
    FileSystemUtils.fileExists(candidatePath(projectRoot, 'project.opsx.code-map.yaml')),
  ]);
  return results.every(Boolean);
}

function collectReviewChecks(reviewContent: string): { checkedDomains: Set<string>; uncheckedItems: string[] } {
  const checkedDomains = new Set<string>();
  const uncheckedItems: string[] = [];

  for (const rawLine of reviewContent.split('\n')) {
    const line = rawLine.trim();
    const checkedMatch = line.match(/^-\s+\[x\]\s+(dom\.\S+)/i);
    if (checkedMatch) {
      checkedDomains.add(checkedMatch[1]);
    }

    if (/^-\s+\[\s\]/.test(line)) {
      uncheckedItems.push(line);
    }
  }

  return { checkedDomains, uncheckedItems };
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
  const baselineType = await detectBootstrapBaseline(projectRoot);
  const preInitStatus = buildBootstrapPreInitStatus(baselineType);
  if (!preInitStatus.supported) {
    throw new Error(preInitStatus.reason);
  }
  assertBootstrapModeAllowed(baselineType, mode);
  const now = new Date().toISOString();

  const metadata: BootstrapMetadata = {
    phase: 'init',
    baseline_type: baselineType,
    mode,
    created_at: now,
    source_fingerprint: null,
    candidate_fingerprint: null,
    review_fingerprint: null,
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

  const fallbackBaselineType = await inferLegacyBaselineType(projectRoot);
  const metaRaw = await readYaml(bootstrapPath(projectRoot, '.bootstrap.yaml'));
  const metadata = parseBootstrapMetadata(metaRaw, fallbackBaselineType);

  let scope: ScopeConfig | null = null;
  try {
    const scopeRaw = await readYaml(bootstrapPath(projectRoot, 'scope.yaml'));
    scope = parseScopeConfig(scopeRaw);
  } catch { /* scope may not exist yet */ }

  let evidence: EvidenceFile | null = null;
  try {
    const evidenceRaw = await readYaml(bootstrapPath(projectRoot, 'evidence.yaml'));
    evidence = EvidenceFileSchema.parse(evidenceRaw);
  } catch { /* evidence may not exist yet */ }

  // Read domain maps
  const domainMaps = new Map<string, DomainMapFile>();
  const invalidDomainMaps = new Map<string, InvalidDomainMap>();
  const mapDir = bootstrapPath(projectRoot, 'domain-map');
  if (await FileSystemUtils.directoryExists(mapDir)) {
    const entries = await fs.readdir(mapDir);
    for (const entry of entries) {
      if (!entry.endsWith('.yaml')) continue;
      try {
        const raw = await readYaml(path.join(mapDir, entry));
        const parsed = DomainMapFileSchema.parse(raw);
        domainMaps.set(parsed.domain.id, parsed);
      } catch (error) {
        const domainId = entry.replace(/\.yaml$/, '');
        invalidDomainMaps.set(domainId, {
          file: entry,
          domainId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  const reviewPath = bootstrapPath(projectRoot, 'review.md');
  const reviewExists = await FileSystemUtils.fileExists(reviewPath);

  return { metadata, scope, evidence, domainMaps, invalidDomainMaps, reviewExists };
}

export async function advancePhase(projectRoot: string, targetPhase: BootstrapPhase): Promise<void> {
  const metaPath = bootstrapPath(projectRoot, '.bootstrap.yaml');
  const fallbackBaselineType = await inferLegacyBaselineType(projectRoot);
  const metaRaw = await readYaml(metaPath);
  const metadata = parseBootstrapMetadata(metaRaw, fallbackBaselineType);

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
  if (!await FileSystemUtils.directoryExists(bootstrapPath(projectRoot))) {
    return getBootstrapPreInitStatus(projectRoot);
  }

  const state = await readBootstrapState(projectRoot);
  const derived = await deriveBootstrapArtifacts(projectRoot, state);
  const domains: DomainStatus[] = [];

  if (state.evidence) {
    const orderedDomains = [...state.evidence.domains].sort(compareEvidenceDomains);
    for (const dom of orderedDomains) {
      const mapFile = state.domainMaps.get(dom.id);
      const invalidMap = state.invalidDomainMaps.get(dom.id);
      const mapState = mapFile ? 'valid' : invalidMap ? 'invalid' : 'missing';
      domains.push({
        id: dom.id,
        confidence: dom.confidence,
        mapped: mapState === 'valid',
        mapState,
        ...(invalidMap ? { mapError: invalidMap.error } : {}),
        capabilityCount: mapFile?.capabilities.length ?? 0,
        reviewed: derived.reviewState === 'current' && derived.checkedDomains.has(dom.id),
      });
    }
  }

  return {
    initialized: true,
    phase: state.metadata.phase,
    baselineType: state.metadata.baseline_type,
    mode: state.metadata.mode,
    nextAction: getNextBootstrapAction(state.metadata.phase),
    created_at: state.metadata.created_at,
    domains,
    totalDomains: domains.length,
    mappedDomains: domains.filter(d => d.mapped).length,
    reviewedDomains: domains.filter(d => d.reviewed).length,
    candidateState: derived.candidateState,
    reviewState: derived.reviewState,
    reviewApproved: derived.reviewApproved,
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
        const invalidMap = state.invalidDomainMaps.get(dom.id);
        if (invalidMap) {
          errors.push(
            `Domain '${dom.id}' has invalid domain-map: ${invalidMap.file} — ${invalidMap.error}`
          );
          continue;
        }
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
      const scanGate = await validateGate(projectRoot, 'scan_to_map');
      const mapGate = await validateGate(projectRoot, 'map_to_review');
      errors.push(...scanGate.errors, ...mapGate.errors);

      const derived = await deriveBootstrapArtifacts(projectRoot, state);
      if (!state.reviewExists) {
        errors.push('review.md not found');
      } else if (derived.reviewState !== 'current') {
        errors.push('Review approval is stale. Run `openspec bootstrap validate` to regenerate review.md and re-approve it.');
      }

      if (!derived.bundle || !derived.candidateFingerprint) {
        errors.push('Candidate OPSX artifacts are unavailable. Run `openspec bootstrap validate` after scan/map are complete.');
        break;
      }

      const reviewContent = state.reviewExists
        ? await fs.readFile(bootstrapPath(projectRoot, 'review.md'), 'utf-8')
        : '';
      const { uncheckedItems } = collectReviewChecks(reviewContent);
      for (const item of uncheckedItems) {
        errors.push(`Unchecked review item: ${item}`);
      }

      const bundle = derived.bundle;
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

  const sortedDomainMaps = [...state.domainMaps.entries()]
    .sort(([leftId], [rightId]) => leftId.localeCompare(rightId))
    .map(([, mapFile]) => mapFile);

  for (const mapFile of sortedDomainMaps) {
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

function computeSourceFingerprint(state: BootstrapState): string | null {
  if (!state.evidence) {
    return null;
  }

  const normalizedDomainMaps = [...state.domainMaps.entries()]
    .sort(([leftId], [rightId]) => leftId.localeCompare(rightId))
    .map(([, mapFile]) => normalizeDomainMapForFingerprint(mapFile));

  return fingerprintValue({
    evidence: normalizeEvidenceForFingerprint(state.evidence),
    domainMaps: normalizedDomainMaps,
  });
}

function computeCandidateFingerprint(bundle: ProjectOpsxBundle): string {
  return fingerprintValue(bundle);
}

async function writeBootstrapMetadata(projectRoot: string, metadata: BootstrapMetadata): Promise<void> {
  await writeYaml(bootstrapPath(projectRoot, '.bootstrap.yaml'), metadata);
}

async function writeCandidateFiles(projectRoot: string, bundle: ProjectOpsxBundle): Promise<void> {
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
    writeYaml(candidatePath(projectRoot, 'project.opsx.yaml'), mainData),
    writeYaml(candidatePath(projectRoot, 'project.opsx.relations.yaml'), relData),
    writeYaml(candidatePath(projectRoot, 'project.opsx.code-map.yaml'), mapData),
  ]);
}

function buildReviewContent(state: BootstrapState): string {
  if (!state.evidence) {
    throw new Error('No evidence.yaml found. Run scan phase first.');
  }

  const lines: string[] = ['# Bootstrap Review', ''];
  lines.push('Review the mapped architecture before promoting to formal OPSX files.', '');
  lines.push('This file is derived from evidence.yaml and domain-map/*.yaml. If either changes, regenerate review via `openspec bootstrap validate`.', '');
  lines.push('## Domain Checklist', '');

  const orderedDomains = [...state.evidence.domains].sort(compareEvidenceDomains);
  for (const dom of orderedDomains) {
    const mapFile = state.domainMaps.get(dom.id);
    const capCount = mapFile?.capabilities.length ?? 0;
    const status = mapFile ? `${capCount} capabilities` : 'unmapped';
    lines.push(`- [ ] ${dom.id} — ${status}, confidence: ${dom.confidence}`);
  }

  lines.push('', '## Validation', '');
  lines.push('- [ ] Review matches current candidate output');
  lines.push('- [ ] Referential integrity passes');
  lines.push('- [ ] Code-map paths exist on disk');
  lines.push('- [ ] Domain boundaries match mental model');
  lines.push('');

  return lines.join('\n');
}

async function deriveBootstrapArtifacts(projectRoot: string, state: BootstrapState): Promise<DerivedBootstrapArtifacts> {
  const reviewContent = state.reviewExists
    ? await fs.readFile(bootstrapPath(projectRoot, 'review.md'), 'utf-8').catch(() => '')
    : '';
  const { checkedDomains, uncheckedItems } = collectReviewChecks(reviewContent);

  const sourceFingerprint = computeSourceFingerprint(state);
  const bundle = sourceFingerprint ? assembleBundle(state) : null;
  const candidateFingerprint = bundle ? computeCandidateFingerprint(bundle) : null;
  const candidateExists = await candidateFilesExist(projectRoot);

  let candidateState: 'missing' | 'current' | 'stale' = !candidateFingerprint || !candidateExists
    ? 'missing'
    : state.metadata.source_fingerprint === sourceFingerprint
      && state.metadata.candidate_fingerprint === candidateFingerprint
      ? 'current'
      : 'stale';

  let reviewState: 'missing' | 'current' | 'stale' = !candidateFingerprint || !candidateExists || !state.reviewExists
    ? 'missing'
    : state.metadata.source_fingerprint === sourceFingerprint
      && state.metadata.review_fingerprint === candidateFingerprint
      ? 'current'
      : 'stale';

  if (state.invalidDomainMaps.size > 0) {
    if (candidateState === 'current') {
      candidateState = 'stale';
    }
    if (reviewState === 'current') {
      reviewState = 'stale';
    }
  }

  return {
    bundle,
    sourceFingerprint,
    candidateFingerprint,
    candidateState,
    reviewState,
    reviewApproved: reviewState === 'current' && uncheckedItems.length === 0,
    checkedDomains,
  };
}

export async function assembleCandidate(projectRoot: string): Promise<ProjectOpsxBundle> {
  const state = await readBootstrapState(projectRoot);
  const derived = await deriveBootstrapArtifacts(projectRoot, state);
  if (!derived.bundle || !derived.sourceFingerprint || !derived.candidateFingerprint) {
    throw new Error('No evidence.yaml found. Run scan phase first.');
  }

  await writeCandidateFiles(projectRoot, derived.bundle);
  await writeBootstrapMetadata(projectRoot, {
    ...state.metadata,
    source_fingerprint: derived.sourceFingerprint,
    candidate_fingerprint: derived.candidateFingerprint,
  });

  return derived.bundle;
}

export async function generateReview(projectRoot: string): Promise<string> {
  const state = await readBootstrapState(projectRoot);
  const derived = await deriveBootstrapArtifacts(projectRoot, state);
  if (!derived.candidateFingerprint) {
    throw new Error('No evidence.yaml found. Run scan phase first.');
  }

  const content = buildReviewContent(state);
  await fs.writeFile(bootstrapPath(projectRoot, 'review.md'), content, 'utf-8');
  await writeBootstrapMetadata(projectRoot, {
    ...state.metadata,
    source_fingerprint: derived.sourceFingerprint,
    candidate_fingerprint: derived.candidateFingerprint,
    review_fingerprint: derived.candidateFingerprint,
  });

  return content;
}

export async function refreshBootstrapDerivedArtifacts(
  projectRoot: string
): Promise<{ candidateUpdated: boolean; reviewUpdated: boolean }> {
  const state = await readBootstrapState(projectRoot);
  const derived = await deriveBootstrapArtifacts(projectRoot, state);
  if (!derived.bundle || !derived.sourceFingerprint || !derived.candidateFingerprint) {
    return { candidateUpdated: false, reviewUpdated: false };
  }

  const candidateUpdated = derived.candidateState !== 'current';
  const reviewUpdated = derived.reviewState !== 'current';

  if (candidateUpdated) {
    await writeCandidateFiles(projectRoot, derived.bundle);
  }

  if (reviewUpdated) {
    await fs.writeFile(bootstrapPath(projectRoot, 'review.md'), buildReviewContent(state), 'utf-8');
  }

  if (candidateUpdated || reviewUpdated) {
    await writeBootstrapMetadata(projectRoot, {
      ...state.metadata,
      source_fingerprint: derived.sourceFingerprint,
      candidate_fingerprint: derived.candidateFingerprint,
      review_fingerprint: reviewUpdated ? derived.candidateFingerprint : state.metadata.review_fingerprint,
    });
  }

  return { candidateUpdated, reviewUpdated };
}

async function writeBootstrapSpecStarter(projectRoot: string, state: BootstrapState): Promise<void> {
  if (state.metadata.mode !== 'full') {
    return;
  }

  if (await hasRealSpecContent(projectRoot)) {
    return;
  }

  const specsReadmePath = FileSystemUtils.joinPath(projectRoot, 'openspec/specs/README.md');
  if (await FileSystemUtils.fileExists(specsReadmePath)) {
    return;
  }

  const content = `# Specs Starter

This repository was bootstrapped in \`full\` mode.

- Formal OPSX files were generated from the bootstrap workflow.
- Add behavior specs incrementally with normal OpenSpec changes.
- Create focused specs under \`openspec/specs/<capability>/spec.md\` as features evolve.
`;

  await FileSystemUtils.writeFile(specsReadmePath, content);
}

export async function promoteBootstrap(projectRoot: string): Promise<void> {
  await refreshBootstrapDerivedArtifacts(projectRoot);

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
  await writeBootstrapSpecStarter(projectRoot, state);

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
