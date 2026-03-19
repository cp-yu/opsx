# Proposal: fix-todo-workflow-gaps

## 概述

修复并优化 todo/ 中记录的工作流缺陷，涵盖五个独立但相关的改进领域：standalone sync CLI、bootstrap 状态建模、bootstrap 命令面暴露、bootstrap init 交互优化、以及 OPSX 共享上下文统一。

## 变更内容

### 1. 新增顶层 `openspec sync` CLI

当前 sync 能力仅存在于两个入口：`/opsx:sync` skill（expanded 模式）和 `archive` 内联同步（core 模式）。缺少一个供 agent 直接调用的顶层 CLI 命令。

- 在 `src/cli/index.ts` 新增 `openspec sync [change-name]` 命令
- 复用 `src/core/change-sync.ts` 的 `assessChangeSyncState()` → `prepareChangeSync()` → `applyPreparedChangeSync()` 契约
- 无参数时交互选择 change（复用 archive 的 `selectChange` 模式）
- 无 delta specs 且无 `opsx-delta.yaml` 时输出 `no sync required` 并成功退出
- 不触发归档生命周期，仅执行同步

### 2. 统一 `--skip-specs` 语义说明

`--skip-specs` 的实际行为已扩展为"跳过全部 archive-time sync writes"（包括 main specs 和 OPSX），但 flag 名称和部分文案仍暗示仅跳过 spec 更新。

- 保持 flag 名称 `--skip-specs` 不变
- 统一 CLI help、archive 日志、spec 文档、workflow 模板中的语义描述为"skip all archive-time sync writes"
- 不改名，不新增别名

### 3. 重建 bootstrap domain-map 状态模型

当前 `readBootstrapState()` 在 `domain-map/*.yaml` 解析失败时静默跳过（`catch { /* skip invalid */ }`），导致 invalid 文件被误报为 missing。后续 `status`、`validate`、`review`、`promote` 均基于错误状态运行。

- 在 `BootstrapState` 中新增 `invalidDomainMaps: Map<string, { file: string; error: string }>` 字段
- `readBootstrapState()` 捕获解析异常后保留诊断信息而非丢弃
- `getBootstrapStatus()` 在 `DomainStatus` 中区分 `missing` / `invalid` / `valid`
- `validateGate('map_to_review')` 对 invalid domain-map 报告具体文件名与失败原因
- 当 map gate 未通过时，`deriveBootstrapArtifacts()` 不将 candidate/review 标记为 `current`；已有产物保留但标记为 `stale`

### 4. Bootstrap 命令面动态暴露

当前 `bootstrap-opsx` 在 `WORKFLOW_SURFACE_MANIFEST` 中 `modeMembership: []`，不属于任何 preset，init/update 不会生成对应命令面。

- 在 install planning 阶段检测 `openspec/bootstrap/` 目录是否存在
- 若存在，将 `bootstrap-opsx` 追加到当前 profile 的 workflow 列表中
- 通过现有 workflow/profile/install generation 链路实现，不旁路写文件
- `openspec update` 同样遵循此规则

### 5. Bootstrap init TTY-only 模式提问

当前 `bootstrap init` 未传 `--mode` 时默认 `full`，不区分交互/非交互环境。

- TTY 且未传 `--mode` 时：交互式提问，选项来自 `getAllowedBootstrapModes(baselineType)`
- non-TTY 且未传 `--mode` 时：fail fast，提示显式传 `--mode`
- 已传 `--mode` 时：行为不变

### 6. 统一 OPSX 共享上下文加载

当前 explore / propose / apply 对 OPSX 的利用深度不一致。explore 有 `OPSX_READ_CONTEXT` + `OPSX_NAVIGATION_GUIDANCE`；propose 仅在 opsx-delta 生成阶段才读 OPSX；apply 有 `OPSX_READ_CONTEXT` 但定位偏窄。

- 新增 `OPSX_SHARED_CONTEXT` fragment，统一三个模板的 OPSX 加载协议
- propose 在 artifact 生成循环开始前即加载 OPSX，用于约束 proposal 形成
- apply 和 explore 继续使用统一 fragment，保持一致
- 若 OPSX 三件套不存在，优雅降级，不报错

## 影响范围

- `src/cli/index.ts` — 新增 sync 命令
- `src/core/change-sync.ts` — 无修改，仅被新 CLI 复用
- `src/core/archive.ts` — `--skip-specs` 文案对齐
- `src/utils/bootstrap-utils.ts` — 状态模型重构、gate 逻辑、derived artifact 策略
- `src/commands/bootstrap.ts` — TTY 检测、mode 提问
- `src/core/workflow-surface.ts` — bootstrap 动态暴露逻辑
- `src/core/workflow-installation.ts` — install planning 检测 bootstrap 目录
- `src/core/templates/fragments/opsx-fragments.ts` — 新增 `OPSX_SHARED_CONTEXT`
- `src/core/templates/workflows/propose.ts` — 前置 OPSX 加载
- `src/core/templates/workflows/explore.ts` — 对齐统一 fragment
- `src/core/templates/workflows/apply-change.ts` — 对齐统一 fragment
- `openspec/specs/cli-archive/spec.md` — `--skip-specs` 语义对齐
- 相关测试文件

## 不在范围内

- 不重命名 `--skip-specs` 为 `--skip-sync`
- 不修改 `core` / `expanded` preset 的静态成员列表
- 不重构 OPSX instruction-loader 架构
- 不新增 sync skill（已存在）
