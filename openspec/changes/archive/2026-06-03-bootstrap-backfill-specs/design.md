## Context

Change 1 (spec-capability-awareness) 引入了 spec frontmatter 格式和 Spec Registry，但现有 87 个 specs 无 frontmatter。需要自动化 backfill 使 registry 快速产生价值。Bootstrap 是在 agent 上下文中执行的，因此 LLM 语义匹配可以自然地通过 subagent 完成。

## Goals / Non-Goals

**Goals**:
- 程序化命名匹配：spec 目录名段 ↔ OPSX cap ID 段自动关联
- LLM 语义匹配：命名无法覆盖的 specs 由 subagent 读内容推断
- 全自动写入：高低置信度均直接写入，无用户确认环节
- 双入口：独立 CLI 子命令 + promote 末尾自动调用

**Non-Goals**:
- 不新增独立 skill 模板文件
- 不实现用户交互式确认流程
- 不处理 specs 归档/淘汰（属于后续 change）

## Decisions

### D1: 命名匹配算法

将 spec 目录名（如 `cli-archive`）的各段与 OPSX cap ID（如 `cap.cli.archive`）的 domain/action 段做对齐。匹配规则：
1. spec 名按 `-` 分段
2. cap ID 按 `.` 分段（去掉 `cap.` 前缀）
3. 若 spec 各段是 cap 各段的子序列或完全匹配 → 高置信度自动关联

**替代方案**: 严格相等匹配。**否决理由**: `change-creation` vs `cap.change.create` 这类合理对应会被漏掉。

### D2: LLM 匹配不需要独立 skill

Bootstrap 一定在 agent 上下文中执行。Bootstrap skill 指令直接描述：对 backfill 返回的 unmatched specs，启动 subagent 读 spec 内容 + OPSX cap intent 进行语义匹配。不新增模板文件。

### D3: Frontmatter 写入方式

在 spec.md 文件头部插入 `---` 块。若文件已有 frontmatter → 跳过（change 1 的 parser 已处理）。写入时保持文件其余内容不变。

### D4: Promote 集成方式

`promoteBootstrap()` 末尾调用 Backfill Engine。这是程序化调用（命名匹配 + 写入），LLM 语义匹配部分由 bootstrap skill 指令在 agent 层面驱动。

## Risks / Trade-offs

- [命名匹配误匹配] → cap ID 有领域前缀约束，误匹配概率低。change 1 的 validation warning 兜底
- [LLM 推断错误] → 全自动写入是设计选择，换来零打断流程。错误关联可事后修正
- [Frontmatter 写入破坏 spec 内容] → 仅在文件头部插入 `---` 块，不动后续内容

## Migration Plan

无破坏性变更。backfill 只向无 frontmatter 的 spec 添加内容，不修改已有 frontmatter。

## Open Questions

无。
