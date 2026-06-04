---
capabilities:
  - cap.ai.workflow-templates
---

# ai-workflow-templates Specification

## Purpose

此规约记录变更 unify-cli-query-interface 对 AI workflow 模板命令引用的修改。

## ADDED Requirements

### Requirement: Propose 模板使用统一 CLI 查询接口

Propose 模板 SHALL 使用 `openspec list --specs --json` 替代 deprecated 的 `openspec spec list --json`。

#### Scenario: Propose 模板包含正确的 spec 发现指令

- **WHEN** propose 模板被加载
- **THEN** SHALL 包含步骤指示 LLM 运行 `openspec list --specs --json` 获取现有 specs 及其 capabilities 关联
- **AND** MUST NOT 引用 `openspec spec list --json`
- **AND** SHALL 指示 LLM 交叉对比提议的新 capabilities 与已有 specs，避免创建冗余 spec

#### Scenario: Propose 模板解析 capabilities 字段

- **WHEN** propose 模板指示 LLM 使用 `openspec list --specs --json` 输出
- **THEN** SHALL 指示 LLM 从每个 spec 条目的 `capabilities` 字段提取 cap ID 列表
- **AND** SHALL 说明 `capabilities` 字段是字符串数组
- **AND** SHALL 说明无 frontmatter 的 spec 返回空数组

### Requirement: Apply 模板使用统一 CLI 查询接口

Apply-change 模板 SHALL 使用 `openspec list --specs --json` 替代 deprecated 的 `openspec spec list --json`。

#### Scenario: Apply 模板包含正确的 spec 交叉检查指令

- **WHEN** apply-change 模板被加载
- **THEN** SHALL 包含步骤指示 LLM 在实现 capability 前查询关联的所有 specs
- **AND** SHALL 指示 LLM 运行 `openspec list --specs --json` 获取 cap→spec 映射
- **AND** MUST NOT 引用 `openspec spec list --json`
- **AND** SHALL 指示 LLM 确认是否需要同步更新 delta spec
