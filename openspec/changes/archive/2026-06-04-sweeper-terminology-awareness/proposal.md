<!-- 设计总结来源：探索模式对话，输入详细度足够，直接生成制品 -->

## Why

OpenSpec 工作流中存在术语漂移问题：用户在 explore、specs、change 等制品中使用非固定用语，导致同一概念出现多种表达（如"工作流"、"workflow"、"流程"混用）。这种不一致在重构和术语演进时尤为明显——用户发现更好的术语表达后，陈旧术语残留在已有 specs 中无法被检测。这违背了 DDD 统一语言（Ubiquitous Language）原则，影响代码库的可维护性。

## What Changes

- 扩展 `openspec-impact-sweeper` skill 的 prompt，在读取相关 specs 时增加术语提取步骤
- 扩展 sweeper JSON 报告格式，新增 `terminologyObservations` 字段记录术语使用模式
- 在 Explore workflow 的 master agent 中增加术语一致性判断逻辑，根据 sweeper 报告向用户提示术语冲突
- 术语提取策略：仅提取与用户输入 `concept` 语义相近的术语，而非全量扫描
- 报告策略：纯事实陈述（记录发现的术语及其分布），不做规范性判断

## Capabilities

### New Capabilities
- `sweeper-terminology-extraction`: Impact sweeper 在读取相关 specs 时提取与用户 concept 语义相近的术语，记录术语、出现次数和分布 specs
- `sweeper-terminology-reporting`: 在 sweeper JSON 报告中通过 `terminologyObservations` 字段返回术语观察结果
- `explore-terminology-decision`: Explore master agent 解读 `terminologyObservations`，根据用户输入与 specs 术语的一致性决定是否向用户提问

### Modified Capabilities
- `ai-impact-sweeper`: 现有 sweeper capability 的行为扩展，增加术语感知能力

## Impact

**受影响代码**：
- Skill 模板：`src/core/shared/skill-generation.ts` 中的 `openspec-impact-sweeper` 模板函数
- JSON Schema：Sweeper 报告的 TypeScript 接口定义（如果存在显式 schema 定义）
- Explore workflow：调用 sweeper 并处理 `terminologyObservations` 的 master agent 逻辑

**受影响 API/接口**：
- Sweeper JSON 报告格式：新增可选字段 `terminologyObservations`
- 向后兼容：旧版本 agent 忽略新字段，不影响现有行为

**依赖变更**：
- 无新增外部依赖
- 复用现有 CLI 查询接口（`openspec list --specs --json`）

**系统影响**：
- Sweeper subagent 需要额外的术语提取步骤（LLM 开销略增）
- 仅在 explore 阶段调用 sweeper 时生效，apply/archive 阶段不受影响
