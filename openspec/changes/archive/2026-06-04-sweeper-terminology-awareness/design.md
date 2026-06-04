## Context

OpenSpec 项目使用 `openspec-impact-sweeper` subagent 在 explore 阶段评估用户输入 concept 的影响面。Sweeper 当前通过 CLI 查询接口（`openspec opsx query`、`openspec list --specs --json`）读取 OPSX 数据和相关 specs，生成包含 `affectedCapabilities`、`mustCheck`、`questions` 等字段的 JSON 报告。

术语漂移问题源于用户在不同时间点、不同制品中使用非固定术语，且系统缺乏检测机制。Grill-with-docs skill 通过维护独立的 CONTEXT.md 文件解决术语一致性，但这引入了额外的维护负担且与 DDD 的"统一语言活在领域模型中"理念不符。

本设计采用轻量级方案：复用 sweeper 现有的 spec 读取能力，在读取过程中自然感知术语使用模式，通过 master agent 决策向用户提示术语冲突。

**约束**：
- 不引入新的术语表文件或 CLI 命令
- Sweeper subagent 职责限于事实提取，master agent 负责判断和提问
- 仅在 explore 阶段生效，不影响 apply/archive 流程
- 向后兼容：旧版本 agent 忽略新增 JSON 字段

## Goals / Non-Goals

**Goals:**
- 在 explore 阶段自然感知并提示术语不一致（用户输入 vs specs，或 specs 内部）
- 复用现有 sweeper 能力，无需额外 CLI 命令或文件维护
- 纯事实陈述，用户自主决定是否统一术语
- 扩展 sweeper JSON 报告格式，向后兼容

**Non-Goals:**
- 不构建显式的术语表文件（CONTEXT.md 或 .terminology.yaml）
- 不在 apply/archive 阶段强制术语一致性检查
- 不自动重写 specs 中的术语（用户自行决定）
- 不提供术语演进历史追踪（未来扩展点）
- 不覆盖技术术语或通用编程概念（仅关注领域特定术语）

## Decisions

### 决策 1：术语提取策略 — 语义相近而非全量扫描

**选择**：Sweeper 仅提取与用户输入 `concept` 语义相近的术语。

**备选方案**：
- 方案 A：提取所有名词性术语（制品、变更、工作流、拓扑排序...）
- 方案 B：提取与 concept 语义相近的术语（用 LLM 判断）
- 方案 C：基于预定义核心术语列表（10-20 个高频词）过滤

**理由**：
- 方案 A 噪音过大，用户输入"流程管理"时不需要看到"拓扑排序"的分布
- 方案 C 引入维护负担（核心术语列表需要手动更新）
- 方案 B 平衡了精确性和灵活性，依赖 LLM 的语义理解能力

**实现**：在 sweeper prompt 中增加指令："Identify terms semantically related to user's `concept` input"

### 决策 2：报告字段结构 — 扩展 JSON 而非新增接口

**选择**：在现有 sweeper JSON 报告中新增 `terminologyObservations` 可选字段。

**备选方案**：
- 方案 A：新增 CLI 命令 `openspec terminology check`
- 方案 B：扩展现有 sweeper 报告 JSON 结构
- 方案 C：在 `questions` 数组中直接追加术语相关问题

**理由**：
- 方案 A 增加 CLI 复杂度，且术语检查与影响面评估高度耦合
- 方案 C 混合事实数据和提问逻辑，不利于 master agent 精细控制
- 方案 B 保持职责分离（subagent 提取事实，master agent 生成问题），且向后兼容

**字段结构**：
```typescript
terminologyObservations?: {
  userInput: string;  // 用户输入的术语
  foundInSpecs: Array<{
    term: string;      // 在 specs 中发现的术语
    specs: string[];   // 使用该术语的 spec 名称列表
    count: number;     // 出现次数
  }>;
}
```

### 决策 3：提问逻辑 — Master Agent 四态判断

**选择**：Master agent 根据 `terminologyObservations` 执行四态判断逻辑。

**判断规则**：
1. **用户输入 ≠ 任何 specs 术语** → 必提："你使用了'流程'，specs 中使用'工作流'和'workflow'..."
2. **Specs 中存在多种表达** → 提示不一致："检测到'工作流'(10处) vs '流程'(5处)..."
3. **完全一致**（一个术语且匹配用户输入）→ 静默通过
4. **未发现相关术语** → 静默通过（可能是新概念）

**理由**：
- 情况 1 最关键，用户术语与现有 specs 脱节必须提示
- 情况 2 暴露 specs 内部不一致，建议用户主动统一
- 情况 3/4 不干扰正常流程

### 决策 4：分层职责 — Subagent 提取事实，Master Agent 决策

**选择**：严格分离 subagent 和 master agent 职责。

**职责划分**：
- **Sweeper Subagent**：读取相关 specs → 提取术语 → 生成 JSON（包含 `terminologyObservations`）
- **Master Agent (Explore)**：解读 JSON → 执行四态判断 → 向用户提问

**理由**：
- Subagent 不应直接向用户提问（违背 subagent 作为"工具"的定位）
- Master agent 拥有完整对话上下文，能更好地判断提问时机
- 分层设计便于未来扩展（如术语锁定、演进追踪）

## Risks / Trade-offs

**风险 1：LLM 术语提取不准确**
- **表现**：将"用户"和"管理员"判断为同义词，或漏掉真正的术语变体
- **缓解**：在 prompt 中提供明确示例（如 concept="流程" 应提取"工作流"、"workflow"、"工作流程"）；依赖实际使用反馈迭代 prompt

**风险 2：性能开销**
- **表现**：Sweeper 需要额外的术语提取步骤，LLM token 消耗增加
- **缓解**：术语提取复用现有 spec 读取过程，无额外文件 I/O；仅在 explore 阶段（低频操作）生效

**风险 3：用户疲劳**
- **表现**：频繁的术语不一致提示打断 explore 流程
- **缓解**：四态判断逻辑过滤掉正常情况（情况 3/4），仅在真正冲突时提示；未来可增加"静默模式"配置项

**权衡 1：无显式术语表 vs 无权威规范**
- **选择**：不维护独立术语表文件
- **代价**：术语规范隐含在 specs 中，无单一权威来源；多数表决策略可能误判（少数正确术语被多数错误术语淹没）
- **接受理由**：DDD 原则强调术语活在领域模型（specs）中；显式术语表增加维护负担且与代码库脱节

**权衡 2：语义相近判断 vs 精确匹配**
- **选择**：依赖 LLM 语义判断而非字符串匹配
- **代价**：模糊匹配可能漏报（"进程"和"流程"语义不同但可能被误判）或误报（"工作流程"包含"流程"）
- **接受理由**：术语漂移本质是语义问题而非字符串问题；精确匹配无法处理同义词和复合词

## Migration Plan

本变更为纯新增功能，无需数据迁移或配置变更。

**部署步骤**：
1. 更新 `openspec-impact-sweeper` skill 模板（在 `src/core/shared/skill-generation.ts` 中）
2. 运行 `openspec update` 重新生成 skill 文件到项目 `.claude/skills/` 目录
3. Explore workflow 的 master agent 逻辑通过 prompt 或代码更新支持 `terminologyObservations` 解读

**向后兼容性**：
- 旧版本 sweeper 不生成 `terminologyObservations` 字段，master agent 忽略该字段，行为不变
- 新版本 sweeper 生成该字段，旧版本 master agent 忽略，不影响现有流程

**回滚策略**：
- 移除 sweeper prompt 中的术语提取指令
- Master agent 不再处理 `terminologyObservations` 字段
- 已生成的 JSON 报告中该字段被忽略

## Open Questions

1. **是否需要配置项控制术语检查？**
   - 例如 `openspec/config.yaml` 中新增 `terminology.enabled: false` 允许用户关闭术语检查
   - 当前设计默认启用，依赖四态判断逻辑过滤噪音

2. **未来是否支持术语演进追踪？**
   - 例如记录"流程"→"工作流"的迁移历史，帮助用户完成批量替换
   - 当前设计不涉及历史追踪，标记为未来扩展点

3. **是否需要在 apply/archive 阶段强制术语一致性？**
   - 例如 archive 前校验新增 specs 的术语是否与主 specs 一致
   - 当前设计仅在 explore 阶段提示，不阻塞后续流程
