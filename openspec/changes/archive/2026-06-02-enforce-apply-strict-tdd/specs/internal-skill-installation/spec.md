## MODIFIED Requirements

### Requirement: Managed generated surfaces remove stale implementer residue

系统 SHALL 在 managed skill generation 和 update 路径中移除 active tool surfaces 中由旧版本生成的 stale `openspec-implementer` skill files。删除 SHALL 使用明确的 managed internal skill directory name list，而不是目录扫描、glob filtering 或 regex inference。

#### Scenario: Update removes stale implementer skill by explicit name

- **WHEN** 用户执行 `openspec update`
- **AND** 目标 AI 工具具有 managed skills directory
- **AND** 该 directory 包含旧版本生成的 `openspec-implementer`
- **THEN** 系统 SHALL 通过显式 stale skill directory name 删除该 managed directory
- **AND** 系统 SHALL NOT 删除 reviewer、optimizer、impact-sweeper 或用户自定义 skill directories

#### Scenario: Init does not install stale implementer skill

- **WHEN** 用户执行 `openspec init`
- **AND** 目标 AI 工具具有 skillsDir
- **THEN** 系统 SHALL install active workflow skills and active internal skills only
- **AND** installed internal skill directory names SHALL NOT include `openspec-implementer`
