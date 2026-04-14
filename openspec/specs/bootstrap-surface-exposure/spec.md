# Spec: bootstrap-surface-exposure

## Purpose

Bootstrap 命令面在执行过 `bootstrap init` 后动态暴露，通过现有 workflow/profile/install generation 链路实现。

## Requirements

### Requirement: 动态暴露条件

Bootstrap 命令面的暴露 SHALL 取决于 `openspec/bootstrap/` 目录是否存在。

#### Scenario: Bootstrap 目录存在时暴露
- **GIVEN** `openspec/bootstrap/` 目录存在
- **WHEN** 执行 `openspec init` 或 `openspec update`
- **THEN** 生成的命令面包含 `bootstrap-opsx` 对应的 skill 和 command
- **AND** 与当前 profile 的其他命令面一起生成

#### Scenario: Bootstrap 目录不存在时不暴露
- **GIVEN** `openspec/bootstrap/` 目录不存在
- **WHEN** 执行 `openspec init` 或 `openspec update`
- **THEN** 生成的命令面不包含 `bootstrap-opsx`

#### Scenario: Bootstrap 完成后目录被清理
- **GIVEN** `openspec/bootstrap/` 目录在 promote 后被清理
- **WHEN** 执行 `openspec update`
- **THEN** 生成的命令面不再包含 `bootstrap-opsx`

### Requirement: 通过 install planning 链路实现

系统 SHALL 通过 install planning 链路暴露 bootstrap 命令面，并 SHALL NOT 直接在 `bootstrap init` 中写入命令面文件。

#### Scenario: Init 后需要 update 才能暴露
- **GIVEN** 用户执行了 `openspec bootstrap init`
- **WHEN** 随后执行 `openspec update`
- **THEN** bootstrap 命令面被生成

#### Scenario: 不修改静态 preset
- **GIVEN** `CORE_WORKFLOWS` 和 `EXPANDED_WORKFLOWS` 常量
- **WHEN** bootstrap 目录存在
- **THEN** 这两个常量的值不变
- **AND** bootstrap 命令面通过 install planning 动态追加

### Requirement: 收敛性

bootstrap 命令面生成 SHALL 保持收敛性，重复执行不得产生额外漂移。

#### Scenario: 多次 update 产生相同结果
- **GIVEN** bootstrap 目录存在且状态不变
- **WHEN** 连续执行两次 `openspec update`
- **THEN** 两次生成的命令面文件集合完全一致
