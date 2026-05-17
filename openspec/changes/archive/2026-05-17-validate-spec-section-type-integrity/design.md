## Context

`Validator.validateChangeDeltaSpecs(changeDir)` 当前只做 change spec 内部的结构校验（重复名、SHALL/MUST 文本、Scenario 块数量）。它不读取主 spec，因此无法检测 section-type 与主 spec header 存在性之间的不一致。

`buildUpdatedSpec()` 在 sync 阶段执行时才做这个检查，但此时 verify 已完成。修复 spec 会使 evidence fingerprint 失效，强制重跑完整 verify 流程。

涉及文件：
- `src/core/validation/validator.ts` — `validateChangeDeltaSpecs()` 方法
- `src/core/parsers/requirement-blocks.ts` — `parseDeltaSpec()`, `extractRequirementsSection()`

## Goals / Non-Goals

**Goals:**
- 在 `validateChangeDeltaSpecs()` 中增加主 spec 交叉验证，使 `openspec validate --type change` 能在 propose 阶段暴露 section-type 错误
- ERROR 级别，与 sync 阶段的 hard throw 语义一致

**Non-Goals:**
- 不修改 sync 阶段的 `buildUpdatedSpec()` 逻辑（它仍然是最终防线）
- 不修改 `parseDeltaSpec()` 的解析逻辑
- 不增加新的 CLI 子命令或 flag

## Decisions

### Decision 1: 从 `changeDir` 推导 `mainSpecsDir`

**选择**: `path.resolve(changeDir, '../../specs')` 推导主 spec 目录

**理由**: 项目结构固定（`openspec/changes/<name>/` 和 `openspec/specs/` 同级于 `openspec/`）。无需修改方法签名或调用方。

**替代方案**:
- 增加 `mainSpecsDir` 参数 — 需要修改所有调用方，过度设计
- 从 `projectRoot` 参数推导 — 需要新增参数，同样过度

### Decision 2: 主 spec 不存在时的处理

**选择**: 主 spec 不存在时，ADDED 合法，MODIFIED/REMOVED/RENAMED 报 ERROR

**理由**: 如果主 spec 不存在，说明这是一个全新的 capability。此时只有 ADDED 有意义。MODIFIED/REMOVED/RENAMED 引用了不存在的目标，属于错误。

### Decision 3: 使用 `normalizeRequirementName()` 做 header 匹配

**选择**: 复用现有的 `normalizeRequirementName()` 做大小写和空白不敏感匹配

**理由**: 与 `buildUpdatedSpec()` 中的匹配逻辑一致，避免因大小写差异导致 validate 通过但 sync 失败。

## Risks / Trade-offs

- [validate 阶段多一次主 spec 读取] → 每个 change spec 对应一次 `fs.readFile`，开销可忽略
- [主 spec 在 validate 和 sync 之间被修改] → 极端情况下 validate 通过但 sync 仍失败；可接受，因为这是 race condition 而非系统性缺陷
