---
capabilities:
  - cap.ai.explore-brainstorming
---

# explore-brainstorming sweeper 委托方式修正 Specification

## Purpose

将 "Impact sweeper 是 explore 唯一写例外" Scenario 的措辞与代码对齐：`openspec-impact-sweeper` 是 skill 而非注册 agent type，必须经子代理执行而非作为 `subagent_type` 调用。

## MODIFIED Requirements

### Requirement: Explore 主代理保持只读

Explore main agent SHALL 保持只读。它 SHALL 检查文件、搜索代码、运行只读 OpenSpec 上下文命令、提问、比较方案、解释影响面报告，并生成只存在于对话中的 `Design Summary`；它 SHALL NOT 创建、编辑、删除、格式化、重新生成或 patch 项目文件和 OpenSpec 制品。

#### Scenario: Explore 不写入制品

- **WHEN** 用户调用 `openspec-explore`
- **AND** 对话已形成确定的设计方向
- **THEN** main explore agent SHALL 将结果保留在对话状态中
- **AND** SHALL 生成只存在于对话中的 `Design Summary`
- **AND** SHALL 在需要生成制品时指示用户调用 `$openspec-propose <change-name>`

#### Scenario: Impact sweeper 是 explore 唯一写例外

- **WHEN** explore 需要影响面发现
- **THEN** main explore agent SHALL spawn 一个子代理，并指示该子代理读取并执行 `openspec-impact-sweeper` skill
- **AND** SHALL NOT 将 `openspec-impact-sweeper` 作为 `subagent_type` 传给 Agent 工具，因其是 skill 而非注册 agent type
- **AND** 只有运行该 skill 的子代理 MAY 在 `openspec/sweeper/` 下写入 JSON report
- **AND** main explore agent SHALL 只读取并解释该 report
