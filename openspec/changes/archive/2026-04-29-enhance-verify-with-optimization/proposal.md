## Why

当前 `propose → apply → verify → sync → archive` 管线中的 `verify` 仅检查功能一致性（spec vs. 代码实现是否匹配），缺乏代码质量维度的反馈。AI 生成的代码可能"能跑但不可维护"——函数过长、重复代码、嵌套过深等问题会反复出现。

现有 `add-code-review-command` 设计引入了独立的 `refine` 命令族（refine review + refine fix + refine status + refine context）作为 verify 之后的可选质量子循环，但该方案命令膨胀（4 个新命令）、文件碎片化（3 种新持久化文件）、工作流复杂度过高。应该将代码质量诊断与修复的职责合并到现有 `verify` 中，保持主管线简洁。

## What Changes

- **`verify` 升级为两阶段质量门禁**：Phase 1 一致性检验（现有）→ Phase 2 最优性检验（新增），先确保正确，再追求优雅
- Phase 2 由独立的 clean-context subagent 执行，输出 Search/Replace 块（替代 unified diff）供主 agent 应用
- Phase 2 默认启用，可通过 `openspec/config.yaml` 配置 `optimization.enabled` 关闭，或 CLI `--skip-optimization` flag 跳过
- 使用 `git stash` 做 checkpoint 保护，优化失败时完整恢复到 Phase 1 已验证完成的基线
- 三类预算控制：格式重试上限 2 + 匹配重试上限 2 + 行为重试上限 3，防止无限循环
- 不再因当前 worktree 非空而自动跳过 Phase 2；只要未显式禁用，就依赖 checkpoint 执行和回滚
- 3 次真正失败后静默回滚 + Degraded Pass，不影响流程继续
- **消除独立命令族**：不创建 `openspec refine` 命令，不创建 refine 系列持久化文件
- **消除 feedback-loop 独立状态**：不创建 `quality-context.yaml`，不实现跨项目学习机制
- `.verify-result.json` 扩展 `optimization` 对象（不影响现有 consumers），顶层 `result` 保持三值不变
- archive 门禁只检查 `.verify-result.json` 一个文件

## Capabilities

### New Capabilities

- `cap.verify.optimize`: 在一致性检验通过后，对代码进行最优性检验——诊断代码质量、设计模式、效率维度，生成 Search/Replace 块供主 agent 在 checkpoint 保护下应用。支持默认启用、可跳过、自动回滚和 Degraded Pass 降级策略。

### Modified Capabilities

- `cap.verify`: 从单一一致性检验扩展为两阶段质量门禁（一致性 + 最优性），输出 `.verify-result.json` 增加 `optimization` 对象。
- `cap.archive`: archive 门禁扩展以识别 `optimization` 字段，不再需要检查额外的 refine 结果文件。

## Impact

- 修改 `src/core/templates/workflows/verify-change.ts`：新增 Phase 2 最优性检验 instructions
- 修改 `src/core/templates/fragments/opsx-fragments.ts`：新增最优性检验 protocol fragment
- 修改 `src/core/templates/workflows/archive-change.ts`：扩展 freshness 判定以包含 optimization 字段
- 修改 `src/core/config-schema.ts`：新增 `optimization` 配置节
- 修改 `src/core/project-config.ts`：注册 `optimization` 顶级 key
- 修改 `openspec/config.yaml`：新增 `optimization` 配置段
- 修改 `openspec/project.opsx.yaml` 及相关文件：新增 cap.verify.optimize
- 不创建任何新 CLI 命令、新持久化文件类型、新核心模块
