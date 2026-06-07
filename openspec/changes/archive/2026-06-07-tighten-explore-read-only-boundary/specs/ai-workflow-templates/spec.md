## MODIFIED Requirements

### Requirement: Explore invokes impact sweeper

`openspec-explore` SHALL invoke `openspec-impact-sweeper` when exploration reaches a code-change concept that needs impact discovery, a user term does not clearly map to project terminology and affects scope, or the agent is preparing to say the discussion is ready for proposal/change artifacts.

Explore agent SHALL 将 sweeper 视为可复用方法，在一次对话中可以多次调用，每次调用只处理一个 concept。Explore agent SHALL 在向用户总结影响面发现前读取 sweeper 返回的 JSON report path。Sweeper report 写入是内部 subagent 例外，SHALL NOT 赋予 main explore agent 创建或修改项目文件、OpenSpec 制品的权限。

#### Scenario: Proposal readiness 需要 sweep

- **WHEN** `openspec-explore` 准备说明讨论已经具备 proposal/change artifacts 就绪度
- **AND** 当前 code-change concept 在本对话中尚未 sweep
- **THEN** agent SHALL 调用 `openspec-impact-sweeper`
- **AND** SHALL 在说明 proposal 就绪前读取生成的 JSON report
- **AND** SHALL 继续将制品生成路由到 `$openspec-propose <change-name>` 或合适的非-explore workflow

#### Scenario: 新 concept 触发另一次 sweep

- **WHEN** 用户在 explore 中引入新的 module、workflow、command、configuration key、project concept 或陌生 domain term
- **AND** 该 term 可能影响 implementation scope
- **THEN** agent SHALL 针对该 concept 调用 `openspec-impact-sweeper`
- **AND** SHALL 让该 sweep 独立于之前的 concept sweeps

#### Scenario: 影响 scope 的不确定性询问用户

- **WHEN** sweeper report 包含影响 scope 或 proposal readiness 的问题
- **THEN** `openspec-explore` SHALL 询问用户，而不是静默选择一种解释
- **AND** SHALL 在 scope-affecting question 被解决或被用户显式延后前，不声称 proposal readiness

#### Scenario: Sweeper report 写入不授权 explore 写入

- **WHEN** `openspec-impact-sweeper` 在 `openspec/sweeper/` 下写入 JSON report
- **THEN** main explore agent SHALL 只读取并解释该 report
- **AND** SHALL NOT 在 explore 中创建或修改源码、测试、generated workflow surfaces 或 OpenSpec 制品
