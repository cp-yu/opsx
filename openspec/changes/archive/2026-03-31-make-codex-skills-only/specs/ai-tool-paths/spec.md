## ADDED Requirements

### Requirement: 显式的 command-generation 支持元数据

`AIToolOption` 接口 SHALL 允许工具元数据声明是否支持 adapter-backed command generation。

#### Scenario: Codex 声明不支持 adapter-backed commands

- **WHEN** 在 `AI_TOOLS` 中查找 `codex` 工具
- **THEN** 元数据 SHALL 显式表明 Codex 不支持 adapter-backed command generation
- **AND** 调用方 SHALL 使用该元数据，而不是从历史行为中推断 Codex 的 command 支持能力

#### Scenario: 回退行为保持确定性

- **WHEN** 某个工具未声明显式的 command-generation 支持元数据
- **THEN** 系统 SHALL 通过一个确定性的共享 helper 解析 command generation 行为
- **AND** 该 helper SHALL 继续使用显式列表或 registry 查找，而不是模式匹配

### Requirement: Codex skill 路径保持项目本地化

Codex workflow 安装 SHALL 只使用仓库内受管的项目本地 skills 路径。

#### Scenario: Codex skills 路径遵循 Agent Skills 规约

- **WHEN** 为 Codex 生成 OpenSpec workflow 制品
- **THEN** 系统 SHALL 将它们写入 `<projectRoot>/.codex/skills/`
- **AND** SHALL NOT 指向任何全局 Codex prompt 目录
- **AND** 路径构造 SHALL 在所有受支持平台上使用 `path.join()` 或 `path.resolve()`
