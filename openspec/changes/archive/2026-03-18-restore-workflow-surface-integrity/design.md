## Context

OpenSpec 当前已经具备大部分所需能力，但 workflow surface 的定义分散在多个位置：

- `profiles.ts` 定义 workflow 集合
- `tool-detection.ts` 定义 skill / command 相关映射
- `skill-generation.ts` 定义模板投影
- `init.ts` / `update.ts` 各自根据配置生成与清理
- `profile-sync-drift.ts` 单独进行存在性与漂移判断
- `archive-change` 模板与 `archive.ts` 的真实归档语义并不一致
- 文档将 expanded 描述为用户概念，但代码里没有与之对应的一等 preset

结果是：workflow identity、mode semantics、生成物集合、archive/sync 关系和用户可见 surface 之间缺少单一真相源。

## Goals / Non-Goals

**Goals:**
- 将 `core` 与 `expanded` 固定为一等模式语义
- 用单一 manifest 统一 workflow surface metadata
- 让 `init` / `update` / migration / drift 共享同一 planning 逻辑
- 让普通模式下 archive 自动完成 delta specs 与 `opsx-delta` 同步
- 让拓展模式继续暴露独立 `sync` surface
- 让 CLI、skills、commands、docs、specs 使用一致契约
- 保��跨平台路径安全与显式映射约束

**Non-Goals:**
- 不重新设计 bootstrap 生命周期
- 不将 `bootstrap-opsx` 自动并入 expanded 默认集
- 不将 `config profile` 的应用方式改成默认直接内部执行 update
- 不为旧的分散内部模型保留长期兼容层
- 不在这次 change 中引入新的 schema 系统或 project-local config 模型

## Decisions

### 1. 将 `expanded` 设为正式 preset

**Decision:**
`expanded` 固定定义为：

- `propose`
- `explore`
- `apply`
- `archive`
- `new`
- `continue`
- `ff`
- `verify`
- `sync`
- `bulk-archive`
- `onboard`

`bootstrap-opsx` 不自动包含在 expanded 中。

**Rationale:**
- 文档已有 expanded 概念，但代码没有正式 preset，语义漂移已经存在
- 用户已确认 expanded 应为 “core + 扩展 workflows”
- 将 expanded 一等化可以消除 init/config/docs/test 对模式集合的重复解释

### 2. 引入单一 Workflow Surface Manifest

**Decision:**
建立单一 workflow manifest，统一承载至少以下字段：

- `workflowId`
- `modeMembership`
- `skillDirName`
- `skillName`
- `commandSlug`
- `skillTemplateFactory`
- `commandTemplateFactory`
- `promptMeta`
- `defaultVisibility`

其他模块只消费投影，不再维护独立 workflow 列表或映射常量。

**Rationale:**
- 当前的 registry 是碎片化的
- 任何新增或修改 workflow 都要求多处同步，极易再次出现回归
- manifest 是恢复 surface integrity 的最小统一抽象

### 3. 使用共享 install planning

**Decision:**
引入共享 planning helper，根据：

- selected mode / workflows
- delivery
- tool capability

统一计算期望产物集合。`init`、`update`、migration scan、drift detection 均复用该 helper。

**Rationale:**
- 当前相同配置在不同入口由不同代码路径解释
- 共享 planning 可以把“生成、检测、清理”统一到同一逻辑源上
- 有利于后续继续收敛 tool capability 差异

### 4. 普通模式下 archive 内嵌完整 sync

**Decision:**
在普通模式下：

- 不暴露独立 `sync` surface
- `archive` 自动完成：
  - delta specs sync
  - `opsx-delta` sync
- sync 与 archive 的行为由统一 `ChangeSyncState` 驱动，而不是由模板文案决定

**Rationale:**
- 用户已确认普通模式希望“包裹在 archive 中”
- 现有 `/opsx:archive` 规格仍依赖外部 `/opsx:sync`，与目标 UX 冲突
- `specs-sync-skill` 已明确 sync 包括 OPSX，同步语义必须完整迁移进 archive

### 5. 拓展模式保留独立 sync surface

**Decision:**
在 expanded 模式下，保留独立 `sync` command / skill，继续作为显式用户入口。

**Rationale:**
- expanded 用户需要细粒度 workflow control
- 保留独立 sync 可以支持 archive 前显式同步、单独修复 delta、调试同步状态等高级路径
- 与普通模式形成清晰差异化

### 6. 配置修改后继续提示 `openspec update`

**Decision:**
保留当前契约：

- `config profile` 写全局配置
- 若在 OpenSpec 项目中，提示是否应用到当前项目
- 未立即应用时继续提示运行 `openspec update`

**Rationale:**
- 用户已明确选择保留此产品行为
- 这次 change 的重点是恢复 surface integrity，而不是重做 config 应用模型

### 7. 保持 `--skip-specs` 名称，但扩大其行为语义

**Decision:**
短期保持 `openspec archive --skip-specs` 这个 flag 名称不变，但其语义定义为：跳过所有 archive-time sync writes，包括：

- main specs sync
- OPSX sync

**Rationale:**
- 避免在这次修复中扩大 CLI surface
- 避免出现“跳过 spec 同步但仍写入 OPSX”这类半同步语义
- 让 CLI archive 与普通模式 archive skill 的行为边界保持一致

## Risks / Trade-offs

- **[Risk] manifest 改动面广** → **Mitigation:** 保留现有外部导出接口，由 manifest 派生，降低调用点改名成本
- **[Risk] archive 自动同步引入副作用扩大** → **Mitigation:** 将 `ChangeSyncState` 与失败零副作用规则写入 specs，并补原子性测试
- **[Risk] expanded 一等化后与旧 custom 语义冲突** → **Mitigation:** 明确 `expanded` 为固定 preset，其他组合仍归入 custom
- **[Risk] CLI archive 与 agent archive 再次分叉** → **Mitigation:** 两者都依赖统一 sync-state 约束，不允许仅在模板中表达行为
- **[Risk] 跨平台路径回归** → **Mitigation:** 所有路径生成继续强制使用 `path.join()` / `path.resolve()`，并增加 Windows path assertions
