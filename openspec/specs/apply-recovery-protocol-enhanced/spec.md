# apply-recovery-protocol-enhanced Specification

## Purpose
此规约记录变更 reviewer-optimization 引入的行为，请在后续同步或归档前补全正式 Purpose。
## Requirements
### Requirement: 诊断优先于修复

apply-change skill 的 recovery loop 中，当 Check command 返回非预期失败时，agent SHALL 先完成诊断步骤再尝试代码修复。诊断步骤包括：读完整错误输出（含 stack trace）、确认失败层面（编译/类型/运行时/断言）、从 codebase 中查找同类 working example 对比差异、形成单一假设并显式陈述。

#### Scenario: 非预期失败触发诊断

- **WHEN** Check command 返回非预期失败（非 TDD red phase 的预期失败）
- **THEN** agent SHALL 读取完整错误输出
- **AND** agent SHALL 确认失败层面分类
- **AND** agent SHALL 在 codebase 中搜索同类 working example
- **AND** agent SHALL 形成并陈述单一假设后再尝试修复

#### Scenario: 诊断步骤产出假设

- **WHEN** agent 完成诊断步骤
- **THEN** agent SHALL 明确记录 "根因假设：X，因为 Y" 后再执行修复
- **AND** agent SHALL NOT 在未完成诊断时直接修改代码

### Requirement: 单变量修复约束

每次修复尝试 SHALL 只改变一个变量。agent SHALL NOT 在单次修复中叠加多个独立修改。修复后 SHALL 重跑相同 Check command 确认结果。

#### Scenario: 修复仅改变一个变量

- **WHEN** agent 根据假设执行修复
- **THEN** 修复 SHALL 只针对假设所指的一个原因进行最小变更
- **AND** agent SHALL NOT 同时修复假设之外的其他问题

#### Scenario: 修复后验证同一命令

- **WHEN** agent 完成单变量修复
- **THEN** agent SHALL 重跑触发失败的同一 Check command
- **AND** agent SHALL 根据结果判断假设是否正确

### Requirement: 累计 3-strike 升级机制

同一 task 累计 3 次修复尝试仍未解决问题时（无论 error signature 是否变化），agent SHALL 停止修复并向用户呈现证据。

#### Scenario: 累计 3 次失败后停止

- **WHEN** 同一 task 的修复尝试累计达到 3 次且问题仍未解决
- **THEN** agent SHALL 停止修复
- **AND** agent SHALL 向用户呈现：已尝试的 3 条路径及各自结果、当前最佳根因判断、怀疑方向（spec 矛盾/design 遗漏/环境问题）

#### Scenario: 用户指示后计数器重置

- **WHEN** 用户在 3-strike pause 后给出指示（继续/换方向/修改 spec）
- **THEN** agent SHALL 重置该 task 的修复计数器
- **AND** agent SHALL 按用户指示继续

#### Scenario: 保留连续相同 error 快速 pause

- **WHEN** 同一 task 的同一 normalized error signature 连续失败 2 次
- **THEN** agent SHALL 立即 pause（不等累计计数器达到 3）
- **AND** pause 输出 SHALL 包含 task、check、command、failure kind 和 error summary

