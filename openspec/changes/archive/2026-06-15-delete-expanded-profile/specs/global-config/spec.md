---
capabilities:
  - cap.config.global
---
# Global Config 规约变更

## ADDED Requirements

### Requirement: 简化的全局配置结构

全局配置 SHALL 存储用户级别的 OpenSpec 设置，不包含 profile 和 workflows 字段。

#### Scenario: 配置文件结构

- **WHEN** 读取全局配置
- **THEN** 配置文件 SHALL 位于 `~/.config/openspec/config.json`
- **AND** 配置结构 SHALL 包含以下字段：
  - `delivery`: DeliveryMode (`skills` | `commands` | `both`)
  - `featureFlags`: 功能开关对象
- **AND** 配置结构 SHALL NOT 包含 `profile` 字段
- **AND** 配置结构 SHALL NOT 包含 `workflows` 字段

#### Scenario: 默认配置值

- **WHEN** 首次创建全局配置
- **THEN** 默认值 SHALL 为：
  ```json
  {
    "delivery": "both",
    "featureFlags": {}
  }
  ```

#### Scenario: 读取包含过时字段的配置

- **WHEN** 配置文件包含 `profile` 或 `workflows` 字段
- **THEN** 系统 SHALL 忽略这些字段
- **AND** 输出警告消息建议运行 `openspec update` 清理
