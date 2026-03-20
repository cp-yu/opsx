# Tasks: fix-bootstrap-and-completion-gaps

## Phase 1: Baseline 语义修复 + 命名重构

- [x] 1.1 在 `src/utils/bootstrap-utils.ts` 新增 `hasRealSpecContent(projectRoot)` helper，检查 `openspec/specs/*/spec.md` 是否存在
- [x] 1.2 修改 `BOOTSTRAP_BASELINE_TYPES` 枚举：`no-spec` → `raw`，`specs-only` → `specs-based`
- [x] 1.3 新增 `BaselineTypeDiskSchema`（z.enum + transform），接受旧值 `no-spec`/`specs-only` 并映射为新值；替换 `BootstrapMetadataDiskSchema` 中的 baseline_type 字段
- [x] 1.4 修改 `detectBootstrapBaseline()`：用 `hasRealSpecContent` 替代 `directoryExists`，返回 `raw`/`specs-based`
- [x] 1.5 修改 `inferLegacyBaselineType()`：同 1.4 逻辑
- [x] 1.6 更新 `getAllowedBootstrapModes()`：`raw` → `['full', 'opsx-first']`，`specs-based` → `['full']`
- [x] 1.7 更新 `getBootstrapBaselineReason()`：文案对应新命名
- [x] 1.8 更新 `buildBootstrapPreInitStatus()`：文案对应新命名
- [x] 1.9 更新 `src/commands/bootstrap.ts` 中 `getPreInitInstructions`、`getPhaseInstructions`、`printBootstrapStatus` 的 baseline 文案
- [x] 1.10 更新 `src/core/templates/workflows/bootstrap-opsx.ts` 中的 baseline 文案

## Phase 2: Specs Starter 条件加固

- [x] 2.1 修改 `writeBootstrapSpecStarter()`：guard 从 `baseline_type !== 'no-spec'` 改为 `await hasRealSpecContent(projectRoot)`

## Phase 3: 补全注册表补齐

- [x] 3.1 在 `src/core/completions/command-registry.ts` 的 `COMMAND_REGISTRY` 中新增 `sync` 命令（positional: change-id, flag: --no-validate）
- [x] 3.2 新增 `status` 命令（flags: --change, --schema, --json）
- [x] 3.3 新增 `instructions` 命令（positional: artifact, flags: --change, --schema, --json）
- [x] 3.4 新增 `templates` 命令（flags: --schema, --json）
- [x] 3.5 新增 `schemas` 命令（flag: --json）
- [x] 3.6 新增 `new` 命令及 `change` 子命令（positional: name, flags: --description, --schema）
- [x] 3.7 新增 `bootstrap` 命令及 5 个子命令（init/status/instructions/validate/promote），镜像 CLI 注册的 flags

## Phase 4: Schema/Template/Docs 更新

- [x] 4.1 更新 `schemas/bootstrap/schema.yaml` 中的 baseline 类型值
- [x] 4.2 更新 `schemas/bootstrap/templates/init.md` 中的 baseline 文案
- [x] 4.3 更新 `schemas/bootstrap/templates/promote.md` 中的 baseline 文案
- [x] 4.4 更新 `docs/opsx-bootstrap.md` 中的 baseline 命名
- [x] 4.5 更新 `openspec/specs/bootstrap-init-ux/spec.md` 中的 baseline 引用

## Phase 5: 测试更新

- [x] 5.1 更新 `test/commands/bootstrap.test.ts`：所有 `no-spec`/`specs-only` 断言改为 `raw`/`specs-based`
- [x] 5.2 更新 `test/cli-e2e/bootstrap-phase1.test.ts`：同上
- [x] 5.3 更新 `test/cli-e2e/bootstrap-lifecycle.test.ts`：同上，并验证空 specs 目录场景
- [x] 5.4 更新 `test/utils/bootstrap-utils.pbt.contract.test.ts`：PBT baseline 分支更新

## Phase 6: 验证

- [x] 6.1 运行 `pnpm test` 确认所有测试通过
- [x] 6.2 运行 `pnpm build` 确认编译通过
