# Proposal: Refactor OPSX Schema — Split Files + Fix Drift

## Problem

`project.opsx.yaml` 存在三个结构性问题：

1. **Schema 漂移**：Zod schema（`opsx-utils.ts`）与实际 YAML 不一致，`readProjectOpsx()` 对仓库自身文件返回 `null`
2. **职责混杂**：1000 行单文件混合了拓扑、索引、约束、关系图
3. **冗余字段**：`code_refs`/`spec_refs` 嵌入节点，与 `openspec/specs/` 目录和代码实际位置重复

## Solution

### 1. 三文件固定布局（替代分片机制）

```
openspec/
├── project.opsx.yaml              # 项目元数据 + 领域 + 能力（无 code_refs/spec_refs）
├── project.opsx.relations.yaml    # 关系图（机器可解析）
└── project.opsx.code-map.yaml     # 自动生成的代码映射（按 node id 索引）
```

### 2. Schema 对齐

| 字段 | 旧 Schema | 新 Schema |
|------|-----------|-----------|
| `project` | `name/version/description` | `id/name/intent/scope/roots` |
| `status` | `draft\|active\|deprecated` | `draft\|active` |
| `progress` | 不存在 | `{ phase: implementing\|verifying }` |
| `code_refs` | `{ path, line }` 嵌入节点 | 独立文件，`{ path, line_start, line_end }` |
| `REMOVED` | `node_ids/relation_ids` | `domains/capabilities/relations` 数组 |
| `schema_version` | 不存在 | 顶层整数，起步 `1` |

### 3. Invariants 分类

- 保留（机器可验证）：`delta-isolation`, `schema-priority`, `idempotent-merge`, `atomic-opsx-write`, `opsx-referential-integrity`
- 迁移至 CLAUDE.md：`cross-platform-paths`, `spec-bdd-format`

## Benefits

- `readProjectOpsx()` 能正确读取仓库自身文件
- 关系图可独立查询，无需加载全量架构
- code-map 自动生成，消除手动维护负担
- 消除分片复杂度（固定三文件 vs 动态分片）

## Risks

- 迁移窗口内需兼容旧格式（`implemented` → `active` 归一化）
- 模板文案需同步更新（7 个 fragment + 10+ 个 workflow）
- 10+ 个测试文件的 fixture 需重写

## Rollback Plan

保留旧格式 fallback 读取能力，迁移完成后再删除。
