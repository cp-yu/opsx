### Task 1: explore 模板指令中的 workflow 引用转换为规范形

**Goal**: 将 explore 模板中 5 处硬编码的 `$openspec-propose`（Codex 语法）替换为规范形 `/opsx:propose`，使其进入 transform 管线。

**Files**:
- Modify: `src/core/templates/workflows/explore.ts`

**Requirements**:
- `BRAINSTORMING_GUIDANCE` 尾部 handoff 提示使用 `/opsx:propose`
- 主 instructions Hard Rules 中的 proposal 路由使用 `/opsx:propose`
- 主 instructions Mandatory Flow 步骤 6 使用 `/opsx:propose`
- `ACTIVE_CHANGE_CAPTURE_GUIDANCE` 中 3 处 example offer 使用 `/opsx:propose`
- 不与 Superpowers reference（工具中立 `openspec-propose`）冲突

#### Checks

- [x] C1 验证 explore 模板不含硬编码 `$openspec-propose`
  - Verifies: `specs/explore-brainstorming/spec.md` / Requirement "Explore 主代理保持只读" / Scenario "Explore 不写入制品"
  - Command: `grep -c '\$openspec-propose' src/core/templates/workflows/explore.ts`
  - Expect: 输出 `0`

- [x] C2 验证 explore 模板使用规范形 `/opsx:propose`
  - Verifies: `specs/explore-brainstorming/spec.md` / Requirement "Explore 捕获边界保持 specs 为可观察行为" / Scenario "其他 insight 路由到对应制品"
  - Command: `grep -c '/opsx:propose' src/core/templates/workflows/explore.ts`
  - Expect: 输出 `6`

### Task 2: 新增 Claude Code transform

**Goal**: 在 `builtin-transforms.ts` 中新增 `claude-command-refs` transform，将 `/opsx:<commandSlug>` 转换为 `/openspec-<skillDirName>`。

**Files**:
- Modify: `src/core/templates/transforms/builtin-transforms.ts`

**Requirements**:
- 注册 `id: 'claude-command-refs'` 的 `ArtifactTransform`
- `applies(ctx)` 返回 `true` 当 `ctx.toolId === 'claude'`
- `transform` 将 `/opsx:propose` 转换为 `/openspec-propose`
- 与已有 Codex/OpenCode/Pi transform 使用相同 priority 和 phase (`preAdapter`, `priority: 10`)
- 复用 `buildReplacementPairs()` 的 `PAIRS`，通过 `codexTarget.slice(1)` 推导 Claude target

#### Checks

- [x] C3 验证 Claude transform 已注册
  - Verifies: `specs/tool-invocation-references/spec.md` / Requirement "Workflow 引用 SHALL 通过显式工具表面元数据渲染" / Scenario "Claude Code 引用使用 slash-command 格式"
  - Command: `grep -c "'claude-command-refs'" src/core/templates/transforms/builtin-transforms.ts`
  - Expect: 输出 `1`

- [x] C4 验证 Claude transform 正确转换 `/opsx:apply` → `/openspec-apply-change`
  - Verifies: `specs/tool-invocation-references/spec.md` / Requirement "Workflow 引用 SHALL 通过显式工具表面元数据渲染" / Scenario "Claude Code 引用使用 slash-command 格式"
  - Command: `npx vitest run test/core/templates/transforms.test.ts -t "claude"`
  - Expect: 测试通过

### Task 3: 注册 Claude transform ID 到 tool-profile

**Goal**: 在 `tool-profile/registry.ts` 中注册 `CLAUDE_COMMAND_REFS` 常量，并在 `resolveTransforms('claude')` 中返回，使技能生成管线识别 Claude 的 transform。

**Files**:
- Modify: `src/core/templates/tool-profile/registry.ts`

**Requirements**:
- 新增 `TRANSFORM_IDS.CLAUDE_COMMAND_REFS = 'claude-command-refs'`
- `resolveTransforms('claude')` 返回包含 `TRANSFORM_IDS.CLAUDE_COMMAND_REFS` 的数组
- 不影响其他工具的 `resolveTransforms` 结果

#### Checks

- [x] C5 验证 Claude profile 包含正确 transform
  - Verifies: `specs/tool-invocation-references/spec.md` / Requirement "Workflow 引用 SHALL 通过显式工具表面元数据渲染" / Scenario "Claude Code 引用使用 slash-command 格式"
  - Command: `grep -c "CLAUDE_COMMAND_REFS" src/core/templates/tool-profile/registry.ts`
  - Expect: 输出 `2`（声明处 + resolveTransforms 引用处）

### Task 4: 更新测试断言以匹配新行为

**Goal**: 更新受影响的测试文件，确保修改后的代码通过现有测试套件。

**Files**:
- Modify: `test/core/templates/explore-template.test.ts`
- Modify: `test/core/templates/transforms.test.ts`
- Modify: `test/core/templates/tool-profile.test.ts`

**Requirements**:
- explore 模板测试中 `$openspec-propose` 断言改为 `/opsx:propose`
- transforms 测试中 Claude pass-through 改为预期转换
- tool-profile 测试中常量列表包含 `claude-command-refs`
- 不引入新测试（已在 Task 2 中覆盖 Claude transform 单元测试）

#### Checks

- [x] C6 验证全部测试套件通过
  - Verifies: `specs/explore-brainstorming/spec.md` / Requirement "Explore 主代理保持只读" / Scenario "Explore 不写入制品"
  - Command: `npx vitest run test/core/templates/explore-template.test.ts test/core/templates/transforms.test.ts test/core/templates/tool-profile.test.ts`
  - Expect: 全部测试通过
