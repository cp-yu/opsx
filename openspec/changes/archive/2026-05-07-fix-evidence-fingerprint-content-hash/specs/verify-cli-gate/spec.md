## MODIFIED Requirements

### Requirement: Phase 1 入口门禁

系统 SHALL 提供 `openspec verify phase1 <change-name>` 命令，在接受 agent 的 Phase 1 结果前先校验入口条件。

#### Scenario: 入口条件通过

- **WHEN** agent 执行 `openspec verify phase1 <change-name> --input '<json>'`
- **AND** `tasks.md` 存在且包含 checkbox 任务
- **AND** change 目录存在
- **THEN** 系统 SHALL 校验 JSON 输入结构（`result`、`issues`、`evidenceFiles` 字段）
- **AND** SHALL 计算 `tasksFileHash`（当前 `tasks.md` 的 SHA-256）
- **AND** SHALL 计算 `evidenceFingerprint`（`evidenceFiles` 文件内容哈希的 SHA-256）
- **AND** SHALL 将 canonical Phase 1 payload 写入 `.verify-result.json`
- **AND** 当 result 为 PASS/PASS_WITH_WARNINGS 时 SHALL 初始化 `optimization.status = PENDING_VERIFICATION`，防止 Phase 1-only 结果通过 sync/archive 门禁
- **AND** 输出下一步指令：PASS/PASS_WITH_WARNINGS 时输出 "进入 Phase 2"，FAIL_NEEDS_REMEDIATION 时输出 "修复 CRITICAL issues"
- **AND** 以 exit 0 退出
