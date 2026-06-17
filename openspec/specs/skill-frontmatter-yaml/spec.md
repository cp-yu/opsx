# skill-frontmatter-yaml Specification

## Purpose
此规约记录变更 fix-skill-frontmatter-yaml 引入的行为，请在后续同步或归档前补全正式 Purpose。
## Requirements
### Requirement: skill frontmatter 必须生成合法 YAML
系统 SHALL 将 skill template 的 `name`、`description`、`license`、`compatibility`、`metadata.author`、`metadata.version` 和 `metadata.generatedBy` 作为可解析的 YAML 字符串写入 `SKILL.md` frontmatter。

#### Scenario: description 包含 YAML 敏感字符
- **WHEN** skill template 的 `description` 包含 `sync:`、双引号或换行
- **THEN** 生成的 `SKILL.md` frontmatter MUST 能被 YAML parser 解析
- **AND** 解析后的字段值 MUST 与原始 template 字符串语义一致

#### Scenario: init 和 update 生成的 skill 文件
- **WHEN** 用户运行 `openspec init` 或 `openspec update` 生成 skill files
- **THEN** 生成的 `SKILL.md` frontmatter MUST 能被 YAML parser 解析
- **AND** 测试 MUST 通过解析后的 `name`、`license` 等字段校验语义，而不是依赖未加引号的 YAML 表面格式

