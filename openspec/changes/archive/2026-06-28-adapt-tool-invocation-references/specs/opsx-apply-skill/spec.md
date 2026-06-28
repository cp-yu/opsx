## MODIFIED Requirements

### Requirement: Apply 完成时输出 archive 指引

Apply 阶段在所有 task 完成且 seal 通过后，SHALL 显式输出下一步操作指引，引导用户进入归档。

#### Scenario: seal 通过后输出 call-to-action

- **WHEN** Phase 3 seal 返回 valid
- **THEN** apply SHALL 在汇总输出末尾显式给出 archive-ready call-to-action
- **AND** call-to-action SHALL 引用 archive workflow 的工具适配 invocation，例如 Codex `$openspec-archive-change <change-name>`、Claude `/openspec-archive-change <change-name>`、Pi `/skill:openspec-archive-change <change-name>` 或 OpenCode `/opsx-archive <change-name>`
- **AND** SHALL NOT 仅报告 sealed 状态而省略操作指引
- **AND** SHALL NOT 在 workflow 模板 source text 中硬编码 `/opsx-archive`
