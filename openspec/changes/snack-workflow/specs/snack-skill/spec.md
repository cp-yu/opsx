---
capabilities:
  - cap.ai.snack-skill
---

## ADDED Requirements

### Requirement: snack skill 基本流程

snack skill SHALL 提供代码优先的轻量级同步工作流，从 git diff 自动生成 specs 和 OPSX delta。

#### Scenario: 首次调用 snack 创建 change

- **WHEN** 用户在完成代码修改后调用 `/opsx:snack <change-name>`
- **THEN** skill 执行以下步骤：
  1. 运行 `openspec new change "<name>" --schema spec-driven` 创建 change
  2. 运行 `git diff` 获取修改文件列表
  3. 读取 `openspec/project.opsx.code-map.yaml` 反查文件路径对应的 capabilities
  4. 生成 `proposal.md`（轻量级，记录变更范围）
  5. 生成 `specs/<capability>/spec.md`（中层推断 + 会话上下文）
  6. 生成 `design.md`（简化版，反向推断）
  7. 启发式判断是否生成 `opsx-delta.yaml`
  8. 输出提示（完成路径 vs 修正路径）

#### Scenario: 更新已有 change

- **WHEN** 用户对已有 change 再次调用 `/opsx:snack <change-name>`
- **THEN** skill 更新该 change 的 specs 和 opsx-delta，不重复创建 proposal

#### Scenario: 无 change-name 参数时检测 active change

- **WHEN** 用户调用 `/opsx:snack` 不带参数
- **THEN** skill 运行 `openspec list --json` 检测当前 active change，如果存在则使用该 change，否则提示用户指定 change 名称

### Requirement: OPSX 上下文加载

snack skill SHALL 在生成制品前读取 `openspec/project.opsx.yaml`，复用 explore/propose/apply 的共享 OPSX 上下文加载逻辑。

#### Scenario: 读取 OPSX 项目架构

- **WHEN** skill 开始生成制品
- **THEN** 检查 `openspec/project.opsx.yaml` 是否存在，如果存在则读取 `project:` block（intent、scope）和 domains → capabilities 结构作为导航上下文

### Requirement: Git diff 分析

snack skill SHALL 通过 `git diff` 命令分析代码变更，获取修改文件列表，排除非代码文件。

#### Scenario: 获取修改文件列表

- **WHEN** skill 分析代码变更
- **THEN** 运行 `git diff --name-only` 获取修改文件路径列表，排除 `.md`、`.json`、`.yaml` 等非代码文件

### Requirement: Code-map 反查

snack skill SHALL 通过读取 `openspec/project.opsx.code-map.yaml`，将修改文件路径映射到受影响的 capabilities。

#### Scenario: 文件路径映射到 capabilities

- **WHEN** skill 获得修改文件列表后
- **THEN** 读取 `openspec/project.opsx.code-map.yaml`，查找每个文件路径对应的 capability ID，构建受影响 capabilities 列表

### Requirement: Specs 中层推断生成

snack skill SHALL 结合 git diff、会话上下文和代码分析，使用中层语义推断生成 BDD specs，标记不确定部分为 `[REVIEW NEEDED]`。

#### Scenario: 生成新增 capability 的 spec

- **WHEN** code-map 反查检测到新增 capability
- **THEN** 创建 `specs/<capability>/spec.md`，包含：
  1. YAML frontmatter 声明 `capabilities: [cap.id]`
  2. `## ADDED Requirements` section
  3. 推断的 Requirement 和 Scenario（BDD 格式）
  4. 不确定部分标记 `[REVIEW NEEDED]`

#### Scenario: 生成修改 capability 的 delta spec

- **WHEN** code-map 反查检测到已有 capability 被修改
- **THEN** 创建 `specs/<capability>/spec.md`，包含 `## MODIFIED Requirements` section，推断行为变化

### Requirement: Design 简化生成

snack skill SHALL 生成简化版 `design.md`，从 git diff 反向推断技术路径，标记推断部分为 `[INFERRED FROM CODE]`。

#### Scenario: 生成 design.md

- **WHEN** specs 生成完成后
- **THEN** 创建 `design.md`，包含：
  1. **Context**: 从 git diff 推断的变更背景
  2. **Decisions**: 标记 `[INFERRED FROM CODE]` 的实现路径（新增模块、技术选型）
  3. **Risks / Trade-offs**: 标记 `[REVIEW NEEDED]` 提示用户补充
  4. **Open Questions**: "无（代码已实现）"

### Requirement: OPSX delta 启发式生成

snack skill SHALL 使用启发式规则判断是否生成 `opsx-delta.yaml`，仅在检测到架构变更时生成。

#### Scenario: 检测到新增 exports 时生成 ADDED capability

- **WHEN** git diff 显示新增导出函数或类
- **THEN** 生成 `opsx-delta.yaml`，包含 `ADDED` section 声明新 capability 节点和 relations

#### Scenario: 检测到删除 exports 时生成 REMOVED capability

- **WHEN** git diff 显示删除导出函数或类
- **THEN** 生成 `opsx-delta.yaml`，包含 `REMOVED` section 声明删除的 capability

#### Scenario: 仅修改函数实现时跳过 OPSX delta

- **WHEN** git diff 仅显示函数内部实现变化，无 exports 新增/删除
- **THEN** 不生成 `opsx-delta.yaml`，在输出中提示 "未检测到架构级变更，跳过 OPSX delta 生成"

### Requirement: 不生成 tasks.md

snack skill SHALL 明确不生成 `tasks.md`，因为代码已完成，无需任务分解。

#### Scenario: 跳过 tasks.md 生成

- **WHEN** 所有 specs 和 design 生成完成后
- **THEN** 不创建 `tasks.md` 文件，skill 流程直接进入输出提示阶段

### Requirement: 输出提示包含双路径

snack skill SHALL 在完成制品生成后，输出提示信息，明确完成路径和修正路径。

#### Scenario: 输出完成路径提示

- **WHEN** 制品生成完成
- **THEN** 输出包含：
  - "快速路径（跳过 verify）："
  - "  • 继续开发: `openspec sync \"<change-name>\" --no-verify`"
  - "  • 快速归档: `openspec archive \"<change-name>\" --no-verify`"

#### Scenario: 输出修正路径提示

- **WHEN** 制品生成完成
- **THEN** 输出包含：
  - "⚠️  生成的 specs 基于代码推断，建议审查标记 [REVIEW NEEDED] 的内容"
  - 修正分支 1："审查 change → 手动编辑 specs → sync → archive"
  - 修正分支 2："审查 change → 修改代码 → 再次 `/opsx:snack` → 继续迭代"
