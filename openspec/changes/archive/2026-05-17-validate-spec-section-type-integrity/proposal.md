## Why

`validateChangeDeltaSpecs()` 当前只做结构校验（重复名、SHALL/MUST 文本、Scenario 块），不与主 spec 做交叉验证。导致 change spec 中 `## MODIFIED Requirements` 引用了主 spec 中不存在的 header 时，错误直到 sync/archive 阶段的 `buildUpdatedSpec()` 才暴露。此时 verify 已完成，修复 spec 会使 fingerprint 失效，强制重跑整个 verify（reviewer + optimizer subagent），代价高昂。

## What Changes

- 在 `Validator.validateChangeDeltaSpecs()` 中增加 section-type 交叉验证：读取对应主 spec，检查 MODIFIED/REMOVED/RENAMED 的 requirement header 是否存在于主 spec，检查 ADDED 的 requirement header 是否已存在于主 spec
- 交叉验证失败时报 ERROR 级别，阻塞 propose 阶段的 post-propose validation

## Capabilities

### New Capabilities
- `validate-spec-section-type-cross-check`: 在 change delta spec 验证中增加 section-type 与主 spec header 存在性的交叉验证

### Modified Capabilities
- `cli-validate`: 扩展 `validateChangeDeltaSpecs` 的验证范围，增加主 spec 交叉引用检查

## Impact

- 文件: `src/core/validation/validator.ts` — `validateChangeDeltaSpecs()` 方法增加交叉验证逻辑
- 需要传入 `mainSpecsDir` 参数（或从 `changeDir` 推导）以读取主 spec
- 影响 `openspec validate "<name>" --type change` 的输出（新增 ERROR 类型）
- 间接影响 propose 阶段的 post-propose validation（已调用 `openspec validate --type change`）
