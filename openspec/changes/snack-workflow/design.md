## Context

snack 工作流填补 OpenSpec 现有 5 个工作流的空白：现有工作流都是"需求 → 代码"方向，而 snack 提供"代码 → specs"反向同步。在实际开发中，Agent 完成多轮代码迭代后，代码已经写完但 specs 和 OPSX 未同步，需要快速生成文档而非从头规划。

当前约束：
- 必须复用 `spec-driven` schema，不能新增 schema 定义
- 必须纯 skill 实现，不能新增 TypeScript 组件或 CLI 命令
- 必须与现有 5 个工作流架构一致（manifest registry + skill template）
- verify freshness 检查已不依赖 `tasksFileHash`（commit 9364d2b），通过 `evidenceFingerprint` 间接检测

## Goals / Non-Goals

**Goals:**
- 提供代码优先的快速同步工作流，从 git diff 自动生成 specs 和 OPSX delta
- 支持多次调用更新同一 change，实现迭代友好的修正路径
- 复用现有基础设施（spec-driven schema、CLI 命令、OPSX 上下文加载）
- 输出包含快速路径（跳过 verify）和完整路径（包含 verify）
- 成为第 6 个核心工作流，与 propose/explore/apply/archive/bootstrap 平行

**Non-Goals:**
- 不替代 propose→apply 主流程（snack 是快速修正工具，不是主流程）
- 不提供深度代码分析或 AI 优化（定位于中层推断）
- 不自动执行 sync/archive（留给用户决策）
- 不新增 CLI 命令或 TypeScript 组件（纯 skill 实现）

## Decisions

### 决策 1：复用 spec-driven schema，不生成 tasks.md

**理由**：
- Verify freshness 检查已移除 `tasksFileHash`（commit 9364d2b），tasks.md 变化通过 `evidenceFingerprint` 间接检测
- tasks.md 缺失不影响 verify 正常工作
- 避免新增 schema 定义的复杂度

**替代方案**：
- 创建 snack-specific schema：增加代码量和维护负担
- 生成空 tasks.md：语义不清晰（代码已完成）

**选择**：复用 spec-driven，skill 指令明确不生成 tasks.md

### 决策 2：生成简化版 design.md

**理由**：
- tasks 依赖 design（schema 定义 `tasks.requires: [specs, design]`）
- 虽然不生成 tasks，但保持 artifact 链完整性
- design.md 记录反向推断的技术路径，标记 `[INFERRED FROM CODE]`

**替代方案**：
- 跳过 design：违反 schema 依赖关系
- 生成完整 design：与"代码已完成"语义不符

**选择**：生成简化版 design.md，内容最小化但结构完整

### 决策 3：中层语义推断 + 会话上下文

**理由**：
- 典型场景：用户与 Agent 多轮对话后调用 snack，会话上下文丰富
- 中层推断：分析函数签名/导出变化，结合会话上下文补充语义
- 标记 `[REVIEW NEEDED]` 不确定部分，提示用户审查

**替代方案**：
- 浅层映射：仅生成占位符，质量太低
- 深度分析：读取测试+代码，依赖强 LLM，不可靠

**选择**：中层推断，平衡质量与速度

### 决策 4：OPSX delta 启发式判断

**理由**：
- 纯实现变更（修改函数内部）不影响架构，跳过 OPSX delta
- 新增/删除 exports 或新增文件才是架构变更

**启发式规则**：
```typescript
if (hasNewExports || hasDeletedExports || hasNewFiles) {
  generateOpsxDelta(); // ADDED/REMOVED capabilities
} else {
  skip(); // 日志提示"未检测到架构级变更"
}
```

**替代方案**：
- 总是生成：噪音过多
- 询问用户：增加交互步骤

**选择**：启发式判断 + 日志提示

### 决策 5：WorkflowManifestRegistry 注册 snack

**理由**：
- 与现有 5 个工作流架构一致
- 通过 manifest registry 统一管理 skill 生成、command slugs、模式成员
- `modeMembership: ['core']` 使 snack 成为核心工作流

**实现**：
```typescript
{
  workflowId: 'snack',
  modeMembership: ['core'],
  skillDirName: 'openspec-snack',
  skillName: 'openspec-snack',
  commandSlug: 'snack',
  promptMeta: {
    name: 'Snack sync',
    description: 'Quick sync from code to specs',
  },
  getSkillTemplate: getSnackSkillTemplate,
  getCommandTemplate: getOpsxSnackCommandTemplate,
}
```

**影响**：init/update 安装 6 个工作流而非 5 个

## Risks / Trade-offs

### Risk 1: Specs 推断质量依赖会话上下文

**风险**：新会话中调用 snack，缺少上下文，specs 质量下降

**缓解**：
- 标记 `[REVIEW NEEDED]` 提示用户审查
- 输出提示包含修正路径（手动编辑 specs 或再次 snack）

### Risk 2: OPSX delta 启发式可能误判

**风险**：新增 private 函数被误判为新 capability

**缓解**：
- 启发式规则保守（只检测 exported symbols）
- 用户可手动调整 opsx-delta.yaml

### Risk 3: 跳过 verify 可能遗漏问题

**风险**：`--no-verify` 快速归档可能包含不一致

**缓解**：
- 输出提示包含完整 verify 路径，用户可选择
- 快速路径适用于低风险场景（开发中迭代）

### Trade-off: 不生成 tasks.md

**优点**：快速，符合"代码已完成"语义

**缺点**：无法用于 `/opsx:apply`，snack 生成的 change 不支持 apply 流程

**接受**：snack 定位为快速同步工具，不是 propose→apply 主流程的替代

## Migration Plan

无需迁移。snack 是新增工作流，不影响现有 5 个工作流。

**部署步骤**：
1. 实现 `getSnackSkillTemplate` 和 `getOpsxSnackCommandTemplate` 函数
2. 在 `WorkflowManifestRegistry.MANIFEST_ENTRIES` 添加 snack entry
3. 运行 `openspec update` 生成 snack skill 文件
4. 验证 skill 文件长度 ≤ 200 行

**回滚策略**：
- 从 manifest registry 移除 snack entry
- 删除生成的 `.claude/skills/openspec-snack/` 目录
- 运行 `openspec update` 清理残留

## Open Questions

无。设计已充分讨论，可以开始实现。
