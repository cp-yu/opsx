## Why

`openspec-snack` 生成的制品不读取 artifact 模板、生成后也不自检，导致目录名靠语义瞎猜、ADDED/MODIFIED 误判、proposal/spec/design 版式不合规（缺 `## Why`/`## What Changes`、缺 SHALL/MUST、缺 `#### Scenario:`），归档时必撞 `Validator.validateChangeDeltaSpecs()` 红线。而这些判定与版式规则本就存在于 `openspec instructions <id>` 的 instruction 投影中，snack 只是没用。

## What Changes

- **生成前读模板**：proposal/specs/design 各跑 `openspec instructions <id> --change "<name>" --json`，严格用返回的 `template` + `instruction` + `configProjection`，不自造章节、不重复发明 ADDED/MODIFIED/目录名判定规则（规则单一来源 = schema instruction）。
- **生成后自检**：写完跑 `openspec validate "<name>" --type change --json`，有 ERROR 跑一轮修复再验一次。
- 排除项：不在 snack 正文自建"扫 specs 目录 + 读 requirement 标题"判定流；不补 spec 的 capability 声明数据；不改 sweeper / validator / schema。

## Capabilities

### New Capabilities

（无）

### Modified Capabilities

- `snack-skill`: snack 在生成 proposal/specs/design 前读取 artifact 模板；生成后运行 validate 自检并修复。涉及 Specs 中层推断生成、Design 简化生成、输出提示三处行为变化，新增 Proposal 模板合规与生成后自检两类关注点。

## Impact

- `.claude/skills/openspec-snack/SKILL.md`：Flow 第 6-8 步（proposal/specs/design 生成）改为读模板，新增生成后 validate 自检步骤。
- 不影响 sweeper、validator、schema、TS 代码。
