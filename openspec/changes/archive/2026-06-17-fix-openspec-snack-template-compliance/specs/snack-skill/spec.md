## MODIFIED Requirements

### Requirement: Specs 中层推断生成

snack skill SHALL 在生成 specs 前运行 `openspec instructions specs --change "<name>" --json`，严格使用返回的 `template` 和 `instruction` 填充 delta spec。ADDED 与 MODIFIED 的判定、spec 目录名、MODIFIED requirement 标题逐字匹配，均 SHALL 遵循 `instruction` 投影中的规则（复用 `openspec/specs/<capability>/` 已有目录名或 proposal capability 名；新增关注点用 ADDED，改已有 requirement 行为用 MODIFIED 并保留原标题）。snack SHALL NOT 在 skill 正文中自建独立的判定流程，也 SHALL NOT 自造非模板章节。不确定的推断 SHALL 标记 `[REVIEW NEEDED]`。

#### Scenario: 生成前读取 specs 模板

- **WHEN** skill 进入 specs 生成步骤
- **THEN** 运行 `openspec instructions specs --change "<name>" --json`
- **AND** 使用返回的 `template`（含 `## ADDED Requirements`/`## MODIFIED Requirements`、`### Requirement:`、`#### Scenario:`、WHEN/THEN）作为输出结构
- **AND** 使用返回的 `instruction` 中的 ADDED/MODIFIED 判定与目录名规则
- **AND** 不在 skill 正文重复实现这些判定规则

#### Scenario: 生成新增 capability 的 spec

- **WHEN** 受影响 capability 在 `openspec/specs/<capability>/` 不存在，或主 spec 中无匹配的 requirement 标题
- **THEN** 创建 `specs/<capability>/spec.md`，包含 `## ADDED Requirements` section，使用 proposal 中的 kebab-case capability 名作为目录名
- **AND** requirement 文本 SHALL 包含 SHALL/MUST 规范性关键字
- **AND** 每个 requirement 至少包含一个 `#### Scenario:` block
- **AND** 不确定部分标记 `[REVIEW NEEDED]`

#### Scenario: 生成修改 capability 的 delta spec

- **WHEN** 受影响 capability 的 requirement 标题在 `openspec/specs/<capability>/spec.md` 中存在
- **THEN** 创建 `specs/<capability>/spec.md`（复用主 spec 已有目录名），包含 `## MODIFIED Requirements` section
- **AND** MODIFIED requirement 标题与主 spec 中已有标题逐字一致（whitespace-insensitive）
- **AND** requirement 文本 SHALL 包含 SHALL/MUST，至少一个 `#### Scenario:` block

### Requirement: Design 简化生成

snack skill SHALL 在生成 design 前运行 `openspec instructions design --change "<name>" --json`，保留返回 `template` 的全部章节骨架（Context / Goals / Non-Goals / Decisions / Risks / Trade-offs），内容从 git diff 反向推断并标记 `[INFERRED FROM CODE]`，不跳过章节骨架、不自造非模板章节。

#### Scenario: 生成 design.md

- **WHEN** specs 生成完成后
- **THEN** 运行 `openspec instructions design --change "<name>" --json`
- **AND** 创建 `design.md`，保留 `template` 的全部章节骨架
- **AND** Context、Goals / Non-Goals、Decisions 内容标记 `[INFERRED FROM CODE]`
- **AND** Risks / Trade-offs 标记 `[REVIEW NEEDED]` 提示用户补充
- **AND** 不自造 `## 目标` / `## 范围` 等非模板章节

### Requirement: 输出提示包含双路径

snack skill SHALL 在完成制品生成与自检后，输出提示信息，明确完成路径、修正路径与验证结果。

#### Scenario: 输出完成路径提示

- **WHEN** 制品生成与 validate 自检完成
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

#### Scenario: 输出 validate 自检结果

- **WHEN** `openspec validate` 运行完成
- **THEN** 输出 validate 最终结果：通过则提示已自检通过；仍有 ERROR/WARNING 则逐条列出并提示用户审查

## ADDED Requirements

### Requirement: Proposal 模板合规生成

snack skill SHALL 在生成 `proposal.md` 前运行 `openspec instructions proposal --change "<name>" --json`，严格使用返回的 `template`（`## Why` / `## What Changes` / `## Capabilities` / `## Impact`）与 `instruction` 填充，不自造非模板章节。`## Capabilities` 中的 capability 列表 SHALL 先于 specs 确定，作为 proposal 与 specs 的共同输入。

#### Scenario: 生成前读取 proposal 模板

- **WHEN** skill 进入 proposal 生成步骤
- **THEN** 运行 `openspec instructions proposal --change "<name>" --json`
- **AND** 使用返回的 `template` 章节结构填充 `proposal.md`
- **AND** 不自造 `## 目标` / `## 范围` 等非模板章节

#### Scenario: 先确定 capability 列表再生成 specs

- **WHEN** skill 生成 proposal 的 `## Capabilities` 部分
- **THEN** 先通过 code-map 反查与 git diff 推断确定 capability 短名列表
- **AND** 写入 proposal `## Capabilities` 后，用同一列表作为 specs 的目录名与判定输入
- **AND** code-map 无映射的文件推断结果标记 `[REVIEW NEEDED]`

### Requirement: 生成后 validate 自检

snack skill SHALL 在所有制品生成完成后运行 `openspec validate "<name>" --type change --json` 自检。当结果包含 ERROR 或 WARNING 时，skill SHALL 执行一轮修复并重新验证一次；仍残留的问题 SHALL 在输出中逐条披露。

#### Scenario: 自检通过

- **WHEN** `openspec validate` 返回无 ERROR/WARNING
- **THEN** skill 在输出中提示自检通过
- **AND** 不执行修复轮次

#### Scenario: 自检发现 ERROR 并修复

- **WHEN** `openspec validate` 返回 ERROR（如 MODIFIED 未命中主 spec、缺 SHALL/MUST、缺 scenario）
- **THEN** skill 执行一轮修复（依据 instruction 规则调整目录名/operation/标题/规范性关键字/scenario）
- **AND** 修复后重新运行 `openspec validate` 一次
- **AND** 残留问题在输出中逐条披露
