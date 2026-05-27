## Context

当前 reviewer/optimizer subagent 采用"纯函数"模型：master agent 必须将所有文件内容打包为 evidence bundle 传入 subagent 的 prompt。这导致 context 双重消耗、打包逻辑脆弱（遗漏即被拒绝）、以及"读什么文件"的判断权错位。

`.verify-result.json` 已包含 `verificationContext.evidenceFiles` 列表和 `evidenceFingerprint`，天然适合作为 subagent 的导航 manifest。

## Goals / Non-Goals

**Goals:**
- Subagent 自主读取文件，master 只传定位信息（3 个字符串）
- Reviewer 可按需跑测试抽查（L1 策略）
- Optimizer 可用 grep/git 辅助分析
- 保持 clean-context 语义（不依赖对话历史）
- 不改变 `.verify-result.json` schema

**Non-Goals:**
- 不给 subagent Edit/Write 权限
- 不引入 Docker 沙箱或 per-command 白名单
- 不新增 `.test-evidence.json` 或其他文件
- 不改变 verify 的最终输出格式（JSON verdict schema 不变）

## Decisions

**Decision: Subagent 获得 Read + Bash，安全边界靠 prompt constraint**

Approach: 在 skill 的 Hard Constraints 中声明禁止通过 Bash 修改文件。用户审批层作为第二道防线。不引入技术沙箱。

理由：Claude Code 当前不支持 per-subagent tool filtering。Prompt constraint + 用户审批是最务实的方案，且 subagent 的 prompt 已经有严格的 Hard Constraints 机制。

**Decision: Master 只传 changeName + changeDir + projectRoot**

Approach: 砍掉 Input Contract 中的 5 个内容字段，替换为 3 个路径字符串。Subagent 自行从文件系统获取所有信息。

理由：消除 context 双重消耗；消除 master 打包遗漏的失败模式；让"读什么文件"的判断权归属审查者。

**Decision: `.verify-result.json` 作为 optimizer 的完整上下文来源**

Approach: Optimizer 从 `.verify-result.json` 读取 Phase 1 result、issues、evidenceFiles、failedDirections。不需要 master 复述。

理由：Phase 1 → Phase 2 之间的状态传递已经通过 CLI 持久化在这个文件里。

**Decision: L1 测试策略 — 默认静态，可疑时抽查**

Approach: Reviewer 默认信任 tasks.md 勾选 + 读 test 文件结构做静态判断。仅在覆盖可疑时用 Bash 跑相关测试子集。

理由：避免 30 分钟全量测试的重复执行；静态判断覆盖大多数场景；抽查能抓到"勾了但没跑"的造假。

**Decision: `[Mode: Evidence]` 步骤简化**

Approach: Coordinator 的 Evidence 步骤从"读所有候选文件"简化为"确定 changeDir 和 projectRoot 路径"。Git evidence 也由 subagent 自行获取。

理由：所有 I/O 职责转移给 subagent 后，coordinator 在 Evidence 阶段无需做任何文件读取。

## Risks / Trade-offs

**Risk: Prompt constraint 不是硬隔离**
- LLM 可能违反"不改文件"的约束
- 缓解：用户审批层作为第二道防线；subagent 的 Hard Constraints 已被证明在实践中有效

**Risk: Subagent 读取文件时文件可能被并发修改**
- 单人开发场景下概率极低
- 缓解：reviewer 在验证开始时记录 git HEAD commit，如果中途 HEAD 变化则报告 WARNING

**Trade-off: 首次 verify 无 manifest 时 reviewer 需要自行推断候选文件**
- 没有 prior `.verify-result.json` 时，reviewer 需从 git diff + artifacts 关键词推断
- 这与当前 master 的逻辑相同，只是执行者从 master 变为 reviewer
