# 实现任务

## 概述

删除 expanded profile 系统和 7 个工作流，简化为固定安装 5 个核心工作流。

---

### Task 1: 删除 7 个工作流模板文件

**Goal**: 从代码库中删除 7 个 expanded 专属工作流的模板实现文件。

**Files**:
- Delete: `src/core/templates/workflows/new-change.ts`
- Delete: `src/core/templates/workflows/continue-change.ts`
- Delete: `src/core/templates/workflows/ff-change.ts`
- Delete: `src/core/templates/workflows/verify-change.ts`
- Delete: `src/core/templates/workflows/sync-specs.ts`
- Delete: `src/core/templates/workflows/bulk-archive-change.ts`
- Delete: `src/core/templates/workflows/onboard.ts`

**Requirements**:
- 删除 7 个 workflow template 文件
- 确保没有其他代码引用这些文件

#### Checks

- [x] C1 验证文件已删除
  - Verifies: `specs/ai-workflow-templates/spec.md` / REMOVED Requirement "New Change Workflow Template"
  - Command: `test ! -f src/core/templates/workflows/new-change.ts && test ! -f src/core/templates/workflows/continue-change.ts && test ! -f src/core/templates/workflows/ff-change.ts && test ! -f src/core/templates/workflows/verify-change.ts && test ! -f src/core/templates/workflows/sync-specs.ts && test ! -f src/core/templates/workflows/bulk-archive-change.ts && test ! -f src/core/templates/workflows/onboard.ts`
  - Expect: 所有 7 个文件不存在

---

### Task 2: 更新 WorkflowManifestRegistry

**Goal**: 从 manifest registry 中移除 7 个已删除工作流的 entries。

**Files**:
- Modify: `src/core/templates/manifest/registry.ts`
- Modify: `src/core/templates/skill-templates.ts`
- Test: `test/core/templates/manifest/registry.test.ts`

**Requirements**:
- 从 MANIFEST_ENTRIES 数组中移除 7 个 entries
- 移除对应的 getSkillTemplate 和 getCommandTemplate 导入和函数
- modeMembership 保留作为 tag 系统

#### Checks

- [x] C1 验证 registry 仅包含 5 个工作流
  - Verifies: `specs/template-artifact-pipeline/spec.md` / Requirement "Canonical Workflow Manifest" / Scenario "Manifest 包含固定的 5 个工作流"
  - Command: `pnpm test registry.test.ts`
  - Expect: 测试通过，registry 包含 propose, explore, apply, archive, bootstrap-opsx

- [x] C2 验证 modeMembership 作为标签系统
  - Verifies: `specs/template-artifact-pipeline/spec.md` / Requirement "Canonical Workflow Manifest" / Scenario "modeMembership 作为标签系统"
  - Command: `pnpm test registry.test.ts`
  - Expect: modeMembership 字段存在但不用于过滤

---

### Task 3: 删除 profiles.ts 文件和相关导出

**Goal**: 完全删除 profile 解析逻辑。

**Files**:
- Delete: `src/core/profiles.ts`
- Modify: `src/core/workflow-surface.ts`
- Delete: `test/core/profiles.test.ts`

**Requirements**:
- 删除 profiles.ts 文件
- 从 workflow-surface.ts 删除 profile 相关导出
- 删除 getProfileWorkflows 函数
- 删除 CORE_WORKFLOWS / EXPANDED_WORKFLOWS 常量

#### Checks

- [x] C1 验证 profiles.ts 已删除
  - Verifies: `specs/profiles/spec.md` / REMOVED Requirement "Profile Resolution"
  - Command: `test ! -f src/core/profiles.ts`
  - Expect: 文件不存在

- [x] C2 验证相关测试已删除
  - Verifies: `specs/profiles/spec.md` / REMOVED Requirement "Profile Validation"
  - Command: `test ! -f test/core/profiles.test.ts`
  - Expect: 测试文件不存在

- [x] C3 验证 workflow-surface 不导出 profile 函数
  - Verifies: `specs/profiles/spec.md` / REMOVED Requirement "Workflow List Generation"
  - Command: `grep -q "getProfileWorkflows\|CORE_WORKFLOWS\|EXPANDED_WORKFLOWS" src/core/workflow-surface.ts && exit 1 || exit 0`
  - Expect: 不包含 profile 相关导出

---

### Task 4: 更新 global-config.ts 删除 Profile 类型

**Goal**: 从全局配置结构中移除 profile 和 workflows 字段。

**Files**:
- Modify: `src/core/global-config.ts`
- Modify: `src/core/config-schema.ts`
- Test: `test/core/global-config.test.ts`

**Requirements**:
- 删除 Profile 类型定义
- 从 GlobalConfig 接口删除 profile 和 workflows 字段
- 更新 Zod schema 移除这些字段
- 保留读取时的向后兼容（忽略过时字段并警告）

#### Checks

- [x] C1 验证配置结构不包含 profile 字段
  - Verifies: `specs/global-config/spec.md` / Requirement "Global Configuration Structure" / Scenario "配置文件结构"
  - Command: `pnpm test global-config.test.ts`
  - Expect: 测试通过，GlobalConfig 类型不含 profile/workflows

- [x] C2 验证读取过时字段时输出警告
  - Verifies: `specs/global-config/spec.md` / Requirement "Global Configuration Structure" / Scenario "读取包含过时字段的配置"
  - Command: `pnpm test global-config.test.ts`
  - Expect: 包含过时字段时输出警告消息

---

### Task 5: 删除 config profile 子命令

**Goal**: 从 CLI 中移除 `openspec config profile` 命令。

**Files**:
- Modify: `src/commands/config.ts`
- Delete: `test/commands/config-profile.test.ts`

**Requirements**:
- 删除 configCmd.command('profile') 定义
- 删除相关 helper 函数
- 保留其他 config 子命令

#### Checks

- [x] C1 验证 profile 子命令已删除
  - Verifies: `specs/cli-config/spec.md` / REMOVED Requirement "Profile Configuration Flow"
  - Command: `grep -q "\.command('profile')" src/commands/config.ts && exit 1 || exit 0`
  - Expect: config.ts 不包含 profile 子命令定义

- [x] C2 验证相关测试已删除
  - Verifies: `specs/cli-config/spec.md` / Requirement "Command Structure" / Scenario "Available subcommands"
  - Command: `test ! -f test/commands/config-profile.test.ts`
  - Expect: 测试文件不存在

- [x] C3 验证 config 帮助不显示 profile
  - Verifies: `specs/cli-config/spec.md` / Requirement "Command Structure" / Scenario "Available subcommands"
  - Command: `pnpm test config.test.ts`
  - Expect: config --help 输出不包含 profile 子命令

---

### Task 6: 更新 init 命令固定安装逻辑

**Goal**: init 命令固定安装 5 个工作流，移除 profile 参数。

**Files**:
- Modify: `src/core/init.ts`
- Modify: `src/cli/index.ts`
- Test: `test/core/init.test.ts`

**Requirements**:
- 移除 --profile 参数
- 固定从 WorkflowManifestRegistry 获取所有工作流
- 忽略全局配置中的 profile/workflows 字段并警告
- 拒绝 --profile 参数并输出友好错误

#### Checks

- [x] C1 验证固定安装 5 个工作流
  - Verifies: `specs/cli-init/spec.md` / Requirement "固定工作流安装" / Scenario "固定安装 5 个工作流"
  - Command: `pnpm test init.test.ts`
  - Expect: init 总是安装 5 个工作流

- [x] C2 验证拒绝 profile 参数
  - Verifies: `specs/cli-init/spec.md` / Requirement "固定工作流安装" / Scenario "拒绝 profile 参数"
  - Command: `pnpm test init.test.ts`
  - Expect: --profile 参数返回错误和提示消息

- [x] C3 验证忽略全局配置中的 profile 字段
  - Verifies: `specs/cli-init/spec.md` / Requirement "固定工作流安装" / Scenario "忽略全局配置中的 profile 字段"
  - Command: `pnpm test init.test.ts`
  - Expect: 包含 profile 字段时输出警告并继续

---

### Task 7: 更新 update 命令固定更新逻辑

**Goal**: update 命令固定更新 5 个工作流，清理过时配置和残留文件。

**Files**:
- Modify: `src/core/update.ts`
- Test: `test/core/update.test.ts`

**Requirements**:
- 固定从 WorkflowManifestRegistry 获取所有工作流
- 自动清理全局配置中的 profile/workflows 字段
- 删除不在固定列表中的 skill 文件

#### Checks

- [x] C1 验证固定更新 5 个工作流
  - Verifies: `specs/cli-update/spec.md` / Requirement "固定工作流更新" / Scenario "固定更新 5 个工作流"
  - Command: `pnpm test update.test.ts`
  - Expect: update 总是更新 5 个工作流

- [x] C2 验证清理过时配置字段
  - Verifies: `specs/cli-update/spec.md` / Requirement "Update Behavior" / Scenario "清理过时配置字段"
  - Command: `pnpm test update.test.ts`
  - Expect: 检测并删除 profile/workflows 字段，输出警告

- [x] C3 验证清理 expanded 工作流残留
  - Verifies: `specs/cli-update/spec.md` / Requirement "固定工作流更新" / Scenario "清理 expanded 工作流残留"
  - Command: `pnpm test update.test.ts`
  - Expect: 删除 7 个废弃工作流的 skill 目录

---

### Task 8: 删除相关测试文件

**Goal**: 删除 7 个已删除工作流和 profile 系统的测试文件。

**Files**:
- Delete: `test/core/templates/workflows/`
- Delete: `test/commands/config-profile.test.ts`
- Modify: `test/core/workflow-surface.test.ts`

**Requirements**:
- 删除 7 个工作流的测试文件
- 更新 workflow-surface 测试验证 5 个工作流
- 删除 profile 相关测试场景

#### Checks

- [x] C1 验证工作流测试文件已删除
  - Verifies: `specs/ai-workflow-templates/spec.md` / REMOVED Requirement "New Change Workflow Template"
  - Command: `test ! -d test/core/templates/workflows || (find test/core/templates/workflows -name "*.test.ts" | wc -l | grep -q "^0$")`
  - Expect: 工作流测试目录为空或不存在

- [x] C2 验证 workflow-surface 测试通过
  - Verifies: `specs/template-artifact-pipeline/spec.md` / Requirement "Canonical Workflow Manifest" / Scenario "生成制品时使用全部 manifest entries"
  - Command: `pnpm test workflow-surface.test.ts`
  - Expect: 测试通过，验证 5 个工作流

---

### Task 9: 更新文档

**Goal**: 更新所有提到 profile 的文档和 specs。

**Files**:
- Modify: `README.md`
- Modify: `docs/migration-guide.md`
- Modify: `docs/opsx-integration.md`

**Requirements**:
- 更新 README 移除 profile 相关描述
- 更新 migration guide 说明 profile 已删除
- 更新 OPSX 文档反映固定工作流

#### Checks

- [x] C1 验证 README 不提及 expanded/profile
  - Verifies: `specs/cli-init/spec.md` / Requirement "固定工作流安装" / Scenario "固定安装 5 个工作流"
  - Command: `! grep -i "expanded\|profile preset\|core preset" README.md`
  - Expect: README 不包含 profile 相关内容

- [x] C2 验证 migration guide 包含删除说明
  - Verifies: `specs/cli-update/spec.md` / Requirement "Update Behavior" / Scenario "清理过时配置字段"
  - Command: `grep -q "profile.*删除\|profile.*removed" docs/migration-guide.md`
  - Expect: 包含 profile 删除说明
