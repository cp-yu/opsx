# Design: Refactor OPSX Schema

## Architecture

### File Layout (New)

```
openspec/
├── project.opsx.yaml              # schema_version + project + domains + capabilities
├── project.opsx.relations.yaml    # schema_version + relations[]
└── project.opsx.code-map.yaml     # schema_version + generated_at + nodes[{id, refs}]
```

分片机制（`project.opsx/` 目录 + `_meta.yaml`）完全移除。

### Schema Layer (opsx-utils.ts)

```
┌─────────────────────────────────────────────────┐
│ Disk File Schemas (3 个独立 schema)              │
│  ProjectOpsxFileSchema                          │
│  ProjectOpsxRelationsFileSchema                 │
│  ProjectOpsxCodeMapFileSchema                   │
├─────────────────────────────────────────────────┤
│ Runtime Bundle Type                              │
│  ProjectOpsxBundle = {                          │
│    project, domains, capabilities,              │
│    relations, code_map                          │
│  }                                              │
├─────────────────────────────────────────────────┤
│ Legacy Normalizer (迁移窗口)                     │
│  normalizeFromLegacy() → ProjectOpsxBundle      │
│  - implemented → active                         │
│  - extract embedded code_refs → code_map        │
│  - strip spec_refs                              │
│  - add schema_version: 1                        │
└─────────────────────────────────────────────────┘
```

### Read Path

```
readProjectOpsx(projectRoot)
  ├── readProjectOpsxFile()      → 主文件 (必须存在，否则 null)
  ├── readProjectOpsxRelations() → relations (不存在 → [])
  ├── readProjectOpsxCodeMap()   → code_map (不存在 → [])
  └── 组装 ProjectOpsxBundle
       └── 如果主文件缺 schema_version → 走 legacy normalizer
```

### Write Path

```
writeProjectOpsx(projectRoot, bundle)
  ├── 拆分 bundle → 3 个文件内容
  ├── 写 project.opsx.yaml.tmp
  ├── 写 project.opsx.relations.yaml.tmp
  ├── 写 project.opsx.code-map.yaml.tmp
  └── 全部成功 → 3 个 atomic rename
       └── 任一失败 → 清理所有 .tmp
```

### Validation

```
validateReferentialIntegrity(bundle)
  ├── 收集 node IDs: domains + capabilities
  ├── 校验 relations: from/to 必须在 node IDs 中
  └── 校验 code_map: id 必须在 node IDs 中

validateCodeMapIntegrity(bundle)  [新增]
  └── code_map 每个 entry.id 必须存在于 domains/capabilities

validateSpecRefs()  [删除]
  └── specs/ 目录是真相源，OPSX 不再携带 spec_refs
```

### Delta Schema

```yaml
# opsx-delta.yaml (新格式)
schema_version: 1
ADDED:
  domains: [...]
  capabilities: [...]    # 无 code_refs/spec_refs
  relations: [...]
MODIFIED:
  domains: [...]
  capabilities: [...]
  relations: [...]
REMOVED:
  domains: [{ id: dom.old }]
  capabilities: [{ id: cap.old }]
  relations: [{ from: x, to: y, type: z }]
```

### Template Navigation Pattern

旧模式：`domains → capabilities → code_refs`（嵌入式）
新模式：`domains → capabilities`（结构） + `code-map`（代码定位） + `specs/`（行为文档）

模板在渲染前通过 `readProjectOpsx()` 获取 bundle，按需查询 code_map。

## PBT Properties

| Property | Category | Falsification |
|----------|----------|---------------|
| `schema_version_required` | Invariant | 生成无 schema_version 的文件 → writer 必须拒绝 |
| `status_enum_active_only` | Bounds | 生成 `deprecated`/`implemented` → schema 必须拒绝 |
| `atomic_three_file_write` | Invariant | 写入中断 → 无 .tmp 残留 |
| `write_read_round_trip` | Round-trip | 任意 bundle → write → read → 结构相同 |
| `idempotent_rewrite` | Idempotency | write(bundle) × 2 → 文件内容相同 |
| `referential_integrity` | Invariant | relations 引用不存在的 node → 校验失败 |
| `code_map_targets_existing_nodes` | Invariant | code_map id 不在 nodes 中 → 校验失败 |
| `missing_companion_defaults_empty` | Invariant | 删除 relations/code-map 文件 → 读取返回空数组 |
| `legacy_normalization_lossless` | Round-trip | 旧格式 → normalize → 新格式 → 无信息丢失 |
| `fixed_layout_independent_of_size` | Invariant | 任意数据量 → 始终 3 个文件，不触发分片 |
| `posix_path_normalization` | Invariant | Windows 路径 → code-map 中始终 `/` |

## Commit Strategy

4 个 patch，每个可独立回归：

1. `refactor(opsx): align schema + rewrite IO` — opsx-utils.ts
2. `test(opsx): update fixtures and PBT for new schema` — 所有测试文件
3. `refactor(opsx): update templates and CLAUDE.md` — fragments + workflows + docs
4. `chore(opsx): migrate repo YAML to three-file layout` — 实际文件迁移
