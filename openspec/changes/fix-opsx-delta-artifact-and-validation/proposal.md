## Why

`opsx-delta.yaml` 生成流程存在三个连锁缺陷：提示词歧义导致 LLM 输出 Markdown 风格的非法 YAML；该文件不是正式 artifact，缺失模板和结构化指引；post-propose 验证缺少与 sync 同等水平的 OPSX dry-run merge 校验能力。

## What Changes

- **提示词修复**: `OPSX_GENERATE_DELTA` 片段和 propose/ff-change 模板增加具体的 YAML 结构示例，明确 ADDED/MODIFIED/REMOVED 是 YAML object key 而非 Markdown heading
- **opsx-delta 正式化为 artifact**: 在 `schemas/spec-driven/schema.yaml` 中注册 `opsx-delta` artifact，创建模板文件 `templates/opsx-delta.yaml`，纳入 artifact 依赖图但不阻塞 apply
- **validate 命令补全 OPSX 校验**: `Validator` 新增 `validateOpsxDelta()` 方法，执行 dry-run merge + referential integrity + code-map integrity 校验；`validate --type change` 自动并行执行

## Capabilities

### New Capabilities
- `opsx-delta-artifact`: opsx-delta 作为正式 schema artifact，拥有 template 和 instruction，通过 `openspec instructions opsx-delta` 提供结构化生成指引
- `validate-opsx-dry-run`: `openspec validate --type change` 自动对 opsx-delta.yaml 执行 dry-run merge 校验，检查 Zod schema 解析、引用完整性和 code-map 完整性

### Modified Capabilities
- `opsx-propose-skill`: 步骤 4d 改用 artifact 系统的 `openspec instructions` 获取 YAML 结构模板；post-propose 验证改用程序化 CLI 替代手动 dry-run
- `ai-workflow-templates`: `OPSX_GENERATE_DELTA` 和 `OPSX_POST_PROPOSE_VALIDATION` 片段更新为包含具体 YAML 示例和 CLI 命令引用
- `opsx-delta-merge`: 无功能变更，但 `validateOpsxDelta` 复用了 `applyOpsxDelta` + `validateReferentialIntegrity` + `validateCodeMapIntegrity` 的 dry-run 语义

## Impact

- `schemas/spec-driven/schema.yaml` — 新增 artifact 条目
- `schemas/spec-driven/templates/opsx-delta.yaml` — 新建模板文件
- `src/core/templates/fragments/opsx-fragments.ts` — 更新两个片段
- `src/core/templates/workflows/propose.ts` — 更新步骤 4d
- `src/core/templates/workflows/ff-change.ts` — 更新步骤 4d
- `src/core/validation/validator.ts` — 新增 `validateOpsxDelta()` 方法
- `src/commands/validate.ts` — 并行调用 spec + opsx 验证
- `test/core/templates/propose-template.test.ts` — 更新断言
- `test/core/validation.test.ts` — 新增 `validateOpsxDelta` 测试