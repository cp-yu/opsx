## ADDED Requirements

### Requirement: Apply 必须检测当前分支

Apply 阶段 SHALL 在开始实现前检测当前 git 分支。

#### Scenario: 检测当前分支

- **WHEN** 用户调用 `/opsx:apply`
- **THEN** 系统执行 `git branch --show-current` 获取当前分支名
- **THEN** 系统判断是否在 main 或 master 分支

#### Scenario: 在 main/master 分支时询问

- **WHEN** 当前分支是 main 或 master
- **THEN** 系统显示警告："建议在 feature 分支上工作。Apply 阶段会频繁 commit，直接在 main 分支工作可能污染历史。"
- **THEN** 系统询问用户选择隔离方式

#### Scenario: 在 feature 分支时直接继续

- **WHEN** 当前分支不是 main 或 master
- **THEN** 系统显示信息："当前在分支 <branch-name>，继续实现。"
- **THEN** 系统直接进入实现阶段

### Requirement: 提供三种隔离选项

系统 SHALL 提供三种隔离方式供用户选择。

#### Scenario: 隔离选项呈现

- **WHEN** 系统询问隔离方式
- **THEN** 系统提供以下选项：
  1. 创建新分支 `<change-name>`（推荐，简单快速）
  2. 创建 worktree（推荐，完全隔离，适合并行开发）
  3. 当前分支继续（不推荐，除非你知道自己在做什么）

#### Scenario: 选项说明

- **WHEN** 系统呈现选项
- **THEN** 每个选项包含简短说明：
  - 选项 1：在当前仓库创建新分支，切换到该分支工作
  - 选项 2：创建独立的 worktree 目录，完全隔离，不影响当前工作区
  - 选项 3：直接在 main/master 分支工作，所有 commit 直接进入主分支

### Requirement: 创建新分支

系统 SHALL 支持创建新分支并切换到该分支。

#### Scenario: 分支名称生成

- **WHEN** 用户选择"创建新分支"
- **THEN** 系统使用 change name 作为分支名（如 `merge-superpowers-capabilities`）
- **THEN** 如果分支已存在，系统询问："分支 <name> 已存在，是否切换到该分支？"

#### Scenario: 执行分支创建

- **WHEN** 系统创建新分支
- **THEN** 系统执行 `git checkout -b <change-name>`
- **THEN** 系统验证分支创建成功
- **THEN** 系统显示："已切换到新分支 <change-name>。"

#### Scenario: 分支创建失败

- **WHEN** git checkout 失败（如有未提交的更改）
- **THEN** 系统报告错误："无法创建分支：<error-message>"
- **THEN** 系统建议："请先提交或 stash 当前更改。"

### Requirement: 创建 worktree

系统 SHALL 支持创建 git worktree 进行完全隔离。

#### Scenario: 调用 worktree skill

- **WHEN** 用户选择"创建 worktree"
- **THEN** 系统检查是否存在 `using-git-worktrees` skill
- **THEN** 如果存在，系统调用该 skill
- **THEN** 如果不存在，系统回退到手动创建 worktree

#### Scenario: 手动创建 worktree

- **WHEN** `using-git-worktrees` skill 不存在
- **THEN** 系统执行以下步骤：
  1. 检查 `.worktrees/` 目录是否存在，不存在则创建
  2. 执行 `git worktree add .worktrees/<change-name> -b <change-name>`
  3. 切换工作目录到 `.worktrees/<change-name>`
  4. 显示："已创建 worktree 在 .worktrees/<change-name>。"

#### Scenario: Worktree 路径跨平台

- **WHEN** 系统创建 worktree 路径
- **THEN** 路径使用 `path.join()` 构建
- **THEN** 在 Windows、macOS、Linux 上都能正确创建

#### Scenario: Worktree 创建失败

- **WHEN** git worktree add 失败
- **THEN** 系统报告错误："无法创建 worktree：<error-message>"
- **THEN** 系统回退到"创建新分支"选项

### Requirement: 当前分支继续

系统 SHALL 支持在当前分支继续工作（不推荐）。

#### Scenario: 用户确认风险

- **WHEN** 用户选择"当前分支继续"
- **THEN** 系统再次警告："你选择在 main/master 分支直接工作。Apply 阶段会产生多个 commit，这些 commit 会直接进入主分支历史。确定继续吗？"
- **THEN** 用户确认后，系统继续实现

#### Scenario: 记录用户选择

- **WHEN** 用户选择在当前分支继续
- **THEN** 系统记录该选择（用于后续提示）
- **THEN** 系统在实现完成后提示："实现完成。注意：所有 commit 已进入 main/master 分支。"

### Requirement: 隔离状态持久化

系统 SHALL 记录隔离状态，便于后续操作。

#### Scenario: 记录隔离方式

- **WHEN** 用户选择隔离方式并成功执行
- **THEN** 系统在 change 目录下创建 `.apply-isolation.json` 文件
- **THEN** 文件内容包含：
  ```json
  {
    "method": "branch" | "worktree" | "none",
    "branchName": "<branch-name>",
    "worktreePath": "<path>" (if method is worktree),
    "originalBranch": "<original-branch-name>"
  }
  ```

#### Scenario: Archive 时清理 worktree

- **WHEN** 用户调用 `/opsx:archive`
- **THEN** 系统读取 `.apply-isolation.json`
- **THEN** 如果 method 是 worktree，系统询问："是否删除 worktree 目录？"
- **THEN** 用户确认后，系统执行 `git worktree remove <path>`

#### Scenario: 切换回原分支

- **WHEN** Archive 完成
- **THEN** 系统读取 `.apply-isolation.json` 中的 originalBranch
- **THEN** 系统询问："是否切换回原分支 <original-branch>？"
- **THEN** 用户确认后，系统执行 `git checkout <original-branch>`

### Requirement: 集成 Superpowers worktree skill

系统 SHALL 集成 Superpowers 的 `using-git-worktrees` skill。

#### Scenario: 检测 skill 存在

- **WHEN** 系统需要创建 worktree
- **THEN** 系统检查 `.claude/skills/using-git-worktrees/` 或 `skills/using-git-worktrees/` 是否存在
- **THEN** 如果存在，系统优先使用该 skill

#### Scenario: 调用 skill

- **WHEN** 系统调用 `using-git-worktrees` skill
- **THEN** 系统传递 change name 作为参数
- **THEN** Skill 负责检测现有隔离、选择目录、创建 worktree
- **THEN** Skill 返回 worktree 路径

#### Scenario: Skill 不存在时回退

- **WHEN** `using-git-worktrees` skill 不存在
- **THEN** 系统使用内置的简化版 worktree 创建逻辑
- **THEN** 系统显示提示："使用内置 worktree 支持。如需完整功能，请安装 using-git-worktrees skill。"

### Requirement: 跨平台路径处理

系统 SHALL 确保所有路径操作在 Windows、macOS、Linux 上都能正确工作。

#### Scenario: 分支名称中的路径分隔符

- **WHEN** Change name 包含路径分隔符（如 `feature/user-auth`）
- **THEN** 系统在 Windows 上将 `/` 替换为 `-`（git 分支名不支持 `\`）
- **THEN** 最终分支名为 `feature-user-auth`

#### Scenario: Worktree 路径构建

- **WHEN** 系统构建 worktree 路径
- **THEN** 使用 `path.join(process.cwd(), '.worktrees', changeName)`
- **THEN** 不硬编码 `/` 或 `\`

#### Scenario: 路径显示

- **WHEN** 系统向用户显示路径
- **THEN** 使用 `path.normalize()` 转换为平台原生格式
- **THEN** Windows 显示 `C:\project\.worktrees\change-name`
- **THEN** Unix 显示 `/project/.worktrees/change-name`
