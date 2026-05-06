## MODIFIED Requirements

### Requirement: Phase 2 双调用门禁

系统 SHALL 提供 `openspec verify phase2 <change-name> --type=<optimization|verification>` 命令。Phase 2 的优化循环主控逻辑上移到 apply 模板，verify CLI 保留为底层状态持久化工具。

#### Scenario: 第一次调用 — 优化被配置禁用

- **WHEN** agent 执行 `openspec verify phase2 <change-name> --type=optimization --input '<json>'`
- **AND** Phase 1 result 为 PASS 或 PASS_WITH_WARNINGS
- **AND** `optimization.enabled` 为 false
- **AND** 输入 `status` 为 `SKIPPED`
- **THEN** 系统 SHALL 设置 `optimization.status = SKIPPED`
- **AND** SHALL 写入 `.verify-result.json`（更新 optimization 对象）
- **AND** 输出 "Phase 2 skipped. 可进入 sync/archive"
- **AND** 以 exit 0 退出

#### Scenario: 第一次调用 — 提交优化结果 (NO_OPTIMIZATION_NEEDED)

- **WHEN** agent 执行 `openspec verify phase2 <change-name> --type=optimization --input '<json>'`
- **AND** Phase 1 result 为 PASS 或 PASS_WITH_WARNINGS
- **AND** `optimization.enabled` 不为 false
- **AND** 输入 `status` 为 `NO_OPTIMIZATION_NEEDED`
- **THEN** 系统 SHALL 设置 `optimization.status = NOT_NEEDED`
- **AND** SHALL 写入 `.verify-result.json`（更新 optimization 对象）
- **AND** 输出 "Phase 2 完成 (无需优化)。可进入 sync/archive"
- **AND** 以 exit 0 退出

#### Scenario: 第一次调用 — 提交优化结果 (OPTIMIZATION_PROPOSED)

- **WHEN** agent 执行 `openspec verify phase2 <change-name> --type=optimization --files '<paths>' --input '<json>'`
- **AND** Phase 1 result 为 PASS 或 PASS_WITH_WARNINGS
- **AND** 输入 `status` 为 `OPTIMIZATION_PROPOSED`
- **AND** `--files` 参数指定受优化影响的文件路径（逗号分隔）
- **THEN** 系统 SHALL 追加 `optimization.attempts` 条目（记录文件列表、时间戳、重试计数）
- **AND** SHALL 计算 `--files` 中每个文件的 SHA-256 存入 `optimization.affectedFileHashes`
- **AND** SHALL 设置 `optimization.status = PENDING_VERIFICATION`
- **AND** SHALL 记录输入 `summary` 中的优化方向到 `optimization.attempts`
- **AND** 以 exit 0 退出

#### Scenario: 第二次调用 — 提交 speculative fence 结果 (通过)

- **WHEN** agent 执行 `openspec verify phase2 <change-name> --type=verification --input '<json>'`
- **AND** `optimization.status` 为 `PENDING_VERIFICATION`
- **AND** 输入 `result` 为 PASS 或 PASS_WITH_WARNINGS
- **THEN** 系统 SHALL 设置 `optimization.status = IMPROVED`
- **AND** SHALL 输出 "Phase 2 完成 (优化+验证通过)。可进入 sync/archive"
- **AND** 以 exit 0 退出

#### Scenario: 第二次调用 — speculative fence 失败 (可重试)

- **WHEN** agent 执行 `openspec verify phase2 <change-name> --type=verification --input '<json>'`
- **AND** 输入 `result` 为 FAIL_NEEDS_REMEDIATION
- **AND** `behaviorRetryCounter < config.optimization.optRetries`（默认 2）
- **THEN** 系统 SHALL 追加失败方向到 `optimization.failedDirections[]`
- **AND** 输出 "推测性验证失败 (尝试 N/<optRetries>)。请用不同策略重试优化"
- **AND** 以 exit 0 退出（中间态，agent 应回到 --type=optimization）

#### Scenario: 第二次调用 — speculative fence 失败 (重试耗尽)

- **WHEN** agent 执行 `openspec verify phase2 <change-name> --type=verification --input '<json>'`
- **AND** `behaviorRetryCounter >= config.optimization.optRetries`
- **THEN** 系统 SHALL 设置 `optimization.status = DEGRADED`
- **AND** SHALL 设置顶层 `result = PASS_WITH_WARNINGS`
- **AND** SHALL 输出 "Phase 2: N次优化尝试已安全回滚。可进入 sync/archive"
- **AND** 以 exit 0 退出

#### Scenario: Phase 2 调用顺序错误

- **WHEN** agent 执行 `openspec verify phase2 <change-name> --type=verification`
- **AND** `optimization.status` 不是 `PENDING_VERIFICATION`
- **THEN** 系统 SHALL 输出 "尚未提交优化结果，请先调用 phase2 --type=optimization"
- **AND** 以 exit 1 退出
