## 1. Bootstrap 合同重对齐

- [x] 1.1 更新 bootstrap 模式语义：`raw + full` 表示正式 OPSX + 完整合法 specs，`raw + opsx-first` 表示正式 OPSX + README-only starter
- [x] 1.2 在 CLI、状态输出、help 与文档中保持 `opsx-first` 为 canonical 公开模式名
- [x] 1.3 更新 `getAllowedBootstrapModes()` 及其相关 mode-contract 测试，反映最终语义且不引入 `opsx-only`
- [x] 1.4 更新 legacy mode normalization 测试，确保 `seed` 仍归一化到 canonical `opsx-first`

## 2. Bootstrap Spec Source Model

- [x] 2.1 为每个 capability 的 spec 生成增加显式 bootstrap source data（purpose、requirements、scenarios，以及稳定的 folder mapping 输入）
- [x] 2.2 确保所选 schema 被纳入 bootstrap source fingerprint 计算
- [x] 2.3 在 candidate spec assembly 之前，对缺失或非法的 spec-generation source data 增加校验
- [x] 2.4 增加测试，覆盖新的 bootstrap spec source model 的确定性解析与校验

## 3. Candidate Specs 生成

- [x] 3.1 在 `openspec/bootstrap/candidate/specs/<capability-folder>/spec.md` 下增加 candidate spec 输出
- [x] 3.2 实现确定性的 capability-to-spec-folder 映射，并显式检测冲突
- [x] 3.3 仅在 `full` 模式下生成 candidate specs；`opsx-first` 保持 README-only starter 行为
- [x] 3.4 在 promote 继续之前，使用现有 spec validation contract 校验每个生成的 candidate spec
- [x] 3.5 增加单元测试，确保 `full` 为每个 candidate capability 生成一个合法 candidate spec

## 4. Review、Fingerprint 与 Stale 流程

- [x] 4.1 扩展 derived artifact refresh，使 candidate OPSX 与 candidate specs 一起重新生成
- [x] 4.2 扩展 candidate fingerprint 计算，确保任何影响 spec 内容的 source 变化都会改变 fingerprint
- [x] 4.3 即使 candidate OPSX 不变，只要 candidate specs 变化，也要将 review state 标记为 stale
- [x] 4.4 更新 review artifacts / checklists，使 candidate spec 的完整性与合法性成为 review 内容，而不只是 domain maps
- [x] 4.5 增加测试，覆盖 requirement / scenario / spec-path 变化导致的 stale 转换

## 5. Promote 行为

- [x] 5.1 更新 promote 流程：只写入已审核 candidate artifacts，绝不在 promote 时临时生成最终 specs
- [x] 5.2 对于 `raw + full`，从 candidate outputs 写入正式 OPSX 以及正式 `openspec/specs/<capability-folder>/spec.md`
- [x] 5.3 对于 `raw + opsx-first`，写入正式 OPSX，并且只写入 `openspec/specs/README.md`
- [x] 5.4 只要 candidate spec 非法、缺失或目标路径冲突，就阻止 promote
- [x] 5.5 增加失败路径测试，确保非法 candidate spec 会在部分正式输出发生前阻断写入

## 6. Existing Specs 保留策略

- [x] 6.1 实现 `specs-based + full` 的 preserve-only 行为，确保现有 spec 文件保持不变
- [x] 6.2 仅在目标路径无冲突时补充缺失 capability 的 spec
- [x] 6.3 当生成 spec 将写入一个已存在路径时立即 fail-fast
- [x] 6.4 增加确定性测试，覆盖 preserve-only、补缺失与冲突失败行为

## 7. CLI、模板与文档面

- [x] 7.1 更新 `src/commands/bootstrap.ts` 的 instructions / help / status 文案，准确描述新的 `full` 与 `opsx-first` 合同
- [x] 7.2 更新暴露 bootstrap 模式描述的 command completion / CLI registration 面
- [x] 7.3 更新 `schemas/bootstrap/schema.yaml` 与 bootstrap templates，使生成指引与新语义一致
- [x] 7.4 更新 `src/core/templates/workflows/bootstrap-opsx.ts` 及相关 skill / workflow prompts，保持 bootstrap 指引一致
- [x] 7.5 更新 `docs/opsx-bootstrap.md` 及其他仍把 `full` 描述为 README-only starter generation 的用户文档

## 8. OpenSpec 合同 Specs

- [x] 8.1 更新与 bootstrap 相关的 OpenSpec specs，编码 `full => complete valid specs` 与 `opsx-first => README-only starter`
- [x] 8.2 增加场景，覆盖 `specs-based + full` 的 preserve-only 冲突处理
- [x] 8.3 增加场景，覆盖 candidate-spec review / stale 行为以及非法 spec 对 promote 的阻断

## 9. 验证

- [x] 9.1 增加单元测试，覆盖 mode contracts、spec folder mapping、candidate spec assembly 与冲突检测
- [x] 9.2 增加集成测试，覆盖纳入 candidate specs 后的 validate / review / promote 行为
- [x] 9.3 增加 e2e 测试，覆盖 `raw -> full`、`raw -> opsx-first` 与 `specs-based -> full`
- [x] 9.4 增加性质测试，覆盖 full completeness、opsx-first exclusivity、stale coherence 与 candidate refresh idempotence
- [x] 9.5 增加 Windows 路径验证，覆盖生成 spec 目标路径与跨平台 path expectations
