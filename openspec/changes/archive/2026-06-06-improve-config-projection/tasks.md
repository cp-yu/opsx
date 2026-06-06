### Task 1: 重命名 docLanguage 为 proseLanguage（代码层）

**Goal**: 将 `docLanguage` 字段重命名为 `proseLanguage`，同时保留 `docLanguage` 作为兼容回退。修改所有相关源文件。

**Files**:
- Modify: `src/core/project-config.ts`
- Modify: `src/core/config-projection.ts`
- Modify: `src/core/init.ts`
- Modify: `src/core/config-prompts.ts`
- Modify: `src/core/templates/fragments/opsx-fragments.ts`
- Modify: `openspec/config.yaml`

**Requirements**:
- Zod schema 同时接受 `proseLanguage`（优先）和 `docLanguage`（deprecated fallback）
- `normalizeProjectConfig()` 在 `docLanguage` 存在且 `proseLanguage` 不存在时自动迁移
- `config-projection.ts` 中所有函数名、变量名、接口字段名同步更新
- `openspec/config.yaml` 将 `docLanguage: 中文` 改为 `proseLanguage: 中文`

#### Checks

- [x] C1 验证 proseLanguage 优先读取
  - Verifies: `specs/config-loading/spec.md` / Requirement "Load project config from openspec/config.yaml" / Scenario "Both proseLanguage and docLanguage are present"
  - Command: `pnpm test -- --testPathPattern="project-config|config-projection"`
  - Expect: 所有现有测试通过

- [x] C2 验证 docLanguage 回退兼容
  - Verifies: `specs/config-loading/spec.md` / Requirement "Load project config from openspec/config.yaml" / Scenario "docLanguage field is valid (legacy)"
  - Command: `pnpm test -- --testPathPattern="project-config"`
  - Expect: 旧字段名 docLanguage 仍可正常解析

- [x] C3 验证 config.yaml 字段名已更新
  - Verifies: `specs/config-loading/spec.md` / Requirement "Load project config from openspec/config.yaml" / Scenario "proseLanguage field is valid"
  - Evidence: `openspec/config.yaml` 文件内容
  - Expect: 文件中包含 `proseLanguage: 中文` 而非 `docLanguage`

### Task 2: 新增 openspec config project CLI 命令

**Goal**: 添加 `openspec config project` 子命令，返回归一化项目配置。

**Files**:
- Modify: `src/commands/config.ts`
- Test: `tests/commands/config-project.test.ts`

**Requirements**:
- `--json` 输出使用 `NormalizedProjectConfig` 格式
- 无 `--json` 时输出人类可读的 YAML-like 文本
- 缺少 `openspec/config.yaml` 时返回 `{ "rules": {} }`
- 在 `openspec config --help` 中显示为子命令

#### Checks

- [x] C4 验证 JSON 输出包含完整配置
  - Verifies: `specs/config-project-query/spec.md` / Requirement "查询项目配置" / Scenario "JSON 输出包含完整配置"
  - Command: `openspec config project --json`
  - Expect: JSON 输出包含 proseLanguage、context、optimization、propose、apply、git、rules 字段

- [x] C5 验证缺少 config.yaml 时返回空配置
  - Verifies: `specs/config-project-query/spec.md` / Requirement "查询项目配置" / Scenario "缺少 config.yaml 时返回空配置"
  - Command: `cd /tmp && mkdir -p empty-project && cd empty-project && openspec config project --json`
  - Expect: 输出 `{"rules": {}}`

- [x] C6 验证帮助信息显示
  - Verifies: `specs/config-project-query/spec.md` / Requirement "命令集成于 config 子命令体系" / Scenario "帮助信息"
  - Command: `openspec config --help`
  - Expect: 显示 project 子命令条目

### Task 3: apply instructions 增加 configProjection 输出

**Goal**: `generateApplyInstructions()` 返回中增加 `configProjection` 字段。

**Files**:
- Modify: `src/core/artifact-graph/instruction-loader.ts`
- Test: `tests/commands/instructions-apply.test.ts`

**Requirements**:
- `openspec instructions apply --json` 输出包含 `configProjection` 字段
- 文本输出包含 `<config_projection>` XML 区块
- 结构与 `generateInstructions()` 中的 `configProjection` 一致

#### Checks

- [x] C7 验证 JSON 输出包含 configProjection
  - Verifies: `specs/config-apply-projection/spec.md` / Requirement "apply instructions 包含配置投影" / Scenario "JSON 输出包含 configProjection"
  - Command: `openspec instructions apply --change "improve-config-projection" --json | jq '.configProjection'`
  - Expect: 输出包含 normalized 和 prompt 字段

- [x] C8 验证文本输出包含配置投影区块
  - Verifies: `specs/config-apply-projection/spec.md` / Requirement "文本输出包含配置投影信息" / Scenario "文本格式的配置投影"
  - Command: `openspec instructions apply --change "improve-config-projection" | grep -A5 "config_projection"`
  - Expect: 输出中可见 `<config_projection>` XML 标签

### Task 4: 更新 Skill 文档

**Goal**: 在 propose、apply、archive skill 文档中显式声明配置读取步骤。

**Files**:
- Modify: `.claude/skills/openspec-propose/SKILL.md`
- Modify: `.claude/skills/openspec-apply-change/SKILL.md`
- Modify: `.claude/skills/openspec-archive-change/SKILL.md`

**Requirements**:
- propose 第 6 步显式列出 `configProjection` 为必须读取字段
- apply 第 2 步明确读取 `configProjection` 获取 `proseLanguage` 和 `apply.defaultIsolation`
- archive 第 0 步（序言）说明使用 `openspec config project --json` 获取 git 配置投影
- 所有 skill 中 `docLanguage` 引用更新为 `proseLanguage`

#### Checks

- [x] C9 验证 propose skill 包含 configProjection 读取指令
  - Verifies: `specs/config-apply-projection/spec.md` / Requirement "apply instructions 包含配置投影" / Scenario "JSON 输出包含 configProjection"
  - Evidence: `.claude/skills/openspec-propose/SKILL.md` 第 6 步文本
  - Expect: 步骤中包含 "configProjection" 关键字和 "proseLanguage"

- [x] C10 验证 apply skill 包含 configProjection 读取指令
  - Verifies: `specs/config-apply-projection/spec.md` / Requirement "apply instructions 包含配置投影" / Scenario "JSON 输出包含 configProjection"
  - Evidence: `.claude/skills/openspec-apply-change/SKILL.md` 第 2 步文本
  - Expect: 步骤中显式提及 configProjection.prompt.fragments

- [x] C11 验证 archive skill 使用 openspec config project 获取 git 配置
  - Verifies: `specs/config-project-query/spec.md` / Requirement "查询项目配置" / Scenario "JSON 输出包含完整配置"
  - Evidence: `.claude/skills/openspec-archive-change/SKILL.md` 序言文本
  - Expect: 包含 `openspec config project --json` 命令引用

### Task 5: 更新测试

**Goal**: 更新受字段重命名影响的测试，添加新命令的测试覆盖。

**Files**:
- Test: `tests/unit/project-config.test.ts`
- Test: `tests/unit/config-projection.test.ts`
- Test: `tests/pbt/config-projection-pbt.test.ts`
- Test: `tests/commands/config-project.test.ts`

**Requirements**:
- 现有测试中的 `docLanguage` 引用更新为 `proseLanguage`
- 新增 `openspec config project --json` 命令测试
- 新增 `generateApplyInstructions` 包含 `configProjection` 的测试
- 新增 `docLanguage` 回退兼容测试

#### Checks

- [x] C12 验证全量测试通过
  - Verifies: `specs/config-loading/spec.md` / Requirement "Load project config from openspec/config.yaml" / Scenario "docLanguage field is valid (legacy)"
  - Command: `pnpm test`
  - Expect: 所有测试套件通过，无回归

- [x] C13 验证 docLanguage → proseLanguage 迁移测试
  - Verifies: `specs/config-loading/spec.md` / Requirement "Load project config from openspec/config.yaml" / Scenario "docLanguage field is valid (legacy)"
  - Command: `pnpm test -- --testPathPattern="project-config|config-projection"`
  - Expect: docLanguage 兼容回退测试和 proseLanguage 测试均通过
