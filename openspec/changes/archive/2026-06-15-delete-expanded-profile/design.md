## Context

当前系统存在三层 profile 架构：
- **core** - 4 个核心工作流（propose, explore, apply, archive）
- **expanded** - 11 个工作流（core + 7 个额外工作流）
- **custom** - 用户手动选择

Profile 系统涉及：
- 全局配置存储（`~/.config/openspec/config.json`）
- 工作流解析逻辑（`getProfileWorkflows()`）
- CLI 命令（`openspec config profile`）
- Manifest registry 的 `modeMembership` 字段

**现状问题**：
- expanded 模式的 7 个工作流无实际使用场景
- Profile 选择增加配置复杂度
- `modeMembership` 语义不清（既是 profile 成员，又想作为 tag）

**约束**：
- 无 expanded 用户，可激进删除
- `modeMembership` 需保留，用于未来扩展
- CLI 命令层（verify, sync 等）需保留，作为编程接口
- bootstrap-opsx 独立于 core，需特殊处理

## Goals / Non-Goals

**Goals:**
- 删除 profile 三层架构（core/expanded/custom）
- 删除 7 个 expanded 专属工作流及其所有代码
- 固定安装 5 个工作流，无需用户配置
- `modeMembership` 转变为纯 tag 系统
- 升级时自动清理过时配置字段
- 保留底层 CLI 命令作为编程接口

**Non-Goals:**
- 不删除底层 CLI 命令（openspec verify, openspec sync 等）
- 不影响 bootstrap-opsx 工作流
- 不增强 CLI 编程友好性（另一个 task）
- 不编写 CLI 编程文档（另一个 task）

## Decisions

### Decision 1: 完全删除 profile 系统 vs 保留但简化

**选择**: 完全删除 `profile` 和 `workflows` 字段

**理由**:
- 无存量用户，无兼容包袱
- 保留伪灵活性反而增加理解成本
- `modeMembership` 作为 tag 已足够未来扩展

**替代方案**（已拒绝）:
- 保留 `profile` 字段但忽略其值 → 死字段，更混乱
- 保留 `custom` 模式 → 增加复杂度，与目标冲突

### Decision 2: `modeMembership` 处理

**选择**: 保留 `modeMembership`，作为 workflow 标签系统

**当前值设置**:
```typescript
// 4 个核心工作流
modeMembership: ['core']

// bootstrap 独立工作流
modeMembership: []
```

**未来扩展**:
```typescript
// 多标签示例
modeMembership: ['core', 'scripting', 'experimental']
```

**理由**:
- 标签系统比 profile 更灵活
- 为未来分组（如 CLI 编程工作流组）预留扩展点
- 不需要复杂的 profile 解析逻辑

### Decision 3: 工作流安装策略

**选择**: 固定安装 5 个工作流，从 manifest registry 自动获取

**实现**:
```typescript
// Before
function getProfileWorkflows(profile, customWorkflows) {
  if (profile === 'custom') return normalizeWorkflowIds(customWorkflows);
  if (profile === 'expanded') return EXPANDED_WORKFLOWS;
  return CORE_WORKFLOWS;
}

// After
function getDefaultWorkflows(): readonly WorkflowId[] {
  return WorkflowManifestRegistry.entries.map(e => e.workflowId);
}
```

**理由**:
- 单一真相来源（manifest registry）
- 无需维护 CORE_WORKFLOWS / EXPANDED_WORKFLOWS 常量
- 自动包含 registry 中的所有工作流

### Decision 4: 配置清理策略

**选择**: `openspec update` 时自动检测并清理过时字段

**实现**:
```typescript
// 升级检测逻辑
const config = getGlobalConfig();
if ('profile' in config || 'workflows' in config) {
  console.warn('检测到过时配置字段：profile/workflows');
  delete config.profile;
  delete config.workflows;
  saveGlobalConfig(config);
  console.log('已自动清理过时字段');
}
```

**理由**:
- 用户体验友好，无需手动编辑配置
- 警告消息提供透明度
- 避免配置文件中的死字段

### Decision 5: 文件删除范围

**删除文件**（通过 manifest 常量跟踪）:
```typescript
// src/core/templates/workflows/
const REMOVED_WORKFLOWS = [
  'new-change.ts',
  'continue-change.ts',
  'ff-change.ts',
  'verify-change.ts',
  'sync-specs.ts',
  'bulk-archive-change.ts',
  'onboard.ts'
];
```

**删除 manifest entries**（从 registry.ts）:
```typescript
const REMOVED_MANIFEST_IDS = [
  'new', 'continue', 'ff', 'verify', 
  'sync', 'bulk-archive', 'onboard'
];
```

**删除测试文件**（通过文件名匹配）:
```typescript
const REMOVED_TEST_PATTERNS = [
  'test/core/profiles.test.ts',
  'test/commands/config-profile.test.ts',
  'test/core/templates/workflows/{new,continue,ff,verify,sync,bulk-archive,onboard}-*.test.ts'
];
```

**理由**:
- 使用常量明确跟踪删除项，避免遗漏
- 符合规则："If we generate it, we track it by name in a constant"

### Decision 6: `profiles.ts` 处理

**选择**: 完全删除 `src/core/profiles.ts`

**理由**:
- `getProfileWorkflows()` 不再需要
- `CORE_WORKFLOWS` / `EXPANDED_WORKFLOWS` 常量不再需要
- 所有工作流逻辑直接从 `workflow-surface.ts` 获取

**受影响导入**:
```typescript
// 需要更新这些文件的导入语句
// src/core/init.ts
// src/core/update.ts
// src/commands/config.ts
```

## Risks / Trade-offs

### Risk 1: 破坏性变更影响未知用户

**风险**: 虽然确认无 expanded 用户，但可能有未知的 custom 用户

**缓解**:
- `openspec update` 自动清理配置字段并输出清晰提示
- 变更日志明确标注 BREAKING CHANGE
- 错误消息友好，指导用户操作

### Risk 2: 文档大面积过时

**风险**: README、migration guide、specs 等大量文档提到 profile

**缓解**:
- 本次变更一并更新所有文档
- Spec 修改列表：`cli-init`, `cli-update`, `cli-config`, `global-config`, `profiles`
- 删除 `profiles` spec 或大幅简化

### Risk 3: `modeMembership` 语义变化可能引入混淆

**风险**: 从 "profile 成员" 到 "tag" 的语义转变可能不清晰

**缓解**:
- 代码注释明确说明 tag 语义
- 未来扩展时优先使用多标签，强化 tag 概念
- 文档中避免提及旧的 profile 语义

### Risk 4: 测试覆盖率下降

**风险**: 删除 40%+ 代码后，整体测试覆盖率可能下降

**缓解**:
- 保留核心工作流的所有测试
- 更新测试验证固定安装逻辑
- CI 确保测试通过后才合并

### Trade-off 1: 灵活性 vs 简单性

**牺牲**: 用户不能选择只安装部分工作流

**获得**: 极简配置，无需理解 profile 概念

**判断**: 简单性优先。未来如需灵活性，可通过 CLI 编程方式实现。

### Trade-off 2: 7 个高级工作流的便利性 vs 架构清晰度

**牺牲**: `new`, `continue`, `ff`, `verify`, `sync`, `bulk-archive`, `onboard` 的快捷方式

**获得**: 
- 更清晰的工作流边界
- 为 CLI 编程方式让路
- 减少 40%+ 模板代码和测试

**判断**: CLI 命令层（`openspec verify`, `openspec sync`）保留，用户可通过脚本实现相同功能。
