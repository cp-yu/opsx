# verify-cli-gate Specification

## Purpose
此规约记录变更 add-verify-cli-gate 引入的行为，请在后续同步或归档前补全正式 Purpose。
## Requirements
### Requirement: Phase 1 入口门禁

系统 SHALL 提供 `openspec verify phase1 <change-name>` 命令，在接受 agent 的 Phase 1 结果前先校验入口条件。

#### Scenario: 入口条件通过

- **WHEN** agent 执行 `openspec verify phase1 <change-name> --input '<json>'`
- **AND** `tasks.md` 存在且包含 checkbox 任务
- **AND** change 目录存在
- **THEN** 系统 SHALL 校验 JSON 输入结构（`result`、`issues`、`evidenceFiles` 字段）
- **AND** SHALL 计算 `tasksFileHash`（当前 `tasks.md` 的 SHA-256）
- **AND** SHALL 计算 `evidenceFingerprint`（`evidenceFiles` 路径+mtime+size 的 SHA-256）
- **AND** SHALL 将 canonical Phase 1 payload 写入 `.verify-result.json`
- **AND** 当 result 为 PASS/PASS_WITH_WARNINGS 时 SHALL 初始化 `optimization.status = PENDING_VERIFICATION`，防止 Phase 1-only 结果通过 sync/archive 门禁
- **AND** 输出下一步指令：PASS/PASS_WITH_WARNINGS 时输出 "进入 Phase 2"，FAIL_NEEDS_REMEDIATION 时输出 "修复 CRITICAL issues"
- **AND** 以 exit 0 退出

#### Scenario: 入口条件不满足

- **WHEN** agent 执行 `openspec verify phase1 <change-name>`
- **AND** `tasks.md` 缺失或无 checkbox 任务
- **THEN** 系统 SHALL 输出 warning 描述不满足的条件
- **AND** 以 exit 1 退出
- **AND** SHALL NOT 写入 `.verify-result.json`

#### Scenario: JSON 输入不合法

- **WHEN** agent 传入的 `--input` JSON 缺少必需字段或 `result` 值非法
- **THEN** 系统 SHALL 输出具体的校验错误
- **AND** 以 exit 2 退出

#### Scenario: Phase 1 失败后的 remediation 读取

- **WHEN** Phase 1 result 为 FAIL_NEEDS_REMEDIATION
- **AND** `.verify-result.json` 已写入
- **THEN** agent SHALL 读取 `.verify-result.json` 中的 `issues[]` 定位需修复的问题
- **AND** SHALL 参考 `evidenceFiles[]` 确定需重新检查的文件范围
- **AND** 修复完成后 SHALL 重新调用 `openspec verify phase1` 覆写结果

### Requirement: Phase 2 双调用门禁

系统 SHALL 提供 `openspec verify phase2 <change-name> --type=<optimization|verification>` 命令，要求 agent 至少调用 2 次完成 Phase 2。

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
- **AND** SHALL 输出 "优化建议已记录。下一步: 应用 Search/Replace 块 + P1_SPECULATIVE_FENCE subagent 验证，然后调用 phase2 --type=verification"
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
- **AND** `behaviorRetryCounter < 3`
- **THEN** 系统 SHALL 输出 "推测性验证失败 (尝试 N/3)。请用不同策略重试优化"
- **AND** 以 exit 0 退出（中间态，agent 应回到 --type=optimization）

#### Scenario: 第二次调用 — speculative fence 失败 (重试耗尽)

- **WHEN** agent 执行 `openspec verify phase2 <change-name> --type=verification --input '<json>'`
- **AND** `behaviorRetryCounter >= 3`
- **THEN** 系统 SHALL 设置 `optimization.status = DEGRADED`
- **AND** SHALL 设置顶层 `result = PASS_WITH_WARNINGS`
- **AND** SHALL 输出 "Phase 2: 3次优化尝试已安全回滚。可进入 sync/archive"
- **AND** 以 exit 0 退出

#### Scenario: Phase 2 入口条件不满足

- **WHEN** agent 执行 `openspec verify phase2 <change-name> --type=optimization`
- **AND** Phase 1 result 不是 PASS/PASS_WITH_WARNINGS，或 `optimization.enabled` 为 false 且输入 `status` 不是 `SKIPPED`
- **THEN** 系统 SHALL 输出跳过原因
- **AND** 以 exit 1 退出

#### Scenario: Phase 2 调用顺序错误

- **WHEN** agent 执行 `openspec verify phase2 <change-name> --type=verification`
- **AND** `optimization.status` 不是 `PENDING_VERIFICATION`
- **THEN** 系统 SHALL 输出 "尚未提交优化结果，请先调用 phase2 --type=optimization"
- **AND** 以 exit 1 退出

#### Scenario: PENDING_VERIFICATION 残留恢复

- **WHEN** agent 执行 `openspec verify phase2 <change-name> --type=optimization`
- **AND** `optimization.status` 为 `PENDING_VERIFICATION`（上次崩溃残留）
- **THEN** 系统 SHALL 输出 warning "检测到未完成的 Phase 2 验证。请先完成验证或重置"
- **AND** 以 exit 1 退出

#### Scenario: 文件哈希校验 — 确保优化 patch 已应用

- **WHEN** agent 执行 `openspec verify phase2 <change-name> --type=verification --input '<json>'`
- **AND** 之前的 `--type=optimization` 调用指定了 `--files` 参数（受影响的文件路径列表，逗号分隔）
- **AND** CLI 在 `--type=optimization` 时已计算并存储了 `--files` 中每个文件的 SHA-256 哈希于 `optimization.affectedFileHashes`
- **THEN** CLI SHALL 在 `--type=verification` 调用时重新计算 `--files` 中每个文件的哈希
- **AND** 若任一文件哈希与存储值一致（即文件未变更），SHALL 输出 "检测到优化 patch 未应用，请先应用 Search/Replace 块再重试"
- **AND** SHALL 以 exit 1 退出
- **AND** agent SHALL NOT 在文件未变更的情况下进入 speculative fence
- **AND** 若所有文件哈希均已变更（patch 已应用），SHALL 继续正常处理 `--type=verification` 调用

### Requirement: Seal 校验

系统 SHALL 提供 `openspec verify seal <change-name>` 命令，校验 `.verify-result.json` 的结构完整性和字段合法性。

#### Scenario: Seal 校验通过

- **WHEN** agent 执行 `openspec verify seal <change-name>`
- **AND** `.verify-result.json` 存在且结构完整
- **AND** 所有必需字段存在且值合法
- **AND** `optimization.status` 为终局状态（非 PENDING_VERIFICATION）
- **THEN** 系统 SHALL 输出 seal hash
- **AND** 以 exit 0 退出

#### Scenario: Seal 校验失败

- **WHEN** `.verify-result.json` 缺失必需字段或字段值非法
- **THEN** 系统 SHALL 输出缺失/非法字段列表
- **AND** 以 exit 1 退出

