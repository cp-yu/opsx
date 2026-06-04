## Context

当前 87 个 specs 累积在 `openspec/specs/` 下，与 OPSX capability 之间没有结构化映射。Workflow 模板（propose/apply/sweep）依赖 LLM 猜测关联，导致漏改和冗余。现有 `requirement-blocks.ts` 解析从 `## Requirements` 开始，不感知文件头部。项目已有 `yaml` (v2.8.2) 依赖。

## Goals / Non-Goals

**Goals**:
- 建立 spec→cap 的确定性映射（YAML frontmatter）
- 提供运行时 cap↔spec 双向查询能力（Spec Registry）
- 让 propose/apply/sweep 能基于 registry 发现关联 specs
- 通过 validation warning 驱动渐进式 frontmatter 迁移

**Non-Goals**:
- 不批量为现有 87 个 spec 补全 frontmatter（属于 change 2: bootstrap-backfill-specs）
- 不实现 spec 归档/淘汰机制
- 不实现跨 spec 冗余/冲突 LLM 检测
- 不持久化 registry 为独立文件

## Decisions

### D1: Frontmatter 格式——最小化只声明 capabilities

```yaml
---
capabilities:
  - cap.cli.archive
  - cap.change-workflow.archive
---
# CLI Archive Command Specification
```

**替代方案**: 增加 `status: active|deprecated` 字段。**否决理由**: spec 的活跃/归档状态通过文件位置判断（`specs/` vs `specs/archived/`），不需要冗余字段。

### D2: Frontmatter Parser 独立于 Requirement Parser

新建 `src/core/parsers/spec-frontmatter.ts`，职责仅为提取 `---` 之间的 YAML 并用 `yaml.parse()` 解析。不修改 `requirement-blocks.ts`。

**理由**: `extractRequirementsSection` 从 `## Requirements` 开始切割，frontmatter 在其之前，两者互不干扰。独立 parser 零耦合。

### D3: Registry 运行时扫描，不持久化

`src/core/spec-registry.ts` 每次调用时扫描 `openspec/specs/*/spec.md` 的 frontmatter，构建两个 Map:
- `capToSpecs: Map<string, string[]>`
- `specToCaps: Map<string, string[]>`

**替代方案**: 持久化为 JSON 索引文件。**否决理由**: 87 个文件读 frontmatter 是毫秒级操作，引入持久化文件会增加同步问题，违反单一 source of truth 原则。

### D4: Validation 策略——Warning 非 Error

新增两条 validation 规则，均为 warning 级别:
1. Frontmatter 中的 cap ID 不存在于 `project.opsx.yaml` → warning
2. Spec 无 frontmatter 或 capabilities 为空 → warning

**理由**: 渐进迁移。87 个现有 spec 无 frontmatter，若为 error 则阻塞所有 validate 操作。

### D5: CLI `spec list --json` 扩展

在现有 JSON 输出中为每个 spec 增加 `capabilities` 字段（string[]）。无 frontmatter 时为空数组。向后兼容——只新增字段，不删改现有字段。

### D6: Workflow 模板增强方式

三个模板新增 spec 发现指令（纯文本，非运行时逻辑）:
- `impact-sweeper.ts`: Evidence Protocol 新增步骤——扫描 specs frontmatter 构建 cap→spec 映射，受影响 cap 的关联 specs 写入 `mustCheck`
- `propose.ts`: 新增步骤——运行 `openspec spec list --json` 获取现有 specs 及 capabilities 关联，避免创建冗余 spec
- `apply-change.ts`: 新增步骤——实现 cap 前查询关联 specs，确认是否需要同步更新 delta spec

## Risks / Trade-offs

- [过渡期 registry 不完整] → 87 个无 frontmatter 的 spec 在 registry 中不可见。由 change 2 (bootstrap-backfill-specs) 批量补全缓解
- [LLM 可能忽略新增模板指令] → 指令增强是 best-effort 引导，非强制。validation 提供兜底 warning
- [cap ID 拼写错误写入 frontmatter] → validation 校验 cap 存在性产生 warning

## Migration Plan

无破坏性变更，无需迁移。现有 spec 无 frontmatter 时所有现有功能正常工作，validation 仅产生 warning。

## Open Questions

无。
