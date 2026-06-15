---
capabilities:
  - cap.cli.update
---
# CLI Update 规约变更

## REMOVED Requirements

### Requirement: One-time migration for existing users
**Reason**: Profile 系统已删除，不再需要 profile 迁移逻辑
**Migration**: 用户升级后，`openspec update` 会自动清理过时的 `profile` 和 `workflows` 配置字段。

## MODIFIED Requirements

### Requirement: Update Behavior

该命令 SHALL 根据全局配置刷新项目中的 OpenSpec 指令文件。

#### Scenario: 刷新现有工具制品

- **WHEN** 项目中已配置 AI 工具
- **THEN** 检测已安装的工具目录
- **AND** 为检测到的每个工具重新生成固定的 5 个工作流制品
- **AND** 使用相同的模板生成逻辑
- **AND** 显示更新摘要，列出刷新的工具

#### Scenario: 清理过时配置字段

- **WHEN** 全局配置包含 `profile` 或 `workflows` 字段
- **THEN** 自动删除这些字段
- **AND** 保存清理后的配置
- **AND** 输出警告："已移除过时配置字段：profile, workflows"
- **AND** 输出提示："现在固定安装 5 个核心工作流：propose, explore, apply, archive, bootstrap-opsx"

#### Scenario: 项目配置默认值迁移

- **WHEN** 项目 `openspec/config.yaml` 缺少功能性默认值
- **THEN** 以 missing-only 方式补齐默认值
- **AND** SHALL NOT 覆盖用户已设置的值
- **AND** 删除陈旧的 `git.merge.messageFrom`, `git.autoCommit` 与 `commitMessage.convention` 节点
- **AND** 补齐新的 git 功能性默认结构

## ADDED Requirements

### Requirement: 固定工作流更新

该命令 SHALL 固定更新 5 个核心工作流，无需读取 profile 配置。

#### Scenario: 固定更新 5 个工作流

- **WHEN** 用户运行 `openspec update`
- **THEN** 系统 SHALL 为所有检测到的工具固定更新以下 5 个工作流：
  - `propose`
  - `explore`
  - `apply`
  - `archive`
  - `bootstrap-opsx`
- **AND** 系统 SHALL NOT 读取全局配置中的 `profile` 或 `workflows` 字段
- **AND** 系统 SHALL 删除不在固定 5 个工作流列表中的 skill 文件

#### Scenario: 清理 expanded 工作流残留

- **WHEN** 项目中存在已废弃的 expanded 工作流 skill 文件
- **THEN** 系统 SHALL 删除以下 skill 目录：
  - `openspec-new-change`
  - `openspec-continue-change`
  - `openspec-ff-change`
  - `openspec-verify-change`
  - `openspec-sync-specs`
  - `openspec-bulk-archive-change`
  - `openspec-onboard`
- **AND** 输出清理摘要："已清理 7 个废弃工作流"
