# subagent-self-read Specification

## Purpose
定义 reviewer/optimizer subagent 的自主文件读取与测试执行能力，包括工具权限边界和安全约束。

## ADDED Requirements

### Requirement: Subagent 工具权限定义
Reviewer 和 Optimizer subagent SHALL 拥有以下工具能力：

| 工具 | 允许 | 用途 |
|------|------|------|
| Read | ✅ | 读取 change artifacts、实现文件、测试文件、OPSX 文件 |
| Bash | ✅ | 执行测试命令、git 命令、grep 等只读操作 |
| Edit | ❌ | 不允许修改任何文件 |
| Write | ❌ | 不允许创建任何文件 |

Subagent MUST NOT 通过 Bash 绕过 Edit/Write 限制（如 `echo >`, `sed -i`, `rm`, `mv`）。

#### Scenario: Reviewer 使用 Read 读取实现文件
- **WHEN** reviewer 需要检查某候选实现文件的内容
- **THEN** reviewer SHALL 直接使用 Read 工具读取该文件
- **AND** SHALL NOT 依赖 master agent 传入的文件内容

#### Scenario: Reviewer 使用 Bash 跑测试
- **WHEN** reviewer 对某 task 的测试覆盖存疑
- **THEN** reviewer SHALL 使用 Bash 执行相关测试子集（如 `pnpm test path/to/file`）
- **AND** SHALL 将测试结果作为验证证据引用

#### Scenario: Subagent 尝试通过 Bash 修改文件
- **WHEN** subagent 的 Bash 命令包含文件修改操作（echo >、sed -i、rm、mv、cp 覆盖）
- **THEN** 该行为违反 hard constraint
- **AND** 用户审批层 SHALL 拒绝该命令

### Requirement: Subagent Bash 允许命令范围
Subagent 的 Bash 使用 SHALL 限定于以下类别：

1. **测试执行**: `pnpm test`、`pnpm test <path>`、`vitest run <path>`
2. **Git 只读**: `git status`、`git diff`、`git log`、`git show`、`git diff --name-only`
3. **搜索**: `grep`、`find`（只读搜索用途）
4. **构建验证**: `pnpm build`、`tsc --noEmit`（类型检查）

Subagent MUST NOT 执行：
- 文件系统修改命令
- 网络请求命令
- 进程管理命令（kill、pkill）
- 包安装命令（pnpm install、npm install）

#### Scenario: Optimizer 使用 grep 定位代码模式
- **WHEN** optimizer 需要确认某函数在多个文件中的重复出现
- **THEN** optimizer SHALL 使用 `grep -rn "pattern" src/` 定位
- **AND** SHALL 基于搜索结果决定是否提议去重

#### Scenario: Reviewer 执行类型检查
- **WHEN** reviewer 需要验证实现代码的类型正确性
- **THEN** reviewer SHALL 使用 `tsc --noEmit` 或 `pnpm build` 验证
- **AND** SHALL 将编译错误作为 CRITICAL issue 的证据

### Requirement: Subagent 测试策略（L1）
Subagent SHALL 采用 L1 测试策略：默认静态判断，可疑时 Bash 抽查。

决策流程：
1. 读 `tasks.md` — 测试相关 task 是否标记完成
2. 读 `test/` 目录下相关测试文件 — scenario 覆盖是否充分
3. 如果 (1) 标记完成且 (2) 覆盖充分 → trust，引用 tasks.md 作为证据
4. 如果 (1) 标记完成但 (2) 覆盖可疑或不足 → Bash 跑相关测试子集抽查
5. 如果测试 fail → 报告为 CRITICAL issue

Subagent MUST NOT 默认跑全量测试。仅在以下情况跑全量：
- 无法确定受影响的测试子集
- git diff 范围过大无法缩小

#### Scenario: Tasks 标记测试通过且覆盖充分
- **WHEN** tasks.md 中测试 task 标记为 [x]
- **AND** 相关测试文件包含对应 scenario 的 test case
- **THEN** reviewer SHALL 分配 PASS 并引用 tasks.md 和测试文件作为证据
- **AND** SHALL NOT 重新执行测试

#### Scenario: Tasks 标记通过但覆盖可疑
- **WHEN** tasks.md 中测试 task 标记为 [x]
- **AND** reviewer 发现 spec 中某 scenario 在测试文件中无对应 case
- **THEN** reviewer SHALL 使用 Bash 跑相关测试子集验证
- **AND** SHALL 将缺失覆盖报告为 WARNING 并在 writeBackPlan 中建议补测试

#### Scenario: 测试执行失败
- **WHEN** reviewer 通过 Bash 执行测试且 exit code ≠ 0
- **THEN** reviewer SHALL 报告为 CRITICAL issue
- **AND** SHALL 引用失败的测试输出作为证据
- **AND** SHALL 在 writeBackPlan 中建议修复失败测试
