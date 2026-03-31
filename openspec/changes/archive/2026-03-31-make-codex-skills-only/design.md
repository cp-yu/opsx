## Context

当前 OpenSpec 把 Codex 视为同时支持 skills 和 commands 的工具，因此在以下链路中都会继续尝试处理 Codex command 文件：

- `src/core/command-generation/` 仍注册了 Codex adapter，并把命令输出指向全局 `~/.codex/prompts/`
- `src/core/init.ts` / `src/core/update.ts` 用全局 delivery 决定是否生成 commands，没有工具级有效行为判断
- `src/core/profile-sync-drift.ts` / `src/core/migration.ts` 继续把 Codex commands 当作可检测配置
- 文档和测试仍宣称 Codex 会生成 command/prompt 文件

问题不只是“有个过时 adapter 没删掉”，而是系统把“全局 delivery 配置”和“单个工具真正支持的工作流承载面”混为一谈。直接删掉 Codex adapter 可以止血，但会把 Codex 的例外语义藏在缺失注册里，后续检测、汇总和迁移仍然容易继续出错。

## Goals / Non-Goals

**Goals:**

- 明确 Codex 的 OpenSpec 集成是 skills-only，不再生成或刷新任何 Codex command 文件
- 让 `init`、`update`、迁移和漂移检测都基于同一份工具能力事实作判断
- 保持实现简单，避免在多个模块散落 `toolId === 'codex'` 特判
- 保持路径处理跨平台安全，所有命令/技能路径继续通过 `path.join()` / `path.resolve()` 生成

**Non-Goals:**

- 不重做所有工具的 command-surface 体系
- 不改变其他 command-backed 工具的现有行为
- 不修改全局配置 schema，也不重新定义 delivery 的对外语义

## Decisions

### 1. 为工具元数据增加显式的 Codex command 支持声明

在 `AIToolOption` 上增加一个轻量字段，用来表达工具是否支持 adapter-backed commands。Codex 显式标记为不支持，其他工具沿用现有默认行为。

这样做的原因：

- 比“注册表里缺一个 adapter”更显式，事实源集中在 `src/core/config.ts`
- 比引入一个更大的 command-surface 枚举更收敛，符合这次 change 的目标
- 可以让 init/update/migration/drift detection 共享同一判断入口

备选方案：

- 只删除 Codex adapter：实现最少，但会把 Codex 的真实行为隐藏成“无 adapter 的偶然状态”，后续逻辑仍然脆弱
- 直接引入通用三态 command-surface 枚举：更完整，但超出这次只修 Codex 的范围

### 2. `init` / `update` 按“全局 delivery × 工具能力”计算 Codex 的有效行为

对 Codex 使用以下有效行为：

- `delivery=both` 或 `delivery=skills` 时：生成/刷新 skills，不生成 commands
- `delivery=commands` 时：仍保留 Codex skills 作为唯一受支持的工作流承载面，不删除这些 skills，也不尝试生成 commands

这样做的原因：

- 用户选择 Codex 的目的是获得可用的 OpenSpec 工作流，而不是得到一个空配置
- “Codex 已不支持 commands，拥抱 skills” 的用户意图对应的是 skills 继续作为有效表面
- 比在 `commands` 模式下直接失败更符合向后兼容和可用性

备选方案：

- `delivery=commands` 下直接报错：语义更硬，但会让 Codex 成为异常工具，用户还得手动切回 `skills`/`both`
- `delivery=commands` 下静默跳过 Codex：行为更差，最终配置不完整且难以理解

### 3. 删除 Codex command adapter，并同步清理检测与文档假设

Codex 不再有 adapter 后，需要同步更新：

- command adapter 注册表与 adapter 测试
- `workflow-installation` 中的计划产物计算
- `profile-sync-drift` / `migration` 中的 command 检测
- `docs/supported-tools.md` 等文档中的 Codex command 路径说明

这样做的原因：

- 只删生成逻辑不删检测逻辑，会留下永久性脏分支和错误漂移
- 只改代码不改文档，会继续误导用户以为 Codex 依赖全局 prompt 文件

## Risks / Trade-offs

- [Risk] `delivery=commands` 对 Codex 的实际行为变成“仍生成 skills”，与字面配置不完全一致
  → Mitigation: 在 init/update 输出和文档中明确说明 Codex 仅使用 skills

- [Risk] 只为 Codex 增加显式能力字段，未来如果再出现类似工具，可能还要继续扩展
  → Mitigation: 将判断入口集中成共享 helper；如果后续再出现第二个同类工具，再升级为更通用的 command-surface 模型

- [Risk] 删除 Codex adapter 后，现有命令统计与已配置工具检测可能出现回归
  → Mitigation: 为 init/update/migration/profile-sync 增加回归测试，覆盖 `delivery=both|skills|commands` 下的 Codex 行为
