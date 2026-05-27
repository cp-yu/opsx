## Context

当前 `openspec-explore` 是开放式探索模式，只有 OPSX-first navigation 提示，没有强制的影响面扫描方法。用户在 explore 阶段引入多个概念或使用非项目术语时，agent 容易只看第一层 OPSX/code-map，导致 proposal/specs/tasks 天生漏项。

现有 reviewer/optimizer 已经证明“独立 skill + clean-context 调用”的模式适合把复杂判断从主 workflow 中拆出。本变更复用同类 skill 生成机制，但 `openspec-impact-sweeper` 是普通 skill，不新增 CLI command。

## Goals / Non-Goals

**Goals:**
- 为影响面发现提供可复用的 `openspec-impact-sweeper` skill。
- 让 `openspec-explore` 在代码变更概念、术语歧义、proposal readiness 前强制调用 sweeper。
- 让 sweeper 以 OPSX 为第一入口，并用 repo-wide reverse search 补足 code-map 外的消费面。
- 将 sweep 结果写入 `openspec/sweeper/*.json`，供主 agent 读取和合并。

**Non-Goals:**
- 不新增 `openspec impact` 或其他 CLI command。
- 不修改 `openspec-propose` 的 gate、提示或校验职责。
- 不修改 apply/verify/archive 流程。
- 不把 sweeper 报告作为正式 OpenSpec artifact、sync 输入或 archive 输入。
- 不要求 sweeper 运行测试、构建、`git diff`、`git status` 或 `git log`。

## Decisions

### Decision: sweeper 是普通 skill

新增 `openspec-impact-sweeper` 使用现有 `SkillTemplate` 生成路径，和其他 skill 一样生成到目标工具的 skills 目录。它不注册为 CLI command，避免扩大用户命令面。

### Decision: explore 负责调度，sweeper 负责证据收集

`openspec-explore` 判断何时需要 sweep：代码变更概念、术语无法直接映射、用户引入新概念、或准备建议进入 proposal/change artifacts。每个概念单独调用一次 sweeper。sweeper 不持久记忆，不直接询问用户，只把 `questions` 写入报告。主 agent 读取报告后决定如何向用户提问。

### Decision: OPSX first, reverse search second

sweeper 必须先读 `openspec/project.opsx.yaml`、`openspec/project.opsx.code-map.yaml`、`openspec/project.opsx.relations.yaml`。命中节点后扫描一跳关系，只有在共享基础设施、跨 domain、或搜索显示外溢时做二跳扩展。之后用 `git ls-files` 限定 tracked 文件范围，并排除 `openspec/changes/archive/**` 做 repo-wide reverse search。

### Decision: 报告是轻结构 JSON

报告固定字段名，不限制字段值内容。`mustChange` 和 `mustCheck` 使用统一 `target` 字段，可以放文件、capability、spec、命令、模板或其他 LLM 可读目标。报告不包含时间戳和 confidence；时间使用文件 mtime，确定性由 evidence 和 questions 表达。

### Decision: 项目内工作目录，不跟踪报告

sweeper 写入 `openspec/sweeper/impact-sweep-<english-project-term-slug>.json`。英文 slug 优先使用项目术语，重复概念覆盖同一路径。第一次运行时确保 `openspec/sweeper/.gitignore` 存在：

```gitignore
*
!.gitignore
```

### Decision: 写入白名单

sweeper 只允许创建 `openspec/sweeper/`、创建缺失的 `.gitignore`、写报告 JSON。其他项目文件均只读。

## Risks / Trade-offs

- [Risk] OPSX 过期或 code-map 缺失会降低 sweep 覆盖面。→ Mitigation: 报告必须写 `coverageGaps`，并用 repo-wide reverse search 补足。
- [Risk] 强制 sweep 可能让 explore 变慢。→ Mitigation: 仅在触发条件成立时调用，且每次只扫一个 concept。
- [Risk] 报告目录在项目内可能被误当正式 artifact。→ Mitigation: `.gitignore` 忽略报告，并在 skill 指令中声明它不是 proposal/design/tasks/spec/OPSX artifact。
- [Risk] 文件路径跨平台处理不一致。→ Mitigation: 实现使用 `path.join()` 构建 `openspec/sweeper` 路径，报告 JSON 中可保留 POSIX 风格证据引用。

## Migration Plan

新增 skill 与 explore 指令后，通过 `openspec update` 或 init/update 生成流程刷新目标工具的 skill 文件。已有 changes 不需要迁移。

## Open Questions

无。
