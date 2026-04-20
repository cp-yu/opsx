## Context

当前系统已经具备完整 `verify` 工作流、`.verify-result.json` 持久化，以及 `archive` 对 verify result 的消费能力，但整体仍停留在“部分闭环”：

- `expanded` 模式存在独立 `/opsx:verify`，但 archive 对缺失或过期 verify 结果仍保留可跳过路径
- `core` 模式没有独立 verify surface，因此 archive 退化为轻量 inline conformance check
- verify 当前更像“实现者自查”，缺少一个明确要求的干净审阅上下文
- freshness 目前主要围绕 `tasks.md`，不足以覆盖“代码改了但任务文件没变”的情况

这让 `archive` 前的最后一道门没有真正统一。系统看似有 verify，实际上还没有把“归档前必须经独立审阅确认符合 change 意图”变成单一合同。

## Goals / Non-Goals

**Goals:**
- 将 full verify 提升为 archive 前的统一硬门禁，消除 `core`/`expanded` 在验证深度上的分叉
- 保持 `core` profile 仍然只有四个用户可见 workflow surface
- 对支持 subagent 的工具明确要求使用干净上下文 reviewer agent 执行 verify
- 扩展 `.verify-result.json`，让 archive 能基于显式 verification context 判定 freshness
- 统一文档叙事，使 README、工作流文档、命令文档与真实合同一致

**Non-Goals:**
- 不为 `core` profile 新增独立 `verify` surface
- 不引入第三套程序化 validator 来替代现有 prompt-driven verify 契约
- 不把 git diff 当成归档判定的唯一事实来源
- 不试图精确推断“此次 change 相关的所有文件”这一完美集合；只要求 freshness 判定显式、可复用、可解释

## Decisions

### Decision: archive gate 统一建立在 full verify result 之上

`archive` 不再维护一条独立的轻量 conformance 语义。无论 `core` 还是 `expanded`，归档前都必须有一份 fresh 的 full verify 结果：

- 若已有 fresh `PASS` / `PASS_WITH_WARNINGS` 结果，archive 直接复用
- 若结果缺失或 stale，archive 先执行 full verify
- 若结果为 `FAIL_NEEDS_REMEDIATION`，archive 直接阻断

这样可以消除“同名 verify，实际两套深度”的系统歧义。

备选方案：保留 `core` 轻量 inline check，仅在 `expanded` 中使用 full verify。拒绝原因：这正是当前语义漂移的根源，继续保留只会把复杂度藏起来。

### Decision: core 保持四个 surface，但 archive 内嵌 verify 合同

用户不需要在 `core` 模式下学习第五个命令。`archive` 仍然是用户唯一入口，但其内部必须执行与 `/opsx:verify` 等价的验证合同。

这意味着：
- `workflow-surface` 层不把 `verify` 加入 `core`
- `archive-change` 模板需要引用 full verify contract，而不是简化版 fragment
- 文档必须明确“core 没有独立 verify surface，但 archive 前一定会跑 full verify”

### Decision: subagent 是首选执行形态，不是第二套规则

对 Claude Code、Codex 这类支持 subagent 的工具，verify 必须使用干净上下文 reviewer agent。该 reviewer agent 的输入应显式包含：

- `proposal.md`、delta specs、`design.md`、`tasks.md`
- 相关最终文件内容
- git status / diff 元数据
- 上次 verify 结果（若存在）

但 subagent 只改变“谁来审”，不改变“按什么标准审”。不支持 subagent 的工具，必须在当前 agent 内显式重读同一组输入，并把实现对话历史降级为非权威上下文。

### Decision: git 只用于发现候选证据，最终判断以最终文件内容为准

git diff 对 verify 很有价值，因为它能快速暴露候选实现区域、漏改区域和宣称完成但无改动的任务。但 diff 不是事实本身：

- 某个 diff hunk 看起来对了，不代表最终文件满足 requirement
- 某个 requirement 没出现在 diff 里，也不代表实现不存在，可能在已有文件中完成

因此 verify 的判断顺序应是：
1. 用 git 信息定位候选文件和可疑区域
2. 回到最终文件内容、测试和 change artifacts 做对照
3. 基于最终状态给出 PASS / WARNING / FAIL

### Decision: freshness 由显式 verification context 驱动

仅比较 `tasksFileHash` 不足以判定 verify 是否仍然有效。新的 `.verify-result.json` 需要附带最小但足够的 verification context，例如：

- `tasksFileHash`
- evidence file set 或其 fingerprint
- git-derived evidence summary
- execution mode（是否 clean-context reviewer）

archive 只根据这些显式字段做 freshness 判定，不做隐式猜测。

### Decision: docs drift 与模板合同一并收敛

文档中当前存在多处旧叙事，例如：
- `core` 只做轻量 inline check
- `verify` 是 optional
- archive 对缺少 verify result 只做 soft prompt

这次变更需要同时更新 README、`docs/getting-started.md`、`docs/workflows.md`、`docs/commands.md`、`docs/opsx.md`、`docs/supported-tools.md`，使用户读到的流程与 skill template、spec contract 一致。

## Risks / Trade-offs

- [Risk] 归档前增加 full verify，可能让 `archive` 体感变慢
  → Mitigation: 允许复用 fresh verify result；只有缺失或 stale 时才重跑
- [Risk] freshness 判定过宽，导致本可复用的 verify 被判 stale
  → Mitigation: 只使用显式记录的 verification context，不做全仓库粗暴失效
- [Risk] subagent 能力跨工具差异大，容易形成工具特判分支
  → Mitigation: 只把“是否支持 subagent”作为执行形态分支，验证语义仍由同一合同定义
- [Risk] 文档修复不完整，用户继续按旧叙事理解流程
  → Mitigation: 将 docs drift 修复列为同一 change 的明确任务，并覆盖核心入口文档

## Migration Plan

1. 先更新 specs，冻结新的 archive/verify/writeback 合同
2. 再更新 workflow templates 与 shared fragments
3. 扩展 `.verify-result.json` 字段与 freshness 判定逻辑
4. 补充/调整测试，覆盖 `core` 与 `expanded` 两条归档路径
5. 最后统一修正文档叙事，并通过一次 repo 内搜索清理旧表述

## Open Questions

- verification context 的最小字段集采用 `evidenceFiles + fingerprints`、还是更抽象的 workspace fingerprint，后续实现时需要再做一次权衡
- archive 在 expanded 模式下缺少 fresh verify result 时，是直接内部执行 verify，还是先显式提示“正在执行 verify”后继续，属于实现体验层面的选择
