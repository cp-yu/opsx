---
capabilities:
  - cap.ai.workflow-templates
---

## MODIFIED Requirements

### Requirement: 内置 reference 物化到 openspec/references 目录

系统 SHALL 将全部 skill reference 文件以 `openspec-<name>.md` 命名物化到项目级 `openspec/references/` 目录，作为唯一物理位置；各工具 skill 目录（如 `.claude/skills/<skill>/`）SHALL NOT 再包含 `references/` 子目录。生成的 SKILL.md 中对该目录的引用 SHALL 附带显式 project-root 标记，区分于工具系统的 skill 目录相对路径解析规则。

#### Scenario: update 物化全部内置 reference

- **WHEN** 用户在已配置工具的项目中运行 `openspec update`
- **THEN** `openspec/references/` SHALL 包含全部模板声明的 reference 文件，文件名为 `openspec-<name>.md`（如 `openspec-archive-commit-message.md`、`openspec-merge-summary-message.md`、`openspec-apply-phase2-optimization.md`）
- **AND** 每个文件内容 SHALL 与对应模板常量一致
- **AND** 各工具 skill 目录 SHALL NOT 包含 `references/` 子目录

#### Scenario: skill 指令引用项目级路径

- **WHEN** 读取生成的 skill `SKILL.md` 中对 reference 的引用
- **THEN** 引用路径 SHALL 为 `openspec/references/openspec-<name>.md` 形式
- **AND** SHALL NOT 引用 skill 目录相对的 `references/<name>.md` 路径
- **AND** 引用 SHALL 附带 project-root 标记：inline 引用以 `project-root file` 前缀，列表引用以 `(project-root relative)` 后缀

#### Scenario: update 清理 skill 目录残留 references

- **WHEN** 项目中存在旧布局生成的 `.claude/skills/<skill>/references/` 目录
- **AND** 用户运行 `openspec update`
- **THEN** 系统 SHALL 按生成清单显式删除这些受管 skill 目录下的 `references/` 残留
- **AND** SHALL NOT 删除生成清单之外的用户文件
