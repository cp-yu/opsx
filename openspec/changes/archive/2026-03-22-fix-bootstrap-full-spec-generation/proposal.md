## Why

当前 bootstrap 在 `raw` 基线下对 `full` 与 `opsx-first` 的语义定义，不符合目标产品合同。

现状是：

- `raw + full` 只写入正式 OPSX 三文件和一个 `openspec/specs/README.md` starter
- `raw + opsx-first` 只写入正式 OPSX，完全不生成 specs starter
- `specs-based + full` 虽然会保留已有 spec，但 `full` 本身并不具备“直接生成完整行为 specs”的能力

这导致 bootstrap 的“full”并不是真正的一次性完整初始化，而只是“OPSX + starter”。与预期的产品语义存在明显偏差：

- `full` 应该代表直接生成完整体：正式 OPSX + 完整合法 specs
- `opsx-first` 才应该代表先落 formal OPSX，specs 后补

同时，当前实现还存在一个结构性问题：bootstrap 只把 OPSX 当成 candidate artifact，而 specs 没有进入 candidate / review / fingerprint / stale 流程。若继续沿用该结构，即使把 `full` 改成“生成完整 specs”，也只能在 promote 时临时写入，绕过 review 与 stale 机制，合同上是不成立的。

## What Changes

### 1. 重新定义 `full` 与 `opsx-first` 的合同

在 `raw` 基线下：

- `full`：生成正式 OPSX + 每个 candidate capability 的合法正式 spec
- `opsx-first`：生成正式 OPSX + 仅 `openspec/specs/README.md`

在 `specs-based` 基线下：

- `full`：保留现有 specs，仅补缺失 capability 的 spec，若目标路径冲突则 fail-fast

### 2. 让 candidate specs 成为 bootstrap 的一等产物

bootstrap 的 derived artifacts 不再只有 candidate OPSX，还要包含 candidate specs tree。

这意味着：

- `validate` 同时刷新 candidate OPSX 和 candidate specs
- `review` 必须审核 candidate specs 的完整性与合法性
- `fingerprint` / `stale` 必须覆盖 specs 变化
- `promote` 只能写入已经审核过的 candidate specs，而不是现场生成

### 3. 为 spec 生成引入显式 source model

当前 `domain-map` 只有 capability ID、intent、relations、code refs，不足以生成合法 spec。

因此本次变更将要求 bootstrap 增加显式 spec-generation source data，用于表达：

- capability 对应的 purpose
- requirements
- scenarios
- 稳定的 capability-to-spec-folder 映射输入

这些数据必须进入 source fingerprint，保证 candidate 输出与 review stale 逻辑可信。

### 4. 明确保留策略与冲突处理

对于 `specs-based + full`：

- 不修改已有 spec 文件
- 仅补缺失 capability
- 目标 spec 路径已存在时直接失败，不做 merge，不做 overwrite

### 5. 同步修正所有合同面

以下面向用户和实现的合同面都必须同时更新：

- `src/utils/bootstrap-utils.ts`
- `src/commands/bootstrap.ts`
- `schemas/bootstrap/schema.yaml`
- `schemas/bootstrap/templates/*.md`
- `src/core/templates/workflows/bootstrap-opsx.ts`
- `docs/opsx-bootstrap.md`
- bootstrap 相关 OpenSpec specs
- unit / integration / e2e / PBT 测试

## Success Criteria

- [ ] `raw + full` promote 成功后，正式 OPSX 三文件与每个 candidate capability 对应的合法 `spec.md` 均存在
- [ ] `raw + opsx-first` promote 成功后，只写入正式 OPSX 三文件和 `openspec/specs/README.md`
- [ ] `specs-based + full` 不修改已有 spec，只补缺失，并在路径冲突时 fail-fast
- [ ] candidate specs 纳入 `validate` / `review` / `fingerprint` / `stale` 流程
- [ ] 所有 CLI / docs / templates / specs 对 `full` 与 `opsx-first` 的语义描述完全一致
- [ ] 增加单元、集成、e2e、PBT 以及 Windows 路径相关验证覆盖

## Out of Scope

- 将 `opsx-first` 重命名为 `opsx-only`
- 为 bootstrap 增加自动推断复杂业务需求的泛化 spec 编写能力
- 在 `specs-based` 仓库中自动 merge 或重写已有 spec
- 通过 promote-only 临时生成 specs 来规避 candidate/review 流程

## Impact

- `src/utils/bootstrap-utils.ts`：candidate specs、starter 语义、promote 行为、fingerprint/stale 扩展
- `src/commands/bootstrap.ts`：help、instructions、status 文案与模式合同更新
- `schemas/bootstrap/schema.yaml` 与模板：bootstrap 流程生成指引更新
- `src/core/templates/workflows/bootstrap-opsx.ts`：workflow guidance 同步更新
- `docs/opsx-bootstrap.md`：用户文档合同修正
- `openspec/specs/bootstrap*.md`：主 specs 行为合同修正
- `test/**`：覆盖 full completeness、opsx-first exclusivity、preserve-only、stale coherence 与跨平台路径行为
