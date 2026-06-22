## ADDED Requirements

### Requirement: Archive skill 在用户显式要求时允许绕过 verify gate

`openspec-archive-change` skill SHALL 在用户显式要求时允许 agent 向 archive CLI 传递 `--no-verify` 标志。skill SHALL 优先引导 agent 走标准 verify gate 流程，但当用户明确表示要跳过 verify 时，agent SHALL 直接传递 `--no-verify`，由 CLI 自行执行二次确认。

#### Scenario: 用户显式要求绕过 verify

- **WHEN** 用户以自然语言或命令形式明确指示跳过 verify（例如"直接 --no-verify"、"跳过验证"、"不用 verify 了"）
- **THEN** agent SHALL 向 `openspec archive <change-name>` 命令传递 `--no-verify` 标志
- **AND** agent SHALL NOT 阻拦或要求用户先完成 verify

#### Scenario: 用户未要求绕过时优先标准 verify

- **WHEN** 用户未显式要求跳过 verify
- **AND** verify 结果缺失或 stale
- **THEN** agent SHALL 优先执行标准 verify 流程
- **AND** agent SHALL NOT 自行决定使用 `--no-verify`
