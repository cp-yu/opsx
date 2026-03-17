# Design: Project OPSX Integration

## Architecture Overview

### Layered Approach

```
┌─────────────────────────────────────────────────────────────┐
│ Workflow Templates (Agent-Driven)                           │
│ - propose.ts, sync-specs.ts, verify-change.ts, etc.        │
│ - AI generates opsx-delta, executes merges                  │
└─────────────────────────────────────────────────────────────┘
                            ↓ uses
┌─────────────────────────────────────────────────────────────┐
│ OPSX Utils (Programmatic)                                   │
│ - src/utils/opsx-utils.ts                                   │
│ - YAML parse/serialize, validation, atomic writes           │
└─────────────────────────────────────────────────────────────┘
                            ↓ operates on
┌─────────────────────────────────────────────────────────────┐
│ OPSX Files                                                   │
│ - openspec/project.opsx.yaml (or sharded)                   │
│ - openspec/changes/<name>/opsx-delta.yaml                   │
└─────────────────────────────────────────────────────────────┘
```

### Responsibility Split

**Agent-Driven (AI in Templates)**:
- 从 proposal/spec delta 推导 opsx-delta 内容
- 执行 opsx-delta → project.opsx.yaml 合并
- Bootstrap 初始 OPSX 图生成
- 语义级验证和对齐分析

**Programmatic (opsx-utils.ts)**:
- YAML 结构解析和序列化
- Zod schema 校验
- Referential integrity 检查
- spec_refs 路径存在性校验
- 原子写入（临时文件 + rename）
- 分片逻辑（读取/写入）

## Data Structures

### Zod Schemas

```typescript
// Node types (7 types)
const OpsxNodeSchema = z.object({
  id: z.string().regex(/^(cap|dom|inv|ifc|dec|rel|evd)\./),
  type: z.enum(['capability', 'domain', 'invariant', 'interface', 'decision', 'relation', 'evidence']),
  // ... type-specific fields
});

// Relation
const OpsxRelationSchema = z.object({
  from: z.string(),
  type: z.enum(['contains', 'depends_on', 'constrains', 'implemented_by', 'verified_by', 'relates_to']),
  to: z.string(),
});

// opsx-delta structure
const OpsxDeltaSchema = z.object({
  ADDED: z.object({
    capabilities: z.array(OpsxNodeSchema).optional(),
    domains: z.array(OpsxNodeSchema).optional(),
    // ... other node types
    relations: z.array(OpsxRelationSchema).optional(),
  }).optional(),
  MODIFIED: z.object({
    capabilities: z.array(OpsxNodeSchema).optional(),
    // ... (same structure as ADDED)
  }).optional(),
  REMOVED: z.object({
    node_ids: z.array(z.string()).optional(),
    relation_ids: z.array(z.string()).optional(),
  }).optional(),
});

// Full project.opsx.yaml
const ProjectOpsxSchema = z.object({
  project: z.object({
    name: z.string(),
    version: z.string(),
    // ...
  }),
  domains: z.array(OpsxNodeSchema).optional(),
  capabilities: z.array(OpsxNodeSchema).optional(),
  // ... other collections
  relations: z.array(OpsxRelationSchema).optional(),
});
```

### File Layout

**Single File Mode** (< max_lines):
```
openspec/project.opsx.yaml
```

**Sharded Mode** (≥ max_lines):
```
openspec/project.opsx/
  _meta.yaml          # project metadata + shard manifest
  domain-core.yaml    # domain "core" nodes
  domain-api.yaml     # domain "api" nodes
  relations.yaml      # all relations
```

## Component Design

### 1. opsx-utils.ts

#### Path Constants
```typescript
export const OPSX_PATHS = {
  SINGLE_FILE: 'openspec/project.opsx.yaml',
  SHARDED_DIR: 'openspec/project.opsx',
  SHARDED_META: 'openspec/project.opsx/_meta.yaml',
  DELTA_TEMPLATE: 'openspec/changes/{name}/opsx-delta.yaml',
} as const;
```

#### Core Functions
```typescript
// Read project.opsx.yaml (handles sharding transparently)
export async function readProjectOpsx(projectRoot: string): Promise<ProjectOpsx | null>

// Write project.opsx.yaml atomically (auto-shard if needed)
export async function writeProjectOpsx(projectRoot: string, data: ProjectOpsx, maxLines: number): Promise<void>

// Validate referential integrity
export function validateReferentialIntegrity(data: ProjectOpsx): ValidationResult

// Validate spec_refs existence
export async function validateSpecRefs(projectRoot: string, data: ProjectOpsx): Promise<ValidationResult>

// Merge opsx-delta into project.opsx.yaml (programmatic validation only)
export async function mergeOpsxDelta(base: ProjectOpsx, delta: OpsxDelta): Promise<ProjectOpsx>
```

#### Atomic Write Implementation
```typescript
async function writeProjectOpsx(projectRoot: string, data: ProjectOpsx, maxLines: number) {
  const lines = estimateLines(data);

  if (lines <= maxLines) {
    // Single file mode
    const tempPath = `${OPSX_PATHS.SINGLE_FILE}.tmp`;
    await fs.writeFile(tempPath, serializeYaml(data));
    await fs.rename(tempPath, OPSX_PATHS.SINGLE_FILE);
  } else {
    // Sharded mode
    const shards = shardByDomain(data, maxLines);
    const tempDir = `${OPSX_PATHS.SHARDED_DIR}.tmp`;
    await fs.mkdir(tempDir, { recursive: true });

    // Write all shards to temp dir
    for (const [name, content] of Object.entries(shards)) {
      await fs.writeFile(path.join(tempDir, name), serializeYaml(content));
    }

    // Atomic swap
    await fs.rename(OPSX_PATHS.SHARDED_DIR, `${OPSX_PATHS.SHARDED_DIR}.old`);
    await fs.rename(tempDir, OPSX_PATHS.SHARDED_DIR);
    await fs.rm(`${OPSX_PATHS.SHARDED_DIR}.old`, { recursive: true });
  }
}
```

#### Sharding Strategy
```typescript
function shardByDomain(data: ProjectOpsx, maxLines: number): Record<string, any> {
  const shards: Record<string, any> = {
    '_meta.yaml': {
      project: data.project,
      shard_manifest: [],
    },
  };

  // Group capabilities by domain
  const domainGroups = groupBy(data.capabilities, cap => extractDomain(cap.id));

  for (const [domain, caps] of Object.entries(domainGroups)) {
    const shardName = `domain-${domain}.yaml`;
    shards[shardName] = {
      capabilities: caps,
      // Include related invariants, interfaces, etc.
    };
    shards['_meta.yaml'].shard_manifest.push(shardName);
  }

  // Relations in separate shard
  shards['relations.yaml'] = { relations: data.relations };

  return shards;
}
```

### 2. Workflow Template Modifications

#### Shared OPSX Instruction Fragment
```typescript
// Extract common OPSX instructions to avoid duplication
export const OPSX_SHARED_INSTRUCTIONS = `
## OPSX File Paths
- Truth file: openspec/project.opsx.yaml (or openspec/project.opsx/ if sharded)
- Delta file: openspec/changes/<name>/opsx-delta.yaml

## OPSX Node Types
- capability (cap.*): User-facing features
- domain (dom.*): Architectural boundaries
- invariant (inv.*): System constraints
- interface (ifc.*): API contracts
- decision (dec.*): Architectural decisions
- relation (rel.*): Typed edges
- evidence (evd.*): Verification artifacts

## OPSX Delta Format
\`\`\`yaml
ADDED:
  capabilities:
    - id: cap.new-feature
      intent: "..."
      spec_refs: [...]
  relations:
    - from: cap.new-feature
      type: depends_on
      to: cap.existing

MODIFIED:
  capabilities:
    - id: cap.existing
      intent: "Updated intent"

REMOVED:
  node_ids: [cap.deprecated]
  relation_ids: [rel.old-dependency]
\`\`\`

## Validation Requirements
- All relation.from/to must reference existing nodes
- spec_refs paths must exist
- Node IDs must be unique within type
- Relation types must match allowed domain/range
`;
```

#### propose.ts Modification
```typescript
// After Step 4 (specs artifact created), add:
`
## Step 5: Generate opsx-delta

1. Read proposal.md to extract capabilities list
2. Read all delta specs in specs/*/spec.md
3. Read current openspec/project.opsx.yaml (if exists)
4. Generate opsx-delta.yaml:
   - ADDED: new capabilities/domains/invariants/interfaces/decisions/relations
   - MODIFIED: changed capability intent/status/spec_refs
   - REMOVED: deprecated nodes
5. Validate using programmatic checks (will be called automatically)
6. Write to openspec/changes/<name>/opsx-delta.yaml

${OPSX_SHARED_INSTRUCTIONS}
`
```

#### sync-specs.ts Modification
```typescript
// After spec delta merge, add:
`
## Step N: Merge opsx-delta

1. Check if openspec/changes/<name>/opsx-delta.yaml exists
2. If not exists, skip (backward compatibility)
3. Read current openspec/project.opsx.yaml (or all shards)
4. Read opsx-delta.yaml
5. Execute merge:
   - ADDED: append new nodes, append new relations
   - MODIFIED: update existing nodes (by id)
   - REMOVED: delete nodes + cascade delete incident relations
6. Programmatic validation will run automatically:
   - Referential integrity
   - spec_refs existence
   - Structure validation
7. If validation passes, atomic write (auto-shard if > max_lines)
8. If validation fails, abort with zero side effects

${OPSX_SHARED_INSTRUCTIONS}
`
```

#### verify-change.ts Modification
```typescript
// Add new verification dimension:
`
## OPSX Alignment Verification

1. Check spec_refs bidirectional alignment:
   - Every capability.spec_refs.path must exist in openspec/specs/
   - Every spec file in openspec/specs/ must be referenced by some capability
   - Report orphan specs or dangling spec_refs

2. Check opsx-delta ↔ spec delta consistency:
   - If spec delta adds capability spec, opsx-delta must add corresponding capability node
   - If spec delta removes capability spec, opsx-delta must remove capability node

3. Check project.opsx.yaml structural integrity:
   - All relations reference existing nodes
   - No duplicate node IDs within type
   - Relation types match allowed domain/range

4. Report findings with actionable fix instructions

${OPSX_SHARED_INSTRUCTIONS}
`
```

#### apply-change.ts Modification
```typescript
// Insert at beginning:
`
## OPSX Context Loading Protocol

Before implementing changes, load OPSX context hierarchically:

1. **L0 - Project Metadata**: Read openspec/project.opsx.yaml (project section)
2. **L1 - Domain Boundaries**: Read relevant domains to understand scope
3. **L2 - Capabilities**: Read capabilities related to this change
4. **L3 - Constraints**: Read invariants/interfaces that constrain implementation
5. **L4 - Code Location**: Use code_refs to locate implementation files

This reduces blind code searching and ensures alignment with architecture.

${OPSX_SHARED_INSTRUCTIONS}
`
```

#### explore.ts Modification
```typescript
// Insert OPSX-first navigation guidance:
`
## OPSX-First Navigation

When exploring the codebase:

1. Start with openspec/project.opsx.yaml to understand domains
2. Identify relevant capabilities for the exploration goal
3. Use code_refs to locate implementation files
4. Use relations to understand dependencies
5. Only fall back to grep/find if OPSX doesn't provide guidance

${OPSX_SHARED_INSTRUCTIONS}
`
```

#### bootstrap-opsx.ts (New Workflow)
```typescript
export const bootstrapOpsxTemplate = `
# Bootstrap OPSX Workflow

Generate initial project.opsx.yaml from existing specs and code.

## Process

### Checkpoint 1: Scan Specs
1. Scan openspec/specs/ directory
2. Extract capabilities from spec files
3. Infer domains from directory structure
4. Generate [DRAFT] capability nodes with spec_refs
5. **STOP - User Review**: Review extracted capabilities

### Checkpoint 2: Analyze Code
1. Scan codebase for major modules/packages
2. Infer interfaces from public APIs
3. Generate [DRAFT] interface nodes
4. **STOP - User Review**: Review inferred interfaces

### Checkpoint 3: Generate Relations
1. Infer contains relations (domain → capability)
2. Infer depends_on relations (capability → capability)
3. Generate [DRAFT] relation edges
4. **STOP - User Review**: Review relations

### Final Output
1. Combine all sections into project.opsx.yaml
2. Mark entire file with [DRAFT] header
3. Provide review checklist:
   - [ ] All capabilities have correct intent
   - [ ] Domains accurately reflect architecture
   - [ ] Relations capture key dependencies
   - [ ] spec_refs point to correct files

${OPSX_SHARED_INSTRUCTIONS}

## Output Format

Match greenfield project.opsx.yaml structure:
- project metadata (name, version, description)
- domains array
- capabilities array
- invariants array (initially empty)
- interfaces array
- decisions array (initially empty)
- relations array
- evidence array (initially empty)
`;
```

### 3. Validation Pipeline

#### Referential Integrity Check
```typescript
function validateReferentialIntegrity(data: ProjectOpsx): ValidationResult {
  const errors: string[] = [];
  const nodeIds = new Set<string>();

  // Collect all node IDs
  for (const collection of ['domains', 'capabilities', 'invariants', 'interfaces', 'decisions', 'evidence']) {
    for (const node of data[collection] || []) {
      if (nodeIds.has(node.id)) {
        errors.push(`Duplicate node ID: ${node.id}`);
      }
      nodeIds.add(node.id);
    }
  }

  // Check all relations
  for (const rel of data.relations || []) {
    if (!nodeIds.has(rel.from)) {
      errors.push(`Dangling relation: ${rel.from} (from) does not exist`);
    }
    if (!nodeIds.has(rel.to)) {
      errors.push(`Dangling relation: ${rel.to} (to) does not exist`);
    }

    // Check relation type constraints
    if (!isValidRelationType(rel.type, rel.from, rel.to, data)) {
      errors.push(`Invalid relation type: ${rel.type} from ${rel.from} to ${rel.to}`);
    }
  }

  return { valid: errors.length === 0, errors };
}
```

#### spec_refs Validation
```typescript
async function validateSpecRefs(projectRoot: string, data: ProjectOpsx): Promise<ValidationResult> {
  const errors: string[] = [];
  const referencedSpecs = new Set<string>();

  // Check all capability spec_refs
  for (const cap of data.capabilities || []) {
    for (const specRef of cap.spec_refs || []) {
      const fullPath = path.join(projectRoot, specRef.path);
      if (!await FileSystemUtils.fileExists(fullPath)) {
        errors.push(`spec_refs path does not exist: ${specRef.path} (capability: ${cap.id})`);
      }
      referencedSpecs.add(specRef.path);
    }
  }

  // Check for orphan specs
  const allSpecs = await glob('openspec/specs/**/*.md', { cwd: projectRoot });
  for (const spec of allSpecs) {
    if (!referencedSpecs.has(spec)) {
      errors.push(`Orphan spec file (not referenced by any capability): ${spec}`);
    }
  }

  return { valid: errors.length === 0, errors };
}
```

## PBT Properties Implementation

### Test Structure
```typescript
describe('OPSX PBT Properties', () => {
  describe('YAML Structure Preservation', () => {
    test('yaml-structure-01: Top-level model structure invariant', () => {
      fc.assert(fc.property(
        arbitraryProjectOpsx(),
        arbitraryOpsxDelta(),
        (base, delta) => {
          const merged = mergeOpsxDelta(base, delta);
          expect(merged).toHaveProperty('project');
          expect(merged).toHaveProperty('domains');
          // ... check all expected top-level keys
        }
      ));
    });

    // ... 20 more property tests
  });
});
```

### Arbitraries (for Property-Based Testing)
```typescript
const arbitraryNodeId = fc.oneof(
  fc.string().map(s => `cap.${s}`),
  fc.string().map(s => `dom.${s}`),
  // ... other prefixes
);

const arbitraryOpsxNode = fc.record({
  id: arbitraryNodeId,
  type: fc.constantFrom('capability', 'domain', 'invariant', 'interface', 'decision', 'evidence'),
  // ... type-specific fields
});

const arbitraryProjectOpsx = fc.record({
  project: fc.record({ name: fc.string(), version: fc.string() }),
  domains: fc.array(arbitraryOpsxNode),
  capabilities: fc.array(arbitraryOpsxNode),
  // ...
  relations: fc.array(arbitraryOpsxRelation),
});
```

## Migration Strategy

### Phase 1: Infrastructure (Week 1)
- Create opsx-utils.ts with core functions
- Define Zod schemas
- Implement atomic write + sharding
- Unit tests for utils

### Phase 2: Workflow Integration (Week 2)
- Modify propose/ff-change (opsx-delta generation)
- Modify sync-specs (opsx-delta merging)
- Modify verify-change (OPSX alignment)
- Integration tests

### Phase 3: Advanced Workflows (Week 3)
- Modify apply/explore (OPSX context loading)
- Modify archive workflows (OPSX awareness)
- Create bootstrap-opsx workflow
- End-to-end tests

### Phase 4: Testing & Documentation (Week 4)
- Implement 21 PBT properties
- Write user documentation
- Create migration guide
- Performance benchmarks

## Risk Mitigation

### Risk: AI-generated opsx-delta quality
**Mitigation**: Strict ADDED/MODIFIED/REMOVED format + programmatic validation catches structural errors

### Risk: Large file LLM truncation
**Mitigation**: Automatic sharding + shard-aware reading in templates

### Risk: Concurrent modifications
**Mitigation**: Document manual conflict resolution workflow + fingerprint checks

### Risk: Backward compatibility
**Mitigation**: All opsx-delta processing includes "if not exists, skip" guards

## Performance Targets

- YAML parse (1000 lines): < 10ms
- Referential integrity check (100 nodes, 50 relations): < 50ms
- Atomic write (single file): < 20ms
- Atomic write (sharded, 5 files): < 100ms
- Full validation pipeline: < 200ms

## Success Criteria

- [ ] All 9 workflow templates integrated
- [ ] 21 PBT properties pass
- [ ] Bootstrap workflow functional
- [ ] Performance targets met
- [ ] Documentation complete
- [ ] Zero regressions in existing workflows
