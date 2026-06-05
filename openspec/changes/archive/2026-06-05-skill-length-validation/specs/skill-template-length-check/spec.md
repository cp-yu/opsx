## ADDED Requirements

### Requirement: 测试验证所有生成 skill 文件行数限制

测试 MUST 调用 `getSkillTemplates()` 获取所有 skill 模板（包括 default、claude、codex 三种 tool 变体），并验证每个生成 skill 文件不超过 200 行。`SKILL.md` MUST 使用 `generateSkillContent(template, version).split('\n').length` 计算，`template.referenceFiles[]` MUST 按每个 reference 文件各自的 `content.split('\n').length` 计算。测试 MUST NOT 汇总同一 skill 目录下所有文件的总行数。

#### Scenario: 所有模板均未超标

- **WHEN** 运行测试套件
- **THEN** 测试通过，所有生成 skill 文件均 ≤ 200 行

#### Scenario: 存在超标文件时按路径分组报告

- **WHEN** 存在一个或多个 skill 文件超过 200 行
- **THEN** 测试失败并抛出 Error，错误信息 MUST 包含：
  - 超标文件变体数量
  - 按 `<dirName>/<filePath>` 分组的列表，每个条目格式为 `• <dirName>/<filePath> (<variant1>, <variant2>, ...): <maxLines> lines (+<over>)`
  - 按最大行数降序排列
  - 参考链接 `https://github.com/mattpocock/skills/blob/main/skills/productivity/write-a-skill/SKILL.md`

#### Scenario: 同一文件的多个变体行数相同时合并显示

- **WHEN** `openspec-explore/SKILL.md` 的 default、claude、codex 三个变体均为 541 行
- **THEN** 错误信息 MUST 显示为一行：`• openspec-explore/SKILL.md (default, claude, codex): 541 lines (+341)`

#### Scenario: 同一文件的不同变体行数不同时分别显示

- **WHEN** `openspec-verify/SKILL.md` 的 claude 和 codex 变体为 604 行，default 变体为 580 行
- **THEN** 错误信息 MUST 显示为两行：
  - `• openspec-verify/SKILL.md (claude, codex): 604 lines (+404)`
  - `• openspec-verify/SKILL.md (default): 580 lines (+380)`

#### Scenario: reference 文件单独计算

- **WHEN** `openspec-optimizer/SKILL.md` 为 180 行且 `openspec-optimizer/references/output-protocol.md` 为 205 行
- **THEN** 错误信息 MUST 只报告 `openspec-optimizer/references/output-protocol.md`
- **AND** 测试 MUST NOT 将两个文件相加后报告 `openspec-optimizer` 超标

### Requirement: 测试覆盖所有 tool 变体

测试 MUST 通过调用 `getSkillTemplates(undefined, undefined)`、`getSkillTemplates(undefined, 'claude')`、`getSkillTemplates(undefined, 'codex')` 三次来获取所有可能的模板变体，确保每个 tool 特定的实现都被验证。

#### Scenario: 获取所有变体

- **WHEN** 调用 `getSkillTemplates` 三次分别传入 undefined、'claude'、'codex' 作为 toolId 参数
- **THEN** 返回的模板列表 MUST 包含所有已定义的 skill 变体

#### Scenario: 验证变体独立性

- **WHEN** 某个 skill（如 openspec-verify）针对不同 tool 有不同的生成文件内容
- **THEN** 测试 MUST 分别验证每个变体的行数，而不是只验证默认变体

### Requirement: 现有超标 skill 模板必须拆分或精简

实现 MUST 拆分或精简当前所有超过 200 行的 skill 文件，使 `getSkillTemplates(undefined, undefined)`、`getSkillTemplates(undefined, 'claude')`、`getSkillTemplates(undefined, 'codex')` 返回的每个 `SKILL.md` 与每个 `referenceFiles[]` 文件均不超过 200 行。拆分或精简 MUST 保留现有 contract tests 覆盖的关键行为短语，并同步刷新生成的工具 skill 文件。

#### Scenario: 超标 workflow/internal skill 被压缩或拆分

- **WHEN** 运行 `pnpm test test/skills/skill-template-length-validation.test.ts`
- **THEN** 测试通过，所有 default、claude、codex 变体的单个生成文件均 ≤ 200 行

#### Scenario: 长协议拆分到 references

- **WHEN** 刷新生成的 `.claude`、`.codex`、`.github` 工具产物
- **THEN** 当前配置启用的 `openspec-optimizer`、`openspec-impact-sweeper` MUST 将长协议写入 `references/*.md`
- **AND** 当选择包含 `sync` workflow 的安装计划时，`openspec-sync-specs` MUST 将长协议写入 `references/*.md`
- **AND** 主 `SKILL.md` MUST 保留入口、输入、边界和 reference 清单

#### Scenario: 关键契约语义仍由现有测试保护

- **WHEN** 运行 skill/template contract tests
- **THEN** apply、explore、propose、archive、reviewer、optimizer、impact-sweeper、sync 相关测试仍通过

#### Scenario: 生成的工具 skill 与模板源一致

- **WHEN** 刷新生成的 `.claude`、`.codex`、`.github` 工具产物
- **THEN** 生成文件中的 `SKILL.md` 与 `references/*.md` 内容与对应模板源保持一致
