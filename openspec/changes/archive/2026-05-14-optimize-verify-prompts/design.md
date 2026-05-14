## Context

当前 verify 提示词 (`src/core/templates/workflows/verify-change.ts`) 的功能是完整的 — reviewer subagent 正确生成、checkpoint 状态机正确描述、CLI 合约正确。但提示词的 **编排纪律** 不足：缺少显式 coordinator 角色声明、缺少阶段模式标签、subagent 调用是抽象描述而非具体工具语法、无超时处理规则。agent 容易在长链路中跳步或越权。

当前 `resolveVerifyExecutionModel()` 明确把 `claude` 和 `codex` 都映射到 `subagent-orchestrated`。这意味着 verify prompt 应该保持工具无关：明确要求调用 clean-context subagent 并传入完整输入包即可，不应写入 `Agent({...})` / `TaskOutput({...})` 这类带工具或 CLI 表面特征的方法名。

CCG 命令文件 (`/home/yunxin/.claude/commands/ccg/`) 的编排模式已被验证有效：角色定义 → 模式标签 → 明确委派 → 等待规则 → 交叉验证 → 结构化输出。Verify 与 CCG 在结构上是同构的（coordinator + sub-executor + validation + synthesis），但 verify 有额外的 checkpoint/git stash 状态机和 CLI 持久化层。

## Goals / Non-Goals

**Goals:**
- 通过纯字符串级改动提升 verify 提示词的 agent 执行纪律
- 引入 coordinator 角色声明、模式标签、明确 subagent 调用指令、超时规则
- 将 Phase 2 checkpoint 状态机从密集段落重构为表格 + 模式标签
- 所有新增提示词文本保持英文（与现有模板一致）

**Non-Goals:**
- 不修改 TypeScript 函数签名、控制流、CLI 逻辑
- 不修改 reviewer/optimizer 子代理的技能提示词内容
- 不改变 verify CLI 的 JSON schema 或 phase1/phase2/seal 合约
- 不引入多模型投票（不添加 Codex/Gemini 并行调用）
- 不修改 archive-change、apply-change 的 verify 触发逻辑

## Decisions

### Decision 1: Fragment 策略 — 新增两个 fragment，禁止内联

**选择**: 新增 `VERIFY_COORDINATOR_ROLE` 和 `VERIFY_SUBAGENT_TIMEOUT_RULES` 到 `opsx-fragments.ts`，在 `verify-change.ts` 中 import 并注入。

**替代方案**: 直接在 `buildVerifyIntro` 和 subagent 调用处写内联字符串。

**理由**: fragment 复用是现有模式（已有 22 个 fragment 导出）。timeout 规则和角色定义可能被 archive-change 等其他 workflow 复用。分离后测试更容易验证 fragment 内容不漂移。

### Decision 2: 模式标签 — 仅大阶段，不污染子状态

**选择**: 在 8 个主要阶段添加模式标签 (`[模式：准备]` / `[模式：证据]` / `[模式：委派审查]` / `[模式：验证]` / `[模式：写回]` / `[模式：Checkpoint]` / `[模式：优化]` / `[模式：推测验证]` / `[模式：Seal]`)，不在 checkpoint 子状态（CREATED/BASELINE_RESTORED/TERMINAL_ACCEPTED...）添加标签。

**替代方案**: 每个 checkpoint 子状态一个标签，或者完全不添加标签。

**理由**: 模式标签的价值在于帮助 agent 切换认知模式。8 个标签覆盖 verify 的所有认知模式类型。checkpoint 的 4 个子状态是同一个 `[模式：Checkpoint]` 认知模式内的操作分支 — 添加标签只会增加噪音。

### Decision 3: Subagent 调用指令 — 明确 delegation contract，不写工具 API

**选择**: 
- Template 层只说清楚：调用 clean-context reviewer / optimizer subagent
- 明确 subagent 应 invoke `openspec-reviewer` 或 `openspec-optimizer` skill
- 明确必须传入完整 evidence bundle 或 optimization input contract
- 明确 top-level agent 必须等待完整 subagent payload 后才能进入下一步
- 不输出 `Agent({...})`、`TaskOutput({...})`、`AskUserQuestion` 或任何具体工具 API 名称

**替代方案**: 在通用 `verify-change.ts` 中写具体 `Agent({...})` 语法，或新增 tool-specific renderer。

**理由**: `verify-execution-model.ts:9` 确认 `codex` 工具也走 `SUBAGENT_VERIFY_EXECUTION_MODEL`。硬编码 Claude 专用语法会污染 Codex；新增 renderer 对当前需求过度设计。verify prompt 只需要表达“调用 subagent”这个工作流意图，具体怎么调用由运行中的 agent 工具能力决定。

### Decision 4: Checkpoint 状态机 — 段落→表格

**选择**: 将 `buildPhase2Step` 中密集的 checkpoint 状态描述从连续段落改为 Markdown 表格 + 硬规则列表。

**理由**: 当前 4 个状态（CREATED/BASELINE_RESTORED_FOR_RETRY/TERMINAL_ACCEPTED/TERMINAL_RESTORED）的描述混合在段落中，agent 难以快速索引到当前状态的触发条件和 git 操作。表格格式让状态/触发条件/git 操作一目了然。

### Decision 5: 提示词语言 — 全部英文

**选择**: 所有新增和修改的提示词文本保持英文。模式标签使用 `[Mode: ...]` 英文格式。

**用户明确要求**: "提示词应该保持英文（现有的模板）"。

## Risks / Trade-offs

- **工具语法不一致**: 不在通用 prompt 中写任何工具 API 名称，只描述 subagent delegation contract，避免跨工具泄漏。
- **模式标签增加提示词长度**: 标签本身只增加约 10 行，每个标签一行。收益（agent 模式切换）大于成本（token 开销）。
- **表格格式在不同 agent 中的解析差异**: 部分 agent 可能不完美解析 Markdown 表格，但 checkpoint 段落的原始文字也保留在 `buildReverifyStep` 中，表格仅用于 Phase 2 入口处的概述。
- **超时规则无法强制**: 提示词中的 timeout 规则是软约束。如果 agent 仍然跳过等待，需要核心逻辑层加固。这是已知局限。
