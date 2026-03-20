# Proposal: fix-bootstrap-and-completion-gaps

## Summary

修复 bootstrap 工作流中的 baseline 误判、mode 选择缺失、specs 未生成问题，以及 CLI 命令补全注册表的缺失。

## Problems

### P1: 空 specs 目录被误判为 specs-only
`detectBootstrapBaseline()` 仅检查 `openspec/specs/` 目录是否存在，空目录即触发 `specs-only`，导致后续行为全部偏移。

### P2: bootstrap init 只显示 full 选项
因 P1 误判为 `specs-only`，`getAllowedBootstrapModes('specs-only')` 只返回 `['full']`，用户无法选择 `opsx-first`。

### P3: full 模式只生成 OPSX，不生成 specs starter
`writeBootstrapSpecStarter()` 守卫条件为 `baseline_type !== 'no-spec'`，但 P1 导致 baseline 为 `specs-only`，starter 永远不创建。

### P4: baseline 命名不直观
`specs-only` / `no-spec` 对 bootstrap 用户不够直观，改为 `specs-based` / `raw`。

### P5: CLI 命令补全注册表缺失
`bootstrap`（含5个子命令）、`sync`、`new`（含子命令）、`status`、`instructions`、`templates`、`schemas` 均未注册到 `COMMAND_REGISTRY`。

## Approach

### Phase 1: Baseline 语义修复 + 命名重构 (P1 + P4)
- `detectBootstrapBaseline`: 空 specs 目录 → `raw`（检查目录下是否存在 `*/spec.md`）
- `inferLegacyBaselineType`: 同步修复
- 枚举值 `no-spec` → `raw`，`specs-only` → `specs-based`
- `parseBootstrapMetadata` 中加兼容映射（旧值 → 新值）
- 同步更新：`getBootstrapBaselineReason`、`getAllowedBootstrapModes`、`buildBootstrapPreInitStatus`、instructions 文案、schema templates、docs

### Phase 2: Specs starter 创建条件加固 (P3)
- `writeBootstrapSpecStarter` 判定改为：`mode === 'full'` 且当前仓库无既有 spec 内容（复用 Phase 1 的 helper）

### Phase 3: 补全注册表补齐 (P5)
- 在 `COMMAND_REGISTRY` 中新增缺失命令，镜像 `src/cli/index.ts` 的命令树结构

### Phase 4: 测试更新
- 更新 bootstrap 测试中的 baseline 断言
- 更新 PBT contract 测试
- 更新 e2e 测试

## Constraints

- `COMMAND_REGISTRY` 是 shell completion 唯一事实来源
- `formal-opsx` / `invalid-partial-opsx` 语义不变
- 已有 specs 内容只读，不覆盖
- `opsx-first` 不创建 specs starter
- 旧 `.bootstrap.yaml` 磁盘兼容（`no-spec` → `raw`，`specs-only` → `specs-based`）
- 不修改 archive 下的历史记录

## Success Criteria

1. 空 `openspec/specs/` 下 `bootstrap init` 显示 `full` + `opsx-first`
2. 空 specs + full promote → OPSX + specs starter
3. 有内容的 specs 目录 → `specs-based`，只允许 `full`
4. `openspec completion generate zsh` 包含所有 CLI 命令
5. 所有测试通过
