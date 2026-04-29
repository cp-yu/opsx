## ADDED Requirements

### Requirement: Archive reruns select verify execution model explicitly

系统 SHALL 在缺失或 stale verify result 触发 full verify rerun 时，显式选择与 `/opsx:verify` 一致的 execution model。

#### Scenario: subagent-capable 工具的 archive rerun 复用 subagent orchestration

- **WHEN** archive 检测到 `.verify-result.json` missing 或 stale
- **AND** 当前 AI 工具支持 clean-context subagent verify
- **THEN** archive SHALL 执行与 `/opsx:verify` 相同的 subagent-orchestrated full verify contract
- **AND** SHALL NOT 继续使用 archive 模板内独立描述的 current-agent review skeleton
- **AND** rerun SHALL 复用相同的 Phase 2 eligibility、checkpoint 与 speculative fence 语义

#### Scenario: reread 工具的 archive rerun 复用 reread contract

- **WHEN** archive 检测到 `.verify-result.json` missing 或 stale
- **AND** 当前 AI 工具不支持 clean-context subagent verify
- **THEN** archive SHALL 执行与 `/opsx:verify` 相同的 current-agent-reread full verify contract
- **AND** SHALL 保持现有 freshness 与 archive-compatibility gate 语义
