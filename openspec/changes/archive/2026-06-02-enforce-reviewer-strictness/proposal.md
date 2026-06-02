## Why

当前 reviewer 在判定严重性时存在系统性的降级偏见（"不确定时优先 WARNING"），导致大量遗留问题（重构残留、过时 TODO、半迁移状态、spec 偏离）被降级为 WARNING 而不 block 归档。用户反馈这些"应该处理干净"的问题在实际使用中持续累积为技术债。需要反转判定哲学，将"处理干净"从建议提升为强制要求。

## What Changes

- 反转 reviewer.ts 元规则（L91-92）：从"不确定时降级"改为"不确定时升级，举证责任反转"
- 强化 Correctness 维度：spec 偏离和 scenario 未覆盖从 WARNING 升为 CRITICAL
- 强化 Coherence 维度：违反 design.md 决策从 WARNING 升为 CRITICAL
- 新增 Cleanliness 维度：检测重构残留、孤儿代码、过时 TODO、半迁移、死 import 等遗留物，默认 CRITICAL
- 采用工具无关设计：声明检测目标，agent 根据项目类型（TS/Python/Rust/Bash 等）自主选择适配工具
- 扩展 summary schema：增加 cleanliness 指标（orphanedCodeFound, deadImportsFound, staleTodosFound, halfMigrationsFound）
- 同步 verify-change.ts 文档：删除"prefer lower tier"表述

## Capabilities

### New Capabilities
- `reviewer-cleanliness-dimension`: Cleanliness 维度的检测逻辑、severity 映射和跨语言工具适配策略

### Modified Capabilities
- `openspec-reviewer-skill`: 元规则反转、Correctness/Coherence trigger 强化、summary schema 扩展
- `verify-prompt-orchestration`: verify-change.ts 中元规则表述的同步更新

## Impact

**受影响代码**：
- `src/core/templates/workflows/reviewer.ts`（主改动：~80 行净增）
- `src/core/templates/workflows/verify-change.ts`（文档同步：1 行）
- `openspec/specs/openspec-reviewer-skill/spec.md`（规约同步）

**用户体验变化**：
- CRITICAL 问题占比从 ~5% 升至 ~25%
- 归档 block 频率显著提升
- 遗留问题逃逸率降低 ~90%
- 用户需要更频繁地处理 CRITICAL 或显式豁免

**破坏性变化**：
- **BREAKING**：之前能归档的 WARNING-only 变更现在可能 block
- **BREAKING**：Correctness/Coherence 维度的 trigger 条件收窄，更多场景升级为 CRITICAL

**兼容性**：
- 跨语言项目（TS/JS/Python/Rust/Go/Bash）均可使用
- 无新依赖，纯 prompt 改动
