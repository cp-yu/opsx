### Task 1: 删除 delivery 配置语义

**Goal**: 从全局配置、schema validation 和迁移路径中删除 active `delivery` 概念。

**Files**:
- Modify: `src/core/global-config.ts`
- Modify: `src/core/config-schema.ts`
- Modify: `src/core/migration.ts`
- Modify: `src/commands/config.ts`
- Test: `test/core/migration.test.ts`
- Test: `test/commands/config.test.ts`

**Requirements**:
- 全局配置不再包含 `delivery` 默认值或 allowed values。
- 旧 `delivery` 字段应被忽略并由 update 配置清理路径移除。
- CLI config validation 不再接受 `delivery` 作为 active key。
- 不引入 delivery deprecated runtime behavior。

#### Checks

- [x] C1 Verify 全局配置结构不含 delivery
  - Verifies: `specs/global-config/spec.md` / Requirement "简化的全局配置结构" / Scenario "配置文件结构", Scenario "默认配置值"
  - Command: `npm test -- test/commands/config.test.ts test/core/migration.test.ts`
  - Expect: 配置读取、默认值和 config key validation 均不暴露 `delivery`

- [x] C2 Verify stale delivery 字段被配置清理处理
  - Verifies: `specs/global-config/spec.md` / Requirement "简化的全局配置结构" / Scenario "读取包含过时字段的配置"
  - Command: `npm test -- test/core/migration.test.ts`
  - Expect: 包含 `delivery` 的旧配置不会影响生成行为，并在清理后不再保留该字段

### Task 2: 收敛 skills-only artifact generation

**Goal**: 让 init/update 的 artifact plan 与 sync engine 只生成和刷新 skills，不再生成、刷新或主动清理 command workflow artifacts。

**Files**:
- Modify: `src/core/workflow-installation.ts`
- Modify: `src/core/templates/sync-engine.ts`
- Modify: `src/core/profile-sync-drift.ts`
- Modify: `src/core/init.ts`
- Modify: `src/core/update.ts`
- Test: `test/core/workflow-installation.test.ts`
- Test: `test/core/update.test.ts`
- Test: `test/core/init.test.ts`
- Test: `test/core/profile-sync-drift.test.ts`

**Requirements**:
- Artifact plan 固定 `shouldGenerateSkills`，不再计算 command delivery。
- `init` 和 `update` 只写 skills 和 shared references。
- command-only 文件不再让工具被视为已配置。
- 旧 command 文件不被主动删除。
- 文件路径构造继续使用 Node path API。

#### Checks

- [x] C3 Verify init skills-only generation
  - Verifies: `specs/cli-init/spec.md` / Requirement "AI Tool Configuration" / Scenario "选择要配置的工具"
  - Command: `npm test -- test/core/init.test.ts test/core/workflow-installation.test.ts`
  - Expect: 初始化为所选工具写入 skills，且不生成 slash command artifacts

- [x] C4 Verify update skills-only refresh
  - Verifies: `specs/cli-update/spec.md` / Requirement "Update Behavior" / Scenario "刷新现有工具制品"
  - Command: `npm test -- test/core/update.test.ts test/core/profile-sync-drift.test.ts`
  - Expect: update 刷新已配置 skills，不把 command-only files 视为配置来源

- [x] C5 Verify 不主动清理旧 command 文件
  - Verifies: `specs/cli-update/spec.md` / Requirement "Update detects configured tools from skills or commands" / Scenario "Commands-only installation"
  - Command: `npm test -- test/core/update.test.ts`
  - Expect: 仅存在旧 command files 的工具不被刷新，旧 command files 不被删除

### Task 3: 删除 active command-generation surface

**Goal**: 从 manifest、skill-generation 和 tool metadata 中移除 active command adapter/generator delivery path。

**Files**:
- Modify: `src/core/shared/skill-generation.ts`
- Modify: `src/core/templates/manifest/`
- Modify: `src/core/config.ts`
- Modify: `src/core/command-generation/`
- Test: `test/core/shared/skill-generation.test.ts`
- Test: `test/core/command-generation/`
- Test: `test/core/templates/skill-templates-parity.test.ts`

**Requirements**:
- workflow manifest 只作为 skill projection 来源。
- `COMMAND_BACKED_TOOL_IDS` 与 command support helper 不再驱动 workflow generation。
- command-generation tests 删除或改为证明 active path 不存在。
- internal subagent skills 不暴露为用户 workflow surface。

#### Checks

- [ ] C6 Verify command-generation requirements removed
  - Verifies: `specs/command-generation/spec.md` / REMOVED Requirement "Command generator function"
  - Command: `npm test -- test/core/shared/skill-generation.test.ts test/core/templates/skill-templates-parity.test.ts`
  - Expect: workflow projections 仍生成 skills，且 active command content generation 不再参与

- [ ] C7 Verify command support metadata 不再驱动生成
  - Verifies: `specs/ai-tool-paths/spec.md` / Requirement "显式的 command-generation 支持元数据" / Scenario "回退行为保持确定性"
  - Command: `npm test -- test/core/workflow-installation.test.ts`
  - Expect: 所有具备 `skillsDir` 的工具走 skills-only 行为，不执行 command support fallback

- [ ] C8 Verify internal skills 保持内部
  - Verifies: `specs/internal-skill-installation/spec.md` / Requirement "内部 skill 不产 slash command" / Scenario "列出 commands 不包含内部 skill"
  - Command: `npm test -- test/core/shared/skill-generation.test.ts`
  - Expect: reviewer/optimizer/impact-sweeper 仅作为 internal subagent skills 安装，不暴露为用户 workflow entries

### Task 4: 统一 subagent workflow templates 与 skill invocation guidance

**Goal**: 删除 reread execution model 分支，并让用户提示使用 skills 语义和中性 fallback。

**Files**:
- Modify: `src/core/templates/workflows/verify-execution-model.ts`
- Modify: `src/core/templates/workflows/verify-change.ts`
- Modify: `src/core/templates/workflows/archive-change.ts`
- Modify: `src/core/templates/workflows/apply-change.ts`
- Modify: `src/utils/command-references.ts`
- Test: `test/core/templates/verify-change.test.ts`
- Test: `test/core/templates/archive-change.test.ts`
- Test: `test/core/templates/apply-change.test.ts`
- Test: `test/core/tool-invocation-references.test.ts`

**Requirements**:
- verify/archive full verify 固定 subagent-orchestrated skeleton。
- templates 不再为 unsupported subagent tools 生成 reread fallback。
- Codex 继续使用精确 `$<skillDirName>`。
- 其他缺少精确 metadata 的工具使用中性 skill invocation 文案。

#### Checks

- [ ] C9 Verify subagent skeleton 固定选择
  - Verifies: `specs/verify-execution-model-selection/spec.md` / Requirement "Verify template selection follows execution model" / Scenario "不支持 clean-context subagent 的工具选择 reread skeleton", Scenario "选择逻辑使用显式 lookup"
  - Command: `npm test -- test/core/templates/verify-change.test.ts test/core/templates/archive-change.test.ts`
  - Expect: 所有工具生成 subagent-orchestrated instructions，输出不包含 current-agent-reread skeleton

- [ ] C10 Verify workflow 引用使用 skill guidance
  - Verifies: `specs/tool-invocation-references/spec.md` / Requirement "Workflow 引用 SHALL 通过显式工具表面元数据渲染" / Scenario "无精确 skill 调用语法时使用中性文案"
  - Command: `npm test -- test/core/tool-invocation-references.test.ts test/core/update.test.ts`
  - Expect: 非 Codex 工具不回退 `/opsx:*` guidance，缺少 metadata 时显示中性 skill invocation 文案

### Task 5: 更新 active specs、docs 和 OPSX

**Goal**: 让 active specs、docs、README 和 OPSX 架构意图与 skills-only surface 一致。

**Files**:
- Modify: `openspec/specs/`
- Modify: `openspec/project.opsx.yaml`
- Modify: `openspec/project.opsx.code-map.yaml`
- Modify: `docs/`
- Modify: `README.md`
- Test: `openspec/changes/skills-only-workflow-surface/`

**Requirements**:
- 只修改 active specs，不修改 archive specs。
- docs 不再把 slash commands 或 delivery mode 描述为 active workflow surface。
- OPSX intent 反映 skills-only 管线和 universal subagent assumption。
- 不为 docs/spec 添加 grep 断言测试。

#### Checks

- [ ] C11 Verify change specs validate
  - Verifies: `specs/profiles/spec.md` / REMOVED Requirement "Delivery is independent of profile"
  - Command: `openspec validate skills-only-workflow-surface --type change --json`
  - Expect: change-local specs、tasks 和 opsx-delta 结构有效

- [ ] C12 Verify docs/spec 更新完成
  - Verifies: `specs/cli-init/spec.md` / Requirement "Success Output" / Scenario "显示成功摘要"
  - Evidence: 人工检查 active specs、docs 和 README 已描述 skills-only workflow surface，且未修改 archive specs
  - Expect: active prose 与设计一致，不新增 docs/spec grep 测试
