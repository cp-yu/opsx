import { promises as fs } from 'fs';
import { createHash } from 'crypto';
import path from 'path';
import { promisify } from 'util';
import { execFile as execFileCallback } from 'child_process';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import { z } from 'zod';
import { FileSystemUtils } from './file-system.js';
import {
  getRuntimeFingerprintInput,
  isChineseDocLanguage,
  projectConfigForRuntime,
  type RuntimeProjection,
} from '../core/config-projection.js';
import { readProjectConfig } from '../core/project-config.js';
import { Validator } from '../core/validation/validator.js';
import {
  OPSX_SCHEMA_VERSION,
  OPSX_PATHS,
  ProjectOpsxFileSchema,
  ProjectOpsxRelationsFileSchema,
  ProjectOpsxCodeMapFileSchema,
  applyOpsxDelta,
  readProjectOpsx,
  validateReferentialIntegrity,
  validateCodeMapIntegrity,
  writeProjectOpsx,
  type ProjectOpsxBundle,
  type OpsxRelation,
  type CodeMapEntry,
  type OpsxDelta,
  type OpsxNode,
  type OpsxDeltaApplyResult,
} from './opsx-utils.js';

// ─── Constants ───────────────────────────────────────────────────────────────

export const BOOTSTRAP_DIR = 'openspec/bootstrap';
export const DEFAULT_BOOTSTRAP_PROJECT_ID = 'project';
export const DEFAULT_BOOTSTRAP_PROJECT_NAME = 'Project';
export const BOOTSTRAP_WORKSPACE_RETAINED_NOTICE =
  'Bootstrap workspace retained at openspec/bootstrap/. You may delete it manually once you no longer need it.';
export const BOOTSTRAP_METADATA_FILE = '.bootstrap.yaml';
export const BOOTSTRAP_SCOPE_FILE = 'scope.yaml';
export const BOOTSTRAP_EVIDENCE_FILE = 'evidence.yaml';
export const BOOTSTRAP_DOMAIN_MAP_DIR = 'domain-map';
export const BOOTSTRAP_REVIEW_FILE = 'review.md';
export const BOOTSTRAP_CANDIDATE_DIR = 'candidate';
export const BOOTSTRAP_CANDIDATE_SPECS_DIR = path.join(BOOTSTRAP_CANDIDATE_DIR, 'specs');
export const BOOTSTRAP_CANDIDATE_FILE_NAMES = {
  project: 'project.opsx.yaml',
  relations: 'project.opsx.relations.yaml',
  codeMap: 'project.opsx.code-map.yaml',
} as const;
const execFile = promisify(execFileCallback);

export const BOOTSTRAP_PHASES = ['init', 'scan', 'map', 'review', 'promote'] as const;
export type BootstrapPhase = typeof BOOTSTRAP_PHASES[number];

export const BOOTSTRAP_MODES = ['full', 'opsx-first', 'refresh'] as const;
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
  refresh_anchor_commit: z.string().nullable().optional(),
  candidate_spec_paths: z.array(z.string()).optional(),
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
  spec: z.object({
    preserve_existing: z.boolean().optional().default(false),
    folder: z
      .string()
      .min(1)
      .regex(/^[A-Za-z0-9][A-Za-z0-9._-]*$/)
      .refine((value) => value !== '.' && value !== '..', 'folder must be a single path segment'),
    purpose: z.string().min(1),
    requirements: z.array(z.object({
      title: z.string().min(1),
      text: z.string().min(1),
      scenarios: z.array(z.object({
        title: z.string().min(1),
        steps: z.array(z.object({
          keyword: z.enum(['GIVEN', 'WHEN', 'THEN', 'AND']),
          text: z.string().min(1),
        })).min(1),
      })).min(1),
    })).min(1),
  }).optional(),
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
  refresh_anchor_commit: string | null;
  candidate_spec_paths: string[];
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
export type DomainCapability = z.infer<typeof DomainCapabilitySchema>;

interface BootstrapCandidateSpec {
  capabilityId: string;
  folder: string;
  candidateRelativePath: string;
  formalRelativePath: string;
  content: string;
}

interface CandidateSpecAssembly {
  specs: BootstrapCandidateSpec[];
  preservedFormalPaths: string[];
  sourceErrors: string[];
  validationErrors: string[];
}

type RefreshPlanStrategy = 'git-diff' | 'full-scan-fallback';

interface RefreshPlan {
  strategy: RefreshPlanStrategy;
  reason: string;
  anchorCommit: string | null;
  changedPaths: string[];
  mappedNodeIds: string[];
  neighborNodeIds: string[];
  impactedNodeIds: string[];
  impactedDomainIds: string[];
}

interface RefreshDeltaSummary {
  delta: OpsxDelta;
  result: OpsxDeltaApplyResult;
  mergedBundle: ProjectOpsxBundle;
  affectedDomainIds: string[];
  affectedNodeIds: string[];
  preservedNodeIds: string[];
}

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
  candidateSpecs: BootstrapCandidateSpec[];
  preservedFormalPaths: string[];
  specErrors: string[];
  sourceFingerprint: string | null;
  candidateFingerprint: string | null;
  candidateState: 'missing' | 'current' | 'stale';
  reviewState: 'missing' | 'current' | 'stale';
  reviewApproved: boolean;
  checkedDomains: Set<string>;
  refreshPlan: RefreshPlan | null;
  refreshDelta: RefreshDeltaSummary | null;
}

export interface PromoteBootstrapResult {
  retainedWorkspaceNotice: string;
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
    refresh_anchor_commit: parsed.refresh_anchor_commit ?? null,
    candidate_spec_paths: parsed.candidate_spec_paths ?? [],
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
  return bootstrapPath(projectRoot, BOOTSTRAP_CANDIDATE_DIR, fileName);
}

function candidateSpecPath(projectRoot: string, folder: string): string {
  return bootstrapPath(projectRoot, BOOTSTRAP_CANDIDATE_SPECS_DIR, folder, 'spec.md');
}

function formalSpecPath(projectRoot: string, folder: string): string {
  return FileSystemUtils.joinPath(projectRoot, 'openspec', 'specs', folder, 'spec.md');
}

function compareConfidence(a: EvidenceDomain['confidence'], b: EvidenceDomain['confidence']): number {
  return DOMAIN_CONFIDENCE_ORDER[a] - DOMAIN_CONFIDENCE_ORDER[b];
}

function compareEvidenceDomains(a: EvidenceDomain, b: EvidenceDomain): number {
  const confidenceComparison = compareConfidence(a.confidence, b.confidence);
  return confidenceComparison !== 0 ? confidenceComparison : a.id.localeCompare(b.id);
}

function normalizeBootstrapText(value: string | undefined): string | undefined {
  const normalized = value?.trim().replace(/\s+/g, ' ');
  return normalized ? normalized : undefined;
}

function canDeriveBootstrapProjectMetadata(state: BootstrapState): boolean {
  return state.metadata.baseline_type === 'raw' || state.metadata.baseline_type === 'specs-based';
}

function deriveProjectIntent(state: BootstrapState): string | undefined {
  if (!canDeriveBootstrapProjectMetadata(state)) {
    return undefined;
  }

  const intentsByDomain = new Map<string, string>();
  for (const domain of state.evidence?.domains ?? []) {
    const normalizedIntent = normalizeBootstrapText(domain.intent);
    if (normalizedIntent) {
      intentsByDomain.set(domain.id, normalizedIntent);
    }
  }

  for (const [domainId, mapFile] of [...state.domainMaps.entries()].sort(([leftId], [rightId]) => leftId.localeCompare(rightId))) {
    const normalizedIntent = normalizeBootstrapText(mapFile.domain.intent);
    if (normalizedIntent) {
      intentsByDomain.set(domainId, normalizedIntent);
    }
  }

  if (intentsByDomain.size === 0 || state.domainMaps.size === 0) {
    return undefined;
  }

  return [...intentsByDomain.entries()]
    .sort(([leftId], [rightId]) => leftId.localeCompare(rightId))
    .map(([, intent]) => intent)
    .join('; ');
}

function deriveProjectScope(state: BootstrapState): string | undefined {
  if (!canDeriveBootstrapProjectMetadata(state) || !state.scope) {
    return undefined;
  }

  const mappedDomainIds = [...state.domainMaps.keys()].sort();
  const segments = [`mode=${state.scope.mode}`];
  if (state.scope.include.length > 0) {
    segments.push(`include=${state.scope.include.join(', ')}`);
  }
  if (state.scope.exclude.length > 0) {
    segments.push(`exclude=${state.scope.exclude.join(', ')}`);
  }
  if (mappedDomainIds.length > 0) {
    segments.push(`mapped domains=${mappedDomainIds.join(', ')}`);
  }

  if (segments.length === 1) {
    return undefined;
  }

  return segments.join('; ');
}

function buildBootstrapProjectMetadata(state: BootstrapState): ProjectOpsxBundle['project'] {
  const intent = deriveProjectIntent(state);
  const scope = deriveProjectScope(state);
  return {
    id: DEFAULT_BOOTSTRAP_PROJECT_ID,
    name: DEFAULT_BOOTSTRAP_PROJECT_NAME,
    ...(intent ? { intent } : {}),
    ...(scope ? { scope } : {}),
  };
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

function toPathSegments(value: string): string[] {
  return value.split(/[\\/]+/).filter(Boolean);
}

function looksWindowsLikePath(value: string): boolean {
  return /^[A-Za-z]:[\\/]/.test(value) || value.includes('\\');
}

function normalizeRelativePath(value: string): string {
  const segments = toPathSegments(value.trim());
  return segments.length > 0 ? path.join(...segments) : '';
}

function normalizeComparableAbsolutePath(projectRoot: string, value: string): { comparable: string; absolute: string } {
  const normalizedInput = normalizeRelativePath(value);
  const absolute = path.normalize(path.resolve(projectRoot, normalizedInput));
  const comparable = (process.platform === 'win32' || looksWindowsLikePath(value))
    ? absolute.toLowerCase()
    : absolute;
  return { absolute, comparable };
}

function isPathCoveredByRef(projectRoot: string, changedPath: string, refPath: string): boolean {
  const changed = normalizeComparableAbsolutePath(projectRoot, changedPath);
  const ref = normalizeComparableAbsolutePath(projectRoot, refPath);
  return changed.comparable === ref.comparable
    || changed.comparable.startsWith(`${ref.comparable}${path.sep}`);
}

async function runGitCommand(projectRoot: string, args: string[]): Promise<{ ok: boolean; stdout: string; stderr: string }> {
  try {
    const result = await execFile('git', args, {
      cwd: projectRoot,
      windowsHide: true,
    });
    return {
      ok: true,
      stdout: result.stdout.trim(),
      stderr: result.stderr.trim(),
    };
  } catch (error: any) {
    if (error?.code === 'ENOENT') {
      return { ok: false, stdout: '', stderr: 'git executable not found' };
    }
    return {
      ok: false,
      stdout: typeof error?.stdout === 'string' ? error.stdout.trim() : '',
      stderr: typeof error?.stderr === 'string' ? error.stderr.trim() : String(error?.message ?? error),
    };
  }
}

async function resolveCurrentGitHead(projectRoot: string): Promise<string | null> {
  const result = await runGitCommand(projectRoot, ['rev-parse', 'HEAD']);
  return result.ok && result.stdout ? result.stdout : null;
}

async function collectGitChangedPaths(projectRoot: string, anchorCommit: string | null): Promise<RefreshPlan> {
  const workTree = await runGitCommand(projectRoot, ['rev-parse', '--is-inside-work-tree']);
  if (!workTree.ok || workTree.stdout !== 'true') {
    return {
      strategy: 'full-scan-fallback',
      reason: 'Git 不可用，或当前目录不在 git work tree 中。',
      anchorCommit: null,
      changedPaths: [],
      mappedNodeIds: [],
      neighborNodeIds: [],
      impactedNodeIds: [],
      impactedDomainIds: [],
    };
  }

  if (!anchorCommit) {
    return {
      strategy: 'full-scan-fallback',
      reason: 'Refresh 锚点缺失，无法可靠缩小扫描范围。',
      anchorCommit: null,
      changedPaths: [],
      mappedNodeIds: [],
      neighborNodeIds: [],
      impactedNodeIds: [],
      impactedDomainIds: [],
    };
  }

  const anchorReachable = await runGitCommand(projectRoot, ['cat-file', '-e', `${anchorCommit}^{commit}`]);
  if (!anchorReachable.ok) {
    return {
      strategy: 'full-scan-fallback',
      reason: `Refresh 锚点提交 '${anchorCommit}' 不可达，回退到全量扫描。`,
      anchorCommit,
      changedPaths: [],
      mappedNodeIds: [],
      neighborNodeIds: [],
      impactedNodeIds: [],
      impactedDomainIds: [],
    };
  }

  const [committed, staged, unstaged, untracked] = await Promise.all([
    runGitCommand(projectRoot, ['diff', '--name-only', '--diff-filter=ACDMRTUXB', `${anchorCommit}..HEAD`]),
    runGitCommand(projectRoot, ['diff', '--name-only', '--cached', '--diff-filter=ACDMRTUXB']),
    runGitCommand(projectRoot, ['diff', '--name-only', '--diff-filter=ACDMRTUXB']),
    runGitCommand(projectRoot, ['ls-files', '--others', '--exclude-standard']),
  ]);

  if ([committed, staged, unstaged, untracked].some((result) => !result.ok)) {
    return {
      strategy: 'full-scan-fallback',
      reason: '无法稳定收集 git diff 结果，回退到全量扫描。',
      anchorCommit,
      changedPaths: [],
      mappedNodeIds: [],
      neighborNodeIds: [],
      impactedNodeIds: [],
      impactedDomainIds: [],
    };
  }

  const ignorePrefixes = [
    `${path.normalize('openspec/bootstrap')}${path.sep}`,
    `${path.normalize('openspec/specs')}${path.sep}`,
  ];
  const ignoreFiles = new Set([
    path.normalize(OPSX_PATHS.PROJECT_FILE),
    path.normalize(OPSX_PATHS.RELATIONS_FILE),
    path.normalize(OPSX_PATHS.CODE_MAP_FILE),
  ]);

  const changedPaths = [...new Set(
    [committed.stdout, staged.stdout, unstaged.stdout, untracked.stdout]
      .flatMap((value) => value.split('\n'))
      .map((entry) => normalizeRelativePath(entry))
      .filter(Boolean)
      .filter((entry) => !ignoreFiles.has(path.normalize(entry)))
      .filter((entry) => !ignorePrefixes.some((prefix) => path.normalize(entry).startsWith(prefix)))
  )].sort();

  return {
    strategy: 'git-diff',
    reason: changedPaths.length > 0
      ? '使用 git 锚点与工作树 diff 缩小 refresh 扫描范围。'
      : 'git 锚点可用，但未发现需要映射到 code-map 的源码路径变化。',
    anchorCommit,
    changedPaths,
    mappedNodeIds: [],
    neighborNodeIds: [],
    impactedNodeIds: [],
    impactedDomainIds: [],
  };
}

export function mapChangedPathsToNodeIds(
  projectRoot: string,
  bundle: ProjectOpsxBundle,
  changedPaths: string[]
): { mappedNodeIds: string[]; unmappedPaths: string[] } {
  const matched = new Set<string>();
  const unmappedPaths: string[] = [];

  for (const changedPath of changedPaths) {
    let mapped = false;
    for (const entry of bundle.code_map) {
      if (entry.refs.some((ref) => isPathCoveredByRef(projectRoot, changedPath, ref.path))) {
        matched.add(entry.id);
        mapped = true;
      }
    }
    if (!mapped) {
      unmappedPaths.push(changedPath);
    }
  }

  return {
    mappedNodeIds: [...matched].sort(),
    unmappedPaths,
  };
}

function expandNeighborNodeIds(bundle: ProjectOpsxBundle, nodeIds: string[]): string[] {
  const expanded = new Set(nodeIds);
  for (const relation of bundle.relations) {
    if (expanded.has(relation.from) || expanded.has(relation.to)) {
      expanded.add(relation.from);
      expanded.add(relation.to);
    }
  }
  return [...expanded].sort();
}

function findDomainForNode(bundle: ProjectOpsxBundle, nodeId: string): string | null {
  if (nodeId.startsWith('dom.')) {
    return nodeId;
  }

  const containsRelation = bundle.relations.find((relation) => relation.from === nodeId && relation.type === 'contains' && relation.to.startsWith('dom.'));
  if (containsRelation) {
    return containsRelation.to;
  }

  const capabilityMatch = nodeId.match(/^cap\.([^.]+)\./);
  return capabilityMatch ? `dom.${capabilityMatch[1]}` : null;
}

function collectDomainIdsForNodes(bundle: ProjectOpsxBundle, nodeIds: string[]): string[] {
  const domainIds = new Set<string>();
  for (const nodeId of nodeIds) {
    const domainId = findDomainForNode(bundle, nodeId);
    if (domainId) {
      domainIds.add(domainId);
    }
  }
  return [...domainIds].sort();
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
      return ['refresh'];
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
      return 'Repository already has formal OPSX files. Use refresh to run an incremental bootstrap pass.';
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

async function candidateFilesExist(projectRoot: string, candidateSpecs: BootstrapCandidateSpec[]): Promise<boolean> {
  const results = await Promise.all([
    FileSystemUtils.fileExists(candidatePath(projectRoot, 'project.opsx.yaml')),
    FileSystemUtils.fileExists(candidatePath(projectRoot, 'project.opsx.relations.yaml')),
    FileSystemUtils.fileExists(candidatePath(projectRoot, 'project.opsx.code-map.yaml')),
    ...candidateSpecs.map((spec) => FileSystemUtils.fileExists(candidateSpecPath(projectRoot, spec.folder))),
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

function usesShallOrMust(text: string): boolean {
  return /\b(SHALL|MUST)\b/.test(text);
}

function normalizeSpecFolderInput(folder: string): string {
  return folder.trim();
}

function getConfiguredSchemaName(projectRoot: string): string {
  return readProjectConfig(projectRoot)?.schema ?? 'spec-driven';
}

function validateSpecScenarioSteps(
  capabilityId: string,
  requirementTitle: string,
  scenarioTitle: string,
  steps: Array<{ keyword: 'GIVEN' | 'WHEN' | 'THEN' | 'AND'; text: string }>
): string[] {
  const errors: string[] = [];
  const keywords = new Set(steps.map((step) => step.keyword));
  if (!keywords.has('WHEN')) {
    errors.push(`Capability '${capabilityId}' requirement '${requirementTitle}' scenario '${scenarioTitle}' must include at least one WHEN step`);
  }
  if (!keywords.has('THEN')) {
    errors.push(`Capability '${capabilityId}' requirement '${requirementTitle}' scenario '${scenarioTitle}' must include at least one THEN step`);
  }
  return errors;
}

function renderProjectedProse(text: string, projection: RuntimeProjection): string {
  if (projection.preserveCanonicalTokens) {
    return text.trim();
  }

  return text.trim();
}

function renderCandidateSpec(
  capability: DomainCapability,
  folder: string,
  projection: RuntimeProjection
): string {
  const spec = capability.spec!;
  const lines: string[] = [
    `# Spec: ${folder}`,
    '',
    '## Purpose',
    '',
    renderProjectedProse(spec.purpose, projection),
    '',
    '## Requirements',
    '',
  ];

  for (const requirement of spec.requirements) {
    lines.push(`### Requirement: ${renderProjectedProse(requirement.title, projection)}`);
    lines.push(renderProjectedProse(requirement.text, projection));
    lines.push('');

    for (const scenario of requirement.scenarios) {
      lines.push(`#### Scenario: ${renderProjectedProse(scenario.title, projection)}`);
      for (const step of scenario.steps) {
        lines.push(`- **${step.keyword}** ${renderProjectedProse(step.text, projection)}`);
      }
      lines.push('');
    }
  }

  return `${lines.join('\n').trim()}\n`;
}

async function assembleCandidateSpecs(
  projectRoot: string,
  state: BootstrapState,
  bundle: ProjectOpsxBundle | null,
  options: { addedCapabilityIds?: Set<string> } = {}
): Promise<CandidateSpecAssembly> {
  if (!bundle || (state.metadata.mode !== 'full' && state.metadata.mode !== 'refresh')) {
    return { specs: [], preservedFormalPaths: [], sourceErrors: [], validationErrors: [] };
  }

  const sourceErrors: string[] = [];
  const specs: BootstrapCandidateSpec[] = [];
  const preservedFormalPaths: string[] = [];
  const validationErrors: string[] = [];
  const seenFolders = new Map<string, string>();
  const validator = new Validator(false);
  const candidateProjection = projectConfigForRuntime(readProjectConfig(projectRoot), {
    consumer: 'bootstrap-candidate-spec',
  });

  const sortedDomainMaps = [...state.domainMaps.entries()]
    .sort(([leftId], [rightId]) => leftId.localeCompare(rightId))
    .map(([, mapFile]) => mapFile);
  const restrictToAddedCapabilities = state.metadata.mode === 'refresh' ? (options.addedCapabilityIds ?? new Set<string>()) : null;

  for (const mapFile of sortedDomainMaps) {
    for (const capability of [...mapFile.capabilities].sort((a, b) => a.id.localeCompare(b.id))) {
      if (restrictToAddedCapabilities && !restrictToAddedCapabilities.has(capability.id)) {
        const formalPath = capability.spec ? `openspec/specs/${normalizeSpecFolderInput(capability.spec.folder)}/spec.md` : null;
        if (formalPath) {
          preservedFormalPaths.push(formalPath);
        }
        continue;
      }

      if (!capability.spec) {
        sourceErrors.push(`Capability '${capability.id}' is missing spec source data. Add spec.folder, spec.purpose, and spec.requirements.`);
        continue;
      }

      const folder = normalizeSpecFolderInput(capability.spec.folder);
      if (!folder || folder.includes('/') || folder.includes('\\')) {
        sourceErrors.push(`Capability '${capability.id}' has invalid spec folder '${capability.spec.folder}'. Use a single cross-platform path segment.`);
        continue;
      }

      const priorCapability = seenFolders.get(folder);
      if (priorCapability && priorCapability !== capability.id) {
        sourceErrors.push(`Capabilities '${priorCapability}' and '${capability.id}' map to the same spec folder '${folder}'`);
        continue;
      }
      seenFolders.set(folder, capability.id);

      if (!capability.spec.purpose.trim()) {
        sourceErrors.push(`Capability '${capability.id}' has an empty spec purpose`);
      }

      for (const requirement of capability.spec.requirements) {
        if (!usesShallOrMust(requirement.text)) {
          sourceErrors.push(`Capability '${capability.id}' requirement '${requirement.title}' must contain SHALL or MUST`);
        }

        for (const scenario of requirement.scenarios) {
          sourceErrors.push(
            ...validateSpecScenarioSteps(capability.id, requirement.title, scenario.title, scenario.steps)
          );
        }
      }

      const formalRelativePath = `openspec/specs/${folder}/spec.md`;
      const existingFormalPath = formalSpecPath(projectRoot, folder);
      const alreadyExists = await FileSystemUtils.fileExists(existingFormalPath);
      if (state.metadata.mode === 'refresh' && alreadyExists) {
        sourceErrors.push(
          `Refresh cannot write spec '${formalRelativePath}' because the target path already exists. Preserve existing formal specs or choose a different folder.`
        );
        continue;
      }

      if (state.metadata.baseline_type === 'specs-based' && alreadyExists) {
        if (capability.spec.preserve_existing) {
          preservedFormalPaths.push(formalRelativePath);
          continue;
        }
        sourceErrors.push(
          `Capability '${capability.id}' maps to existing spec path '${formalRelativePath}'. Mark spec.preserve_existing: true to preserve it, or choose a different folder.`
        );
        continue;
      }

      const candidateRelativePath = `openspec/bootstrap/candidate/specs/${folder}/spec.md`;
      const content = renderCandidateSpec(capability, folder, candidateProjection);
      specs.push({
        capabilityId: capability.id,
        folder,
        candidateRelativePath,
        formalRelativePath,
        content,
      });

      const report = await validator.validateSpecContent(folder, content);
      if (!report.valid) {
        for (const issue of report.issues.filter((issue) => issue.level === 'ERROR')) {
          validationErrors.push(
            `Candidate spec '${candidateRelativePath}' failed validation at ${issue.path || 'file'}: ${issue.message}`
          );
        }
      }
    }
  }

  return {
    specs,
    preservedFormalPaths: preservedFormalPaths.sort(),
    sourceErrors,
    validationErrors,
  };
}

async function validateFormalSpecTargets(
  projectRoot: string,
  state: BootstrapState,
  candidateSpecs: BootstrapCandidateSpec[]
): Promise<string[]> {
  const errors: string[] = [];
  for (const spec of candidateSpecs) {
    const formalPath = formalSpecPath(projectRoot, spec.folder);
    if (await FileSystemUtils.fileExists(formalPath)) {
      if (state.metadata.baseline_type === 'specs-based') {
        errors.push(`Cannot promote candidate spec '${spec.formalRelativePath}' because the target path already exists`);
      } else {
        errors.push(`Raw bootstrap cannot promote over existing spec path '${spec.formalRelativePath}'`);
      }
    }
  }
  return errors;
}

async function validateCandidateSpecsOnDisk(
  projectRoot: string,
  candidateSpecs: BootstrapCandidateSpec[]
): Promise<string[]> {
  const errors: string[] = [];
  const validator = new Validator(false);

  for (const spec of candidateSpecs) {
    const filePath = candidateSpecPath(projectRoot, spec.folder);
    let content: string;
    try {
      content = await fs.readFile(filePath, 'utf-8');
    } catch {
      errors.push(`Candidate spec is missing: ${spec.candidateRelativePath}`);
      continue;
    }

    const report = await validator.validateSpecContent(spec.folder, content);
    if (!report.valid) {
      for (const issue of report.issues.filter((i) => i.level === 'ERROR')) {
        errors.push(`Candidate spec '${spec.candidateRelativePath}' failed validation at ${issue.path || 'file'}: ${issue.message}`);
      }
    }
  }

  return errors;
}

async function copyFile(sourcePath: string, targetPath: string): Promise<void> {
  await FileSystemUtils.createDirectory(path.dirname(targetPath));
  const content = await fs.readFile(sourcePath);
  await fs.writeFile(targetPath, content);
}

function sortNodes<T extends OpsxNode>(nodes: T[]): T[] {
  return [...nodes].sort((left, right) => left.id.localeCompare(right.id));
}

function sortRelations(relations: OpsxRelation[]): OpsxRelation[] {
  return [...relations].sort((left, right) => {
    const fromComparison = left.from.localeCompare(right.from);
    if (fromComparison !== 0) return fromComparison;
    const toComparison = left.to.localeCompare(right.to);
    if (toComparison !== 0) return toComparison;
    return left.type.localeCompare(right.type);
  });
}

function sortCodeMap(entries: CodeMapEntry[]): CodeMapEntry[] {
  return [...entries]
    .map((entry) => ({
      ...entry,
      refs: [...entry.refs].sort((left, right) => {
        const pathComparison = left.path.localeCompare(right.path);
        if (pathComparison !== 0) return pathComparison;
        const startComparison = (left.line_start ?? 0) - (right.line_start ?? 0);
        if (startComparison !== 0) return startComparison;
        return (left.line_end ?? 0) - (right.line_end ?? 0);
      }),
    }))
    .sort((left, right) => left.id.localeCompare(right.id));
}

function relationKey(relation: OpsxRelation): string {
  return `${relation.from}|${relation.to}|${relation.type}`;
}

function relationPairKey(relation: OpsxRelation): string {
  return `${relation.from}|${relation.to}`;
}

function nodesEqual(left: OpsxNode, right: OpsxNode): boolean {
  return stableStringify(left) === stableStringify(right);
}

function codeMapEntryEqual(left: CodeMapEntry, right: CodeMapEntry): boolean {
  return stableStringify({
    ...left,
    refs: sortCodeMap([left])[0]?.refs ?? left.refs,
  }) === stableStringify({
    ...right,
    refs: sortCodeMap([right])[0]?.refs ?? right.refs,
  });
}

function collectCapabilitiesForDomains(bundle: ProjectOpsxBundle, domainIds: Set<string>): string[] {
  const capabilities = new Set<string>();
  for (const relation of bundle.relations) {
    if (relation.type === 'contains' && domainIds.has(relation.to) && relation.from.startsWith('cap.')) {
      capabilities.add(relation.from);
    }
  }
  for (const capability of bundle.capabilities) {
    const domainId = findDomainForNode(bundle, capability.id);
    if (domainId && domainIds.has(domainId)) {
      capabilities.add(capability.id);
    }
  }
  return [...capabilities].sort();
}

function buildRefreshFallbackPlan(reason: string, anchorCommit: string | null): RefreshPlan {
  return {
    strategy: 'full-scan-fallback',
    reason,
    anchorCommit,
    changedPaths: [],
    mappedNodeIds: [],
    neighborNodeIds: [],
    impactedNodeIds: [],
    impactedDomainIds: [],
  };
}

async function deriveRefreshPlan(projectRoot: string, state: BootstrapState, formalBundle: ProjectOpsxBundle): Promise<RefreshPlan> {
  const rawPlan = await collectGitChangedPaths(projectRoot, state.metadata.refresh_anchor_commit);
  if (rawPlan.strategy === 'full-scan-fallback') {
    return rawPlan;
  }

  if (rawPlan.changedPaths.length === 0) {
    return {
      ...rawPlan,
      impactedDomainIds: [...state.domainMaps.keys()].sort(),
    };
  }

  const mapping = mapChangedPathsToNodeIds(projectRoot, formalBundle, rawPlan.changedPaths);
  if (mapping.unmappedPaths.length > 0) {
    return buildRefreshFallbackPlan(
      `变更路径无法可信映射到现有 code-map：${mapping.unmappedPaths.join(', ')}`,
      rawPlan.anchorCommit
    );
  }

  if (mapping.mappedNodeIds.length === 0) {
    return buildRefreshFallbackPlan(
      'git diff 命中了源码路径，但没有映射到任何 formal OPSX 节点，回退到全量扫描。',
      rawPlan.anchorCommit
    );
  }

  const neighborNodeIds = expandNeighborNodeIds(formalBundle, mapping.mappedNodeIds);
  return {
    ...rawPlan,
    mappedNodeIds: mapping.mappedNodeIds,
    neighborNodeIds,
    impactedNodeIds: neighborNodeIds,
    impactedDomainIds: collectDomainIdsForNodes(formalBundle, neighborNodeIds),
  };
}

function assembleRefreshDelta(
  formalBundle: ProjectOpsxBundle,
  partialBundle: ProjectOpsxBundle,
  refreshPlan: RefreshPlan
): RefreshDeltaSummary {
  const partialDomainIds = new Set(partialBundle.domains.map((domain) => domain.id));
  const affectedDomainIds = new Set(
    refreshPlan.impactedDomainIds.length > 0
      ? refreshPlan.impactedDomainIds
      : [...partialDomainIds]
  );
  for (const domainId of partialDomainIds) {
    affectedDomainIds.add(domainId);
  }

  const affectedCapabilityIds = new Set([
    ...collectCapabilitiesForDomains(formalBundle, affectedDomainIds),
    ...collectCapabilitiesForDomains(partialBundle, affectedDomainIds),
  ]);
  for (const capability of partialBundle.capabilities) {
    affectedCapabilityIds.add(capability.id);
  }

  const affectedNodeIds = new Set<string>([
    ...affectedDomainIds,
    ...affectedCapabilityIds,
  ]);
  const preservedNodeIds = [
    ...formalBundle.domains.map((domain) => domain.id),
    ...formalBundle.capabilities.map((capability) => capability.id),
  ].filter((nodeId) => !affectedNodeIds.has(nodeId)).sort();

  const partialDomainsById = new Map(partialBundle.domains.map((domain) => [domain.id, domain]));
  const formalDomainsById = new Map(formalBundle.domains.map((domain) => [domain.id, domain]));
  const partialCapabilitiesById = new Map(partialBundle.capabilities.map((capability) => [capability.id, capability]));
  const formalCapabilitiesById = new Map(formalBundle.capabilities.map((capability) => [capability.id, capability]));

  const addedDomains: ProjectOpsxBundle['domains'] = [];
  const modifiedDomains: ProjectOpsxBundle['domains'] = [];
  const removedDomains: ProjectOpsxBundle['domains'] = [];
  for (const domainId of [...affectedDomainIds].sort()) {
    const formalDomain = formalDomainsById.get(domainId);
    const partialDomain = partialDomainsById.get(domainId);
    if (!formalDomain && partialDomain) {
      addedDomains.push(partialDomain);
      continue;
    }
    if (formalDomain && !partialDomain) {
      removedDomains.push(formalDomain);
      continue;
    }
    if (formalDomain && partialDomain && !nodesEqual(formalDomain, partialDomain)) {
      modifiedDomains.push(partialDomain);
    }
  }

  const addedCapabilities: ProjectOpsxBundle['capabilities'] = [];
  const modifiedCapabilities: ProjectOpsxBundle['capabilities'] = [];
  const removedCapabilities: ProjectOpsxBundle['capabilities'] = [];
  for (const capabilityId of [...affectedCapabilityIds].sort()) {
    const formalCapability = formalCapabilitiesById.get(capabilityId);
    const partialCapability = partialCapabilitiesById.get(capabilityId);
    if (!formalCapability && partialCapability) {
      addedCapabilities.push(partialCapability);
      continue;
    }
    if (formalCapability && !partialCapability) {
      removedCapabilities.push(formalCapability);
      continue;
    }
    if (formalCapability && partialCapability && !nodesEqual(formalCapability, partialCapability)) {
      modifiedCapabilities.push(partialCapability);
    }
  }

  const affectedRelationKeys = new Set<string>();
  for (const relation of [...formalBundle.relations, ...partialBundle.relations]) {
    if (affectedNodeIds.has(relation.from) || affectedNodeIds.has(relation.to)) {
      affectedRelationKeys.add(relationKey(relation));
    }
  }
  const formalRelations = formalBundle.relations.filter((relation) => affectedNodeIds.has(relation.from) || affectedNodeIds.has(relation.to));
  const partialRelations = partialBundle.relations.filter((relation) => affectedNodeIds.has(relation.from) || affectedNodeIds.has(relation.to));
  const formalRelationsByKey = new Map(formalRelations.map((relation) => [relationKey(relation), relation]));
  const partialRelationsByKey = new Map(partialRelations.map((relation) => [relationKey(relation), relation]));
  const formalRelationsByPair = new Map(formalRelations.map((relation) => [relationPairKey(relation), relation]));
  const partialRelationsByPair = new Map(partialRelations.map((relation) => [relationPairKey(relation), relation]));

  const addedRelations: OpsxRelation[] = [];
  const modifiedRelations: OpsxRelation[] = [];
  const removedRelations: OpsxRelation[] = [];

  for (const relation of partialRelations) {
    const pairKey = relationPairKey(relation);
    const formalRelation = formalRelationsByPair.get(pairKey);
    if (!formalRelation) {
      addedRelations.push(relation);
      continue;
    }
    if (relationKey(formalRelation) !== relationKey(relation)) {
      modifiedRelations.push(relation);
    }
  }

  for (const relation of formalRelations) {
    if (!partialRelationsByPair.has(relationPairKey(relation))) {
      removedRelations.push(relation);
    }
  }

  const delta: OpsxDelta = {
    ...(addedDomains.length || addedCapabilities.length || addedRelations.length
      ? {
          ADDED: {
            ...(addedDomains.length ? { domains: sortNodes(addedDomains) } : {}),
            ...(addedCapabilities.length ? { capabilities: sortNodes(addedCapabilities) } : {}),
            ...(addedRelations.length ? { relations: sortRelations(addedRelations) } : {}),
          },
        }
      : {}),
    ...(modifiedDomains.length || modifiedCapabilities.length || modifiedRelations.length
      ? {
          MODIFIED: {
            ...(modifiedDomains.length ? { domains: sortNodes(modifiedDomains) } : {}),
            ...(modifiedCapabilities.length ? { capabilities: sortNodes(modifiedCapabilities) } : {}),
            ...(modifiedRelations.length ? { relations: sortRelations(modifiedRelations) } : {}),
          },
        }
      : {}),
    ...(removedDomains.length || removedCapabilities.length || removedRelations.length
      ? {
          REMOVED: {
            ...(removedDomains.length ? { domains: sortNodes(removedDomains) } : {}),
            ...(removedCapabilities.length ? { capabilities: sortNodes(removedCapabilities) } : {}),
            ...(removedRelations.length ? { relations: sortRelations(removedRelations) } : {}),
          },
        }
      : {}),
  };

  const result = applyOpsxDelta(formalBundle, delta);
  const removedNodeIds = new Set([
    ...removedDomains.map((domain) => domain.id),
    ...removedCapabilities.map((capability) => capability.id),
  ]);
  const mergedCodeMap = new Map<string, CodeMapEntry>();
  for (const entry of formalBundle.code_map) {
    if (!affectedNodeIds.has(entry.id)) {
      mergedCodeMap.set(entry.id, entry);
    }
  }
  for (const entry of partialBundle.code_map) {
    if (!removedNodeIds.has(entry.id)) {
      mergedCodeMap.set(entry.id, entry);
    }
  }

  const mergedBundle: ProjectOpsxBundle = {
    ...result.bundle,
    project: formalBundle.project,
    domains: sortNodes(result.bundle.domains),
    capabilities: sortNodes(result.bundle.capabilities),
    relations: sortRelations(result.bundle.relations),
    code_map: sortCodeMap([...mergedCodeMap.values()]),
  };

  return {
    delta,
    result,
    mergedBundle,
    affectedDomainIds: [...affectedDomainIds].sort(),
    affectedNodeIds: [...affectedNodeIds].sort(),
    preservedNodeIds,
  };
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
    refresh_anchor_commit: null,
    candidate_spec_paths: [],
  };

  const scope: ScopeConfig = {
    mode,
    include: options.scope ?? [],
    exclude: [],
    granularity: 'coarse',
  };

  // Create workspace
  await FileSystemUtils.createDirectory(bsDir);
  await FileSystemUtils.createDirectory(bootstrapPath(projectRoot, BOOTSTRAP_DOMAIN_MAP_DIR));
  await FileSystemUtils.createDirectory(bootstrapPath(projectRoot, BOOTSTRAP_CANDIDATE_DIR));

  // Write files
  await writeYaml(bootstrapPath(projectRoot, BOOTSTRAP_METADATA_FILE), metadata);
  await writeYaml(bootstrapPath(projectRoot, BOOTSTRAP_SCOPE_FILE), scope);

  return metadata;
}

export async function readBootstrapState(projectRoot: string): Promise<BootstrapState> {
  const bsDir = bootstrapPath(projectRoot);

  if (!await FileSystemUtils.directoryExists(bsDir)) {
    throw new Error('No bootstrap workspace found. Run `openspec bootstrap init` first.');
  }

  const fallbackBaselineType = await inferLegacyBaselineType(projectRoot);
  const metaRaw = await readYaml(bootstrapPath(projectRoot, BOOTSTRAP_METADATA_FILE));
  const metadata = parseBootstrapMetadata(metaRaw, fallbackBaselineType);

  let scope: ScopeConfig | null = null;
  try {
    const scopeRaw = await readYaml(bootstrapPath(projectRoot, BOOTSTRAP_SCOPE_FILE));
    scope = parseScopeConfig(scopeRaw);
  } catch { /* scope may not exist yet */ }

  let evidence: EvidenceFile | null = null;
  try {
    const evidenceRaw = await readYaml(bootstrapPath(projectRoot, BOOTSTRAP_EVIDENCE_FILE));
    evidence = EvidenceFileSchema.parse(evidenceRaw);
  } catch { /* evidence may not exist yet */ }

  // Read domain maps
  const domainMaps = new Map<string, DomainMapFile>();
  const invalidDomainMaps = new Map<string, InvalidDomainMap>();
  const mapDir = bootstrapPath(projectRoot, BOOTSTRAP_DOMAIN_MAP_DIR);
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

  const reviewPath = bootstrapPath(projectRoot, BOOTSTRAP_REVIEW_FILE);
  const reviewExists = await FileSystemUtils.fileExists(reviewPath);

  return { metadata, scope, evidence, domainMaps, invalidDomainMaps, reviewExists };
}

export async function advancePhase(projectRoot: string, targetPhase: BootstrapPhase): Promise<void> {
  const metaPath = bootstrapPath(projectRoot, BOOTSTRAP_METADATA_FILE);
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
  await writeYaml(bootstrapPath(projectRoot, BOOTSTRAP_DOMAIN_MAP_DIR, fileName), validated);
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
      const derived = await deriveBootstrapArtifacts(projectRoot, state);
      errors.push(...derived.specErrors);
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

      errors.push(...derived.specErrors);
      errors.push(...await validateCandidateSpecsOnDisk(projectRoot, derived.candidateSpecs));
      errors.push(...await validateFormalSpecTargets(projectRoot, state, derived.candidateSpecs));

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

function assembleBundle(
  state: BootstrapState,
  options: { projectMetadata?: ProjectOpsxBundle['project'] } = {}
): ProjectOpsxBundle {
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
    project: options.projectMetadata ?? buildBootstrapProjectMetadata(state),
    domains: sortNodes(domains),
    capabilities: sortNodes(capabilities),
    relations: sortRelations(relations),
    code_map: sortCodeMap(code_map),
  };
}

function computeSourceFingerprint(projectRoot: string, state: BootstrapState): string | null {
  if (!state.evidence) {
    return null;
  }

  const normalizedDomainMaps = [...state.domainMaps.entries()]
    .sort(([leftId], [rightId]) => leftId.localeCompare(rightId))
    .map(([, mapFile]) => normalizeDomainMapForFingerprint(mapFile));

  return fingerprintValue({
    schema: getConfiguredSchemaName(projectRoot),
    evidence: normalizeEvidenceForFingerprint(state.evidence),
    domainMaps: normalizedDomainMaps,
  });
}

function computeCandidateFingerprint(
  projectRoot: string,
  bundle: ProjectOpsxBundle,
  state: BootstrapState,
  candidateSpecs: BootstrapCandidateSpec[],
  preservedFormalPaths: string[],
  refreshPlan: RefreshPlan | null,
  refreshDelta: RefreshDeltaSummary | null
): string {
  const projectConfig = readProjectConfig(projectRoot);
  return fingerprintValue({
    bundle,
    baseline: state.metadata.baseline_type,
    mode: state.metadata.mode,
    runtimeProjection: {
      candidateSpec: getRuntimeFingerprintInput(
        projectConfigForRuntime(projectConfig, { consumer: 'bootstrap-candidate-spec' })
      ),
      review: getRuntimeFingerprintInput(
        projectConfigForRuntime(projectConfig, { consumer: 'bootstrap-review' })
      ),
      starterReadme: getRuntimeFingerprintInput(
        projectConfigForRuntime(projectConfig, { consumer: 'bootstrap-starter-readme' })
      ),
    },
    refreshPlan,
    refreshDelta: refreshDelta ? {
      delta: refreshDelta.delta,
      counts: refreshDelta.result.counts,
      affectedDomainIds: refreshDelta.affectedDomainIds,
      affectedNodeIds: refreshDelta.affectedNodeIds,
      preservedNodeIds: refreshDelta.preservedNodeIds,
    } : null,
    candidateSpecs: candidateSpecs.map((spec) => ({
      capabilityId: spec.capabilityId,
      candidateRelativePath: spec.candidateRelativePath,
      formalRelativePath: spec.formalRelativePath,
      content: spec.content,
    })),
    preservedFormalPaths,
  });
}

function localizeBootstrapText(
  projection: RuntimeProjection,
  text: { en: string; zh: string }
): string {
  return isChineseDocLanguage(projection.proseLanguage) ? text.zh : text.en;
}

async function writeBootstrapMetadata(projectRoot: string, metadata: BootstrapMetadata): Promise<void> {
  await writeYaml(bootstrapPath(projectRoot, BOOTSTRAP_METADATA_FILE), metadata);
}

async function writeCandidateFiles(
  projectRoot: string,
  state: BootstrapState,
  bundle: ProjectOpsxBundle,
  candidateSpecs: BootstrapCandidateSpec[]
): Promise<string[]> {
  const candidateDir = bootstrapPath(projectRoot, BOOTSTRAP_CANDIDATE_DIR);
  await FileSystemUtils.createDirectory(candidateDir);
  const nextSpecPaths = candidateSpecs.map((spec) => spec.candidateRelativePath).sort();
  const staleSpecPaths = state.metadata.candidate_spec_paths.filter((candidatePath) => !nextSpecPaths.includes(candidatePath));
  await Promise.all(staleSpecPaths.map(async (relativePath) => {
    await fs.rm(FileSystemUtils.joinPath(projectRoot, relativePath), { force: true }).catch(() => undefined);
  }));

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
    writeYaml(candidatePath(projectRoot, BOOTSTRAP_CANDIDATE_FILE_NAMES.project), mainData),
    writeYaml(candidatePath(projectRoot, BOOTSTRAP_CANDIDATE_FILE_NAMES.relations), relData),
    writeYaml(candidatePath(projectRoot, BOOTSTRAP_CANDIDATE_FILE_NAMES.codeMap), mapData),
    ...candidateSpecs.map((spec) => FileSystemUtils.writeFile(candidateSpecPath(projectRoot, spec.folder), spec.content)),
  ]);

  return nextSpecPaths;
}

function buildReviewContent(
  state: BootstrapState,
  derived: DerivedBootstrapArtifacts,
  projection: RuntimeProjection
): string {
  if (!state.evidence) {
    throw new Error('No evidence.yaml found. Run scan phase first.');
  }

  const lines: string[] = ['# Bootstrap Review', ''];
  lines.push(
    localizeBootstrapText(projection, {
      en: 'Review the mapped architecture before promoting to formal OPSX files.',
      zh: '在提升为正式 OPSX 文件之前，先审阅当前映射出的架构。',
    }),
    ''
  );
  lines.push(
    localizeBootstrapText(projection, {
      en: 'This file is derived from evidence.yaml and domain-map/*.yaml. If either changes, regenerate review via `openspec bootstrap validate`.',
      zh: '该文件由 evidence.yaml 和 domain-map/*.yaml 派生；任一内容变化后，都需要重新运行 `openspec bootstrap validate` 生成新的 review。',
    }),
    ''
  );

  if (state.metadata.mode === 'refresh' && derived.refreshPlan && derived.refreshDelta) {
    lines.push('## Refresh Scope', '');
    lines.push(`- ${localizeBootstrapText(projection, {
      en: `Strategy: ${derived.refreshPlan.strategy}`,
      zh: `策略：${derived.refreshPlan.strategy}`,
    })}`);
    lines.push(`- ${localizeBootstrapText(projection, {
      en: `Anchor commit: ${derived.refreshPlan.anchorCommit ?? '(none)'}`,
      zh: `锚点提交：${derived.refreshPlan.anchorCommit ?? '（空）'}`,
    })}`);
    lines.push(`- ${localizeBootstrapText(projection, {
      en: `Reason: ${derived.refreshPlan.reason}`,
      zh: `原因：${derived.refreshPlan.reason}`,
    })}`);
    if (derived.refreshPlan.changedPaths.length > 0) {
      lines.push(`- ${localizeBootstrapText(projection, {
        en: `Changed paths: ${derived.refreshPlan.changedPaths.join(', ')}`,
        zh: `变更路径：${derived.refreshPlan.changedPaths.join(', ')}`,
      })}`);
    }
    lines.push(`- ${localizeBootstrapText(projection, {
      en: `Impacted domains: ${derived.refreshDelta.affectedDomainIds.join(', ') || '(none)'}`,
      zh: `受影响 domains：${derived.refreshDelta.affectedDomainIds.join(', ') || '（空）'}`,
    })}`);
    lines.push(`- ${localizeBootstrapText(projection, {
      en: `Preserved baseline nodes: ${derived.refreshDelta.preservedNodeIds.length}`,
      zh: `保留的基线节点数：${derived.refreshDelta.preservedNodeIds.length}`,
    })}`);
    lines.push('', '## Delta Summary', '');

    const addedNodeCount = derived.refreshDelta.result.counts.added.domains + derived.refreshDelta.result.counts.added.capabilities;
    const modifiedNodeCount = derived.refreshDelta.result.counts.modified.domains + derived.refreshDelta.result.counts.modified.capabilities;
    const removedNodeCount = derived.refreshDelta.result.counts.removed.domains + derived.refreshDelta.result.counts.removed.capabilities;
    lines.push(`- ${localizeBootstrapText(projection, {
      en: `ADDED: ${addedNodeCount} nodes, ${derived.refreshDelta.result.counts.added.relations} relations`,
      zh: `ADDED：${addedNodeCount} 个节点，${derived.refreshDelta.result.counts.added.relations} 条关系`,
    })}`);
    lines.push(`- ${localizeBootstrapText(projection, {
      en: `MODIFIED: ${modifiedNodeCount} nodes, ${derived.refreshDelta.result.counts.modified.relations} relations`,
      zh: `MODIFIED：${modifiedNodeCount} 个节点，${derived.refreshDelta.result.counts.modified.relations} 条关系`,
    })}`);
    lines.push(`- ${localizeBootstrapText(projection, {
      en: `REMOVED: ${removedNodeCount} nodes, ${derived.refreshDelta.result.counts.removed.relations} relations`,
      zh: `REMOVED：${removedNodeCount} 个节点，${derived.refreshDelta.result.counts.removed.relations} 条关系`,
    })}`);
    if (derived.refreshDelta.preservedNodeIds.length > 0) {
      lines.push(`- ${localizeBootstrapText(projection, {
        en: `Preserved baseline nodes: ${derived.refreshDelta.preservedNodeIds.join(', ')}`,
        zh: `保留的基线节点：${derived.refreshDelta.preservedNodeIds.join(', ')}`,
      })}`);
    }
    lines.push('');
  }

  lines.push('## Domain Checklist', '');

  const orderedDomains = [...state.evidence.domains]
    .filter((domain) => state.metadata.mode !== 'refresh' || !derived.refreshDelta || derived.refreshDelta.affectedDomainIds.length === 0 || derived.refreshDelta.affectedDomainIds.includes(domain.id))
    .sort(compareEvidenceDomains);
  for (const dom of orderedDomains) {
    const mapFile = state.domainMaps.get(dom.id);
    const capCount = mapFile?.capabilities.length ?? 0;
    const status = mapFile
      ? localizeBootstrapText(projection, {
        en: `${capCount} capabilities`,
        zh: `${capCount} 个 capability`,
      })
      : localizeBootstrapText(projection, { en: 'unmapped', zh: '未映射' });
    lines.push(`- [ ] ${dom.id} — ${status}, confidence: ${dom.confidence}`);
  }

  lines.push('', '## Candidate Specs', '');
  if (state.metadata.mode === 'opsx-first') {
    lines.push(`- ${localizeBootstrapText(projection, {
      en: 'Mode contract: README-only starter at openspec/specs/README.md',
      zh: '模式约束：只在 openspec/specs/README.md 生成 README 型 starter',
    })}`);
    lines.push(`- ${localizeBootstrapText(projection, {
      en: 'No capability-level candidate specs should be generated',
      zh: '此模式下不应生成 capability 级别的 candidate spec',
    })}`);
  } else if (derived.candidateSpecs.length === 0) {
    lines.push(`- ${localizeBootstrapText(projection, {
      en: 'No candidate specs will be written',
      zh: '当前不会写入 candidate spec',
    })}`);
    if (state.metadata.mode === 'refresh') {
      lines.push(`- ${localizeBootstrapText(projection, {
        en: 'Existing formal specs remain the source of truth unless a new capability requires a missing spec file.',
        zh: '除非新增 capability 缺少 formal spec，否则现有 formal specs 继续作为唯一真相来源。',
      })}`);
    }
  } else {
    for (const spec of derived.candidateSpecs) {
      lines.push(`- ${spec.capabilityId} -> ${spec.formalRelativePath}`);
    }
  }

  for (const preservedPath of derived.preservedFormalPaths) {
    lines.push(`- ${localizeBootstrapText(projection, {
      en: `preserved existing spec: ${preservedPath}`,
      zh: `保留已有 spec：${preservedPath}`,
    })}`);
  }

  lines.push('', '## Validation', '');
  lines.push(`- [ ] ${localizeBootstrapText(projection, {
    en: 'Review matches current candidate output',
    zh: 'Review 内容与当前 candidate 输出一致',
  })}`);
  lines.push(`- [ ] ${localizeBootstrapText(projection, {
    en: 'Referential integrity passes',
    zh: '引用完整性校验通过',
  })}`);
  lines.push(`- [ ] ${localizeBootstrapText(projection, {
    en: 'Code-map paths exist on disk',
    zh: 'Code-map 中的路径都存在于磁盘上',
  })}`);
  lines.push(`- [ ] ${localizeBootstrapText(projection, {
    en: 'Candidate spec set matches the bootstrap mode contract',
    zh: 'Candidate spec 集合符合当前 bootstrap 模式约束',
  })}`);
  if (state.metadata.mode === 'refresh') {
    lines.push(`- [ ] ${localizeBootstrapText(projection, {
      en: 'Refresh delta matches the current formal OPSX baseline',
      zh: 'Refresh delta 与当前 formal OPSX 基线一致',
    })}`);
  }
  lines.push(`- [ ] ${localizeBootstrapText(projection, {
    en: 'Candidate specs pass OpenSpec validation',
    zh: 'Candidate spec 通过 OpenSpec 校验',
  })}`);
  lines.push(`- [ ] ${localizeBootstrapText(projection, {
    en: 'Domain boundaries match mental model',
    zh: 'Domain 边界与预期心智模型一致',
  })}`);
  lines.push('');

  return lines.join('\n');
}

async function deriveBootstrapArtifacts(projectRoot: string, state: BootstrapState): Promise<DerivedBootstrapArtifacts> {
  const reviewContent = state.reviewExists
    ? await fs.readFile(bootstrapPath(projectRoot, BOOTSTRAP_REVIEW_FILE), 'utf-8').catch(() => '')
    : '';
  const { checkedDomains, uncheckedItems } = collectReviewChecks(reviewContent);

  const sourceFingerprint = computeSourceFingerprint(projectRoot, state);
  let bundle: ProjectOpsxBundle | null = null;
  let refreshPlan: RefreshPlan | null = null;
  let refreshDelta: RefreshDeltaSummary | null = null;
  const preSpecErrors: string[] = [];

  if (sourceFingerprint) {
    if (state.metadata.mode === 'refresh') {
      const formalBundle = await readProjectOpsx(projectRoot);
      if (!formalBundle) {
        preSpecErrors.push('Refresh requires existing formal OPSX files.');
      } else {
        refreshPlan = await deriveRefreshPlan(projectRoot, state, formalBundle);
        const partialBundle = assembleBundle(state, { projectMetadata: formalBundle.project });
        refreshDelta = assembleRefreshDelta(formalBundle, partialBundle, refreshPlan);
        bundle = refreshDelta.mergedBundle;
      }
    } else {
      bundle = assembleBundle(state);
    }
  }

  const addedCapabilityIds = new Set(refreshDelta?.delta.ADDED?.capabilities?.map((capability) => capability.id) ?? []);
  const candidateSpecAssembly = await assembleCandidateSpecs(projectRoot, state, bundle, { addedCapabilityIds });
  const specErrors = [
    ...preSpecErrors,
    ...candidateSpecAssembly.sourceErrors,
    ...candidateSpecAssembly.validationErrors,
  ];
  const candidateFingerprint = bundle && specErrors.length === 0
    ? computeCandidateFingerprint(
        projectRoot,
        bundle,
        state,
        candidateSpecAssembly.specs,
        candidateSpecAssembly.preservedFormalPaths,
        refreshPlan,
        refreshDelta
      )
    : null;
  const candidateExists = candidateFingerprint
    ? await candidateFilesExist(projectRoot, candidateSpecAssembly.specs)
    : false;

  let candidateState: 'missing' | 'current' | 'stale' = 'missing';
  if (candidateFingerprint) {
    if (!candidateExists) {
      candidateState = state.metadata.candidate_fingerprint ? 'stale' : 'missing';
    } else {
      candidateState = state.metadata.source_fingerprint === sourceFingerprint
        && state.metadata.candidate_fingerprint === candidateFingerprint
        ? 'current'
        : 'stale';
    }
  }

  let reviewState: 'missing' | 'current' | 'stale' = 'missing';
  if (candidateFingerprint) {
    if (!candidateExists) {
      reviewState = state.metadata.review_fingerprint || state.metadata.candidate_fingerprint ? 'stale' : 'missing';
    } else if (!state.reviewExists) {
      reviewState = state.metadata.review_fingerprint ? 'stale' : 'missing';
    } else {
      reviewState = state.metadata.source_fingerprint === sourceFingerprint
        && state.metadata.review_fingerprint === candidateFingerprint
        ? 'current'
        : 'stale';
    }
  }

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
    candidateSpecs: candidateSpecAssembly.specs,
    preservedFormalPaths: candidateSpecAssembly.preservedFormalPaths,
    specErrors,
    sourceFingerprint,
    candidateFingerprint,
    candidateState,
    reviewState,
    reviewApproved: reviewState === 'current' && uncheckedItems.length === 0,
    checkedDomains,
    refreshPlan,
    refreshDelta,
  };
}

export async function assembleCandidate(projectRoot: string): Promise<ProjectOpsxBundle> {
  const state = await readBootstrapState(projectRoot);
  const derived = await deriveBootstrapArtifacts(projectRoot, state);
  if (!derived.bundle || !derived.sourceFingerprint || !derived.candidateFingerprint) {
    throw new Error('No evidence.yaml found. Run scan phase first.');
  }

  const candidateSpecPaths = await writeCandidateFiles(projectRoot, state, derived.bundle, derived.candidateSpecs);
  await writeBootstrapMetadata(projectRoot, {
    ...state.metadata,
    source_fingerprint: derived.sourceFingerprint,
    candidate_fingerprint: derived.candidateFingerprint,
    candidate_spec_paths: candidateSpecPaths,
  });

  return derived.bundle;
}

export async function generateReview(projectRoot: string): Promise<string> {
  const state = await readBootstrapState(projectRoot);
  const derived = await deriveBootstrapArtifacts(projectRoot, state);
  if (!derived.candidateFingerprint) {
    throw new Error('No evidence.yaml found. Run scan phase first.');
  }

  const content = buildReviewContent(
    state,
    derived,
    projectConfigForRuntime(readProjectConfig(projectRoot), { consumer: 'bootstrap-review' })
  );
  await fs.writeFile(bootstrapPath(projectRoot, BOOTSTRAP_REVIEW_FILE), content, 'utf-8');
  await writeBootstrapMetadata(projectRoot, {
    ...state.metadata,
    source_fingerprint: derived.sourceFingerprint,
    candidate_fingerprint: derived.candidateFingerprint,
    review_fingerprint: derived.candidateFingerprint,
    candidate_spec_paths: state.metadata.candidate_spec_paths,
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
    state.metadata.candidate_spec_paths = await writeCandidateFiles(projectRoot, state, derived.bundle, derived.candidateSpecs);
  }

  if (reviewUpdated) {
    await fs.writeFile(
      bootstrapPath(projectRoot, BOOTSTRAP_REVIEW_FILE),
      buildReviewContent(
        state,
        derived,
        projectConfigForRuntime(readProjectConfig(projectRoot), { consumer: 'bootstrap-review' })
      ),
      'utf-8'
    );
  }

  if (candidateUpdated || reviewUpdated) {
    await writeBootstrapMetadata(projectRoot, {
      ...state.metadata,
      source_fingerprint: derived.sourceFingerprint,
      candidate_fingerprint: derived.candidateFingerprint,
      review_fingerprint: reviewUpdated ? derived.candidateFingerprint : state.metadata.review_fingerprint,
      candidate_spec_paths: state.metadata.candidate_spec_paths,
    });
  }

  return { candidateUpdated, reviewUpdated };
}

async function writeBootstrapSpecStarter(projectRoot: string, state: BootstrapState): Promise<void> {
  if (state.metadata.mode !== 'opsx-first') {
    return;
  }

  if (state.metadata.baseline_type !== 'raw') {
    return;
  }

  const specsReadmePath = FileSystemUtils.joinPath(projectRoot, 'openspec/specs/README.md');
  if (await FileSystemUtils.fileExists(specsReadmePath)) {
    return;
  }

  const projection = projectConfigForRuntime(readProjectConfig(projectRoot), {
    consumer: 'bootstrap-starter-readme',
  });
  const content = `# Specs Starter

${localizeBootstrapText(projection, {
  en: 'This repository was bootstrapped in `opsx-first` mode.',
  zh: '该仓库通过 `opsx-first` 模式完成了 bootstrap。',
})}

- ${localizeBootstrapText(projection, {
  en: 'Formal OPSX files were generated from the bootstrap workflow.',
  zh: '正式 OPSX 文件已经由 bootstrap 工作流生成。',
})}
- ${localizeBootstrapText(projection, {
  en: 'Add behavior specs incrementally with normal OpenSpec changes.',
  zh: '后续请通过常规 OpenSpec change 渐进补充行为规约。',
})}
- ${localizeBootstrapText(projection, {
  en: 'Create focused specs under `openspec/specs/<capability>/spec.md` as features evolve.',
  zh: '随着功能演进，在 `openspec/specs/<capability>/spec.md` 下补充聚焦的 spec。',
})}
`;

  await FileSystemUtils.writeFile(specsReadmePath, content);
}

export async function promoteBootstrap(projectRoot: string): Promise<PromoteBootstrapResult> {
  await refreshBootstrapDerivedArtifacts(projectRoot);

  const gate = await validateGate(projectRoot, 'review_to_promote');
  if (!gate.passed) {
    throw new Error(`Cannot promote: gate validation failed.\n${gate.errors.join('\n')}`);
  }

  const state = await readBootstrapState(projectRoot);
  const derived = await deriveBootstrapArtifacts(projectRoot, state);
  if (!derived.bundle || !derived.candidateFingerprint) {
    throw new Error('Cannot promote: candidate artifacts are unavailable. Run `openspec bootstrap validate` first.');
  }

  const targetErrors = await validateFormalSpecTargets(projectRoot, state, derived.candidateSpecs);
  if (targetErrors.length > 0) {
    throw new Error(`Cannot promote: gate validation failed.\n${targetErrors.join('\n')}`);
  }

  const originalBundle = state.metadata.mode === 'refresh' ? await readProjectOpsx(projectRoot) : null;
  const writtenSpecPaths: Array<{ path: string; original: string | null }> = [];
  try {
    if (state.metadata.mode === 'refresh') {
      await writeProjectOpsx(projectRoot, derived.bundle);
    } else {
      await copyFile(candidatePath(projectRoot, BOOTSTRAP_CANDIDATE_FILE_NAMES.project), FileSystemUtils.joinPath(projectRoot, OPSX_PATHS.PROJECT_FILE));
      await copyFile(candidatePath(projectRoot, BOOTSTRAP_CANDIDATE_FILE_NAMES.relations), FileSystemUtils.joinPath(projectRoot, OPSX_PATHS.RELATIONS_FILE));
      await copyFile(candidatePath(projectRoot, BOOTSTRAP_CANDIDATE_FILE_NAMES.codeMap), FileSystemUtils.joinPath(projectRoot, OPSX_PATHS.CODE_MAP_FILE));
    }

    for (const spec of derived.candidateSpecs) {
      const targetPath = formalSpecPath(projectRoot, spec.folder);
      let original: string | null = null;
      try {
        original = await fs.readFile(targetPath, 'utf-8');
      } catch (error: any) {
        if (error?.code !== 'ENOENT') {
          throw error;
        }
      }
      writtenSpecPaths.push({ path: targetPath, original });
      await copyFile(candidateSpecPath(projectRoot, spec.folder), targetPath);
    }

    await writeBootstrapSpecStarter(projectRoot, state);
  } catch (error) {
    if (state.metadata.mode === 'refresh' && originalBundle) {
      await writeProjectOpsx(projectRoot, originalBundle).catch(() => undefined);
    }
    for (const write of writtenSpecPaths.reverse()) {
      if (write.original === null) {
        await fs.rm(write.path, { force: true }).catch(() => undefined);
      } else {
        await FileSystemUtils.writeFile(write.path, write.original).catch(() => undefined);
      }
    }
    throw error;
  }

  if (state.metadata.mode === 'refresh') {
    await writeBootstrapMetadata(projectRoot, {
      ...state.metadata,
      refresh_anchor_commit: await resolveCurrentGitHead(projectRoot),
    });
  }

  return {
    retainedWorkspaceNotice: BOOTSTRAP_WORKSPACE_RETAINED_NOTICE,
  };
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
