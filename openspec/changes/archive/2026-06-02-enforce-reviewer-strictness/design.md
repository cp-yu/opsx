## Context

当前 `reviewer.ts` (src/core/templates/workflows/reviewer.ts) 作为 Phase 1 验证的 subagent skill，其严重性判定逻辑存在系统性的降级倾向：

- L91-92 元规则："不确定时优先低档次"（prefer lower tier）
- L88/L131-132：Correctness 维度的 spec 偏离和 scenario 未覆盖硬编码为 WARNING
- L136：Coherence 维度的设计决策违反硬编码为 WARNING
- 缺失 Cleanliness 维度：重构残留、孤儿代码、过时 TODO、半迁移等遗留物完全不检查

这导致归档门禁实际上只拦截 ~5% 的 CRITICAL 问题，而让 ~25% 的 WARNING（大部分是遗留问题）放行。用户诉求是"需要处理干净"，而当前设计允许技术债累积。

本设计反转判定哲学，将"处理干净"从建议升级为强制要求，同时保持跨语言项目的通用性。

## Goals / Non-Goals

**Goals:**
- 反转元规则：不确定时升级而非降级，举证责任从"证明有问题"转为"证明做完了"
- 强化现有维度 trigger：Correctness/Coherence 中明确应该 block 的场景升为 CRITICAL
- 新增 Cleanliness 维度：检测重构残留、孤儿代码、过时 TODO、半迁移等遗留物
- 工具无关设计：声明检测目标而非指定工具，agent 根据项目类型自适应
- 保持 Reviewer-Optimizer 职责边界：Cleanliness 只查"本次变更应清理但未清理"，历史债务留给 Optimizer

**Non-Goals:**
- 不改变 Completeness 维度（已经足够严格）
- 不改变 OPSX Alignment 维度（非核心痛点）
- 不在 Reviewer 中强制运行静态分析工具（避免时间开销和跨项目兼容性问题）
- 不处理历史技术债（超出 Cleanliness 的 diff scope）

## Decisions

### Decision 1: 元规则反转——从"避免误报"到"避免漏报"

**当前**：L91-92 "prefer lower tier" → 不确定时降级  
**改为**：明确"Default stance: Strict"，不确定时升级到 CRITICAL

**Rationale**：
- 误报（CRITICAL 误杀）可以通过 artifact 修正或用户豁免解决
- 漏报（WARNING 放行）直接累积为技术债，事后修复成本高
- 用户反馈表明"宁可严格 block 后手动放行，也不要静默累积"

**Alternatives considered**：
- 保守方案：仅针对特定场景（如重构）升级 → 放弃：无法覆盖所有遗留问题类型
- 激进方案：所有 WARNING 升为 CRITICAL → 放弃：风格建议不应 block

### Decision 2: Correctness/Coherence trigger 强化

**当前**：
- L131: spec 偏离 → WARNING "may diverge"
- L132: scenario 未覆盖 → WARNING "incomplete"
- L136: 违反 design.md → WARNING "not followed"

**改为**：
- spec 偏离 → CRITICAL "contradicts spec"（downgrade 条件：仅装饰性且不影响行为）
- scenario 未覆盖 → CRITICAL "not covered"（无 downgrade）
- 违反 design.md → CRITICAL "violated"（downgrade 条件：代码注释显式说明理由）

**Rationale**：
- 这些场景是"工作未完成"而非"质量可提升"，属于 Completeness 范畴
- 当前的 WARNING 语义混淆了"可能有问题"和"确定有问题但不确定严重度"
- 改后 WARNING 收窄为"确定不是问题，但值得注意"

### Decision 3: 新增 Cleanliness 维度——检测遗留物

**检测目标**：
1. 重构后的孤儿代码（旧 API 还在但无调用）
2. 过时的 TODO/FIXME（引用已完成的任务）
3. 本次变更引入的死 import
4. 半迁移（新旧模式并存）
5. 不可达代码（降为 WARNING，可能是防御性）

**Scope 限定**：仅检测 `git diff <originalBranch>...HEAD` 范围内的文件，历史债务留给 Optimizer Phase 2

**Rationale**：
- 遗留物是"任务标记完成但实际未清理干净"，属于 Completeness 问题
- Scope 限定避免 Reviewer 承担全局代码质量职责（那是 Optimizer 的）
- 与 Optimizer 边界清晰：Reviewer = 门禁（必须过），Optimizer = 改进（尽量过）

### Decision 4: 工具无关设计——声明目标，agent 自适应

**当前初始设计**（被拒绝）：
- 协议式："Run `tsc --noEmit`"/"Run `eslint`"
- 问题：假设工具存在，不适配 Python/Rust/Go/Bash 项目

**改为目标声明式**：
- 列举 4 类检测目标（孤儿代码/过时 TODO/死 import/半迁移）
- 提供方法库："Task-code cross-reference / Diff-scoped search / Static analysis (IF available) / Pattern matching"
- 明确指导原则："Prioritize speed and reliability"

**Rationale**：
- OpenSpec 会在多个项目上使用，不能假设技术栈
- Agent 有足够能力根据项目特征（package.json/Cargo.toml/pyproject.toml）选择方法
- 轻量方法（grep + Read）在大多数场景下已足够，静态工具作为增强

**跨语言适配示例**：
- TS 项目：tsc/eslint（如果配置存在）+ grep
- Python 项目：ruff/pylint（如果配置存在）+ grep
- Rust 项目：cargo clippy + grep
- Bash 项目：纯 grep（无 import 概念）

### Decision 5: summary schema 扩展

在 L176-178 `coherence` 之后插入 `cleanliness` 对象：
```json
"cleanliness": {
  "checked": true,
  "orphanedCodeFound": 0,
  "deadImportsFound": 0,
  "staleTodosFound": 0,
  "halfMigrationsFound": 0
}
```

**Rationale**：
- 为上层工作流和用户提供清洁度指标
- 与其他维度（completeness/correctness/coherence）并列
- 输出到 `.verify-result.json` 供审计和趋势分析

## Risks / Trade-offs

### Risk 1: CRITICAL 率上升导致用户体验摩擦

**Risk**: CRITICAL 占比从 ~5% 升至 ~25%，用户需更频繁处理 block 或显式豁免  
**Mitigation**:
- recommendation 字段提供明确的修复路径（"Remove X" / "Update spec if intentional"）
- 通过 downgrade 条件留出合理例外（装饰性 drift / 防御性代码）
- 文档强调这是质量门禁哲学转变，事先沟通预期

### Risk 2: 静态工具误报影响门禁

**Risk**: tsc/eslint 可能产生误报（动态 import / 类型导入 / 副作用 import）  
**Mitigation**:
- 不强制运行静态工具，agent 自主判断可用性和可靠性
- 优先轻量方法（grep + Read），静态工具作为增强
- recommendation 引导用户排除误报（"标记为 dynamic import" / "添加注释说明"）

### Risk 3: Cleanliness 检测漏报

**Risk**: 无静态工具的项目（纯 Bash / 无配置的 JS）依赖 grep，漏报率高  
**Mitigation**:
- Edge case 明确："Tools unavailable → rely on manual detection, note limitation in gitDiffSummary, do NOT downgrade severity"
- 职责边界清晰：Cleanliness 只查"明显应该清理的"，不追求 100% 覆盖
- Optimizer Phase 2 可以补充全局检查

### Risk 4: 与现有验证流程的兼容性

**Risk**: 现有用户的 WARNING-only 变更可能突然 block  
**Trade-off**: 这是 **BREAKING** 变化，需要在 release notes 中显式标记
- 好处：阻止新技术债累积
- 代价：存量变更需要补充修复或豁免
- 建议：提供迁移指南，说明如何处理升级后的 CRITICAL 问题

### Risk 5: 跨语言工具适配的不一致性

**Risk**: 不同项目的检测深度不一致（TS 有 tsc，Bash 只有 grep）  
**Mitigation**:
- 这是设计目标而非 bug：工具无关意味着能力梯度
- gitDiffSummary 注明检测方法，透明化能力边界
- 核心原则：宁可漏报（靠 Optimizer 补），不要误报（block 错误）
