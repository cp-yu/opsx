# Tasks: restore-unified-opsx-read

### Task 1: 重写 OPSX 上下文 fragments

**Goal**: 将 `OPSX_SHARED_CONTEXT` 重写为单文件协议（含 `project:` intent/scope 指引），将 `OPSX_CLI_QUERY_CONTEXT` 措辞改为点查询互补定位。

**Files**:
- Modify: `src/core/templates/fragments/opsx-fragments.ts`
- Test: `test/core/templates/opsx-fragments.test.ts`

**Requirements**:
- `OPSX_SHARED_CONTEXT` 仅指引整读 `openspec/project.opsx.yaml`，删除 code-map 与 specs/ 指引行
- intent/scope 指引行位于 "domains → capabilities structure" 指引之后
- 保留"导航上下文，不替代 change artifacts"定位句与 `OPSX_READ_CONTEXT` 别名
- `OPSX_CLI_QUERY_CONTEXT` 首句去除 "instead of reading OPSX YAML files directly"，改为共享读取之后的节点细节补充表述
- fragment 总长保持 5 行以内，不拆分引用文件

#### Checks

- [x] C1 验证共享 fragment 为单文件协议
  - Verifies: `specs/opsx-shared-context/spec.md` / Requirement "统一加载协议" / Scenario "OPSX_SHARED_CONTEXT 为单文件协议"
  - Command: `pnpm test opsx-fragments`
  - Expect: fragment 文本仅含 `openspec/project.opsx.yaml` 一个文件路径，无 code-map/relations/specs 读取指引，定位句保留

- [x] C2 验证 intent/scope 指引行及其位置
  - Verifies: `specs/opsx-shared-context/spec.md` / Requirement "统一加载协议" / Scenario "OPSX_SHARED_CONTEXT 包含 project 元数据引导"
  - Command: `pnpm test opsx-fragments`
  - Expect: fragment 含读取 `project:` 块 intent/scope 的显式指引，且位于 domains 指引之后

- [x] C3 验证 CLI 查询 fragment 互补措辞
  - Verifies: `specs/opsx-shared-context/spec.md` / Requirement "CLI 点查询互补定位" / Scenario "CLI 查询 fragment 不与共享直读冲突"
  - Command: `pnpm test opsx-fragments`
  - Expect: 不含 "instead of reading OPSX YAML files directly"，含共享读取后用 `openspec opsx query <node-id> --json` 获取节点细节的表述

### Task 2: 统一注入三个工作流模板并翻转测试断言

**Goal**: propose/apply 的 skill 与 command 双模板注入 `OPSX_SHARED_CONTEXT`（位置：propose 在 artifact 生成循环前、apply 在读取 change artifacts 前），整体重写 `opsx-fragments.test.ts` 中的注入分轨断言。

**Files**:
- Modify: `src/core/templates/workflows/propose.ts`
- Modify: `src/core/templates/workflows/apply-change.ts`
- Test: `test/core/templates/opsx-fragments.test.ts`
- Test: `test/core/templates/propose-template.test.ts`
- Test: `test/core/templates/explore-template.test.ts`

**Requirements**:
- explore/propose/apply 的 skill + command 模板均包含 `OPSX_SHARED_CONTEXT`
- propose/apply 模板同时保留 `OPSX_CLI_QUERY_CONTEXT` 注入
- explore 模板独有 `OPSX_NAVIGATION_GUIDANCE`，`explore.ts` 源码零改动
- 整体重写旧断言"仅 explore 直读、propose/apply 不得含直读措辞"（不逐行修补），删除全部反向断言
- 注入位置用锚点字符串 indexOf 相对位置断言

#### Checks

- [x] C1 验证 propose 双模板注入及位置
  - Verifies: `specs/opsx-shared-context/spec.md` / Requirement "统一加载协议" / Scenario "Propose 在 artifact 生成前加载 OPSX"
  - Command: `pnpm test opsx-fragments propose-template`
  - Expect: propose skill + command 模板均含 `OPSX_SHARED_CONTEXT`，且出现在 artifact 生成循环锚点之前

- [x] C2 验证 apply 双模板注入及位置
  - Verifies: `specs/opsx-shared-context/spec.md` / Requirement "统一加载协议" / Scenario "Apply 使用共享上下文"
  - Command: `pnpm test opsx-fragments`
  - Expect: apply skill + command 模板均含 `OPSX_SHARED_CONTEXT`，且出现在读取 change artifacts 步骤之前

- [x] C3 验证 explore 保持共享 fragment 加宽视野导航
  - Verifies: `specs/opsx-shared-context/spec.md` / Requirement "统一加载协议" / Scenario "Explore 使用共享上下文"
  - Command: `pnpm test opsx-fragments explore-template`
  - Expect: explore 模板含 `OPSX_SHARED_CONTEXT` 与 `OPSX_NAVIGATION_GUIDANCE`，`explore.ts` 无源码 diff

### Task 3: 再生生成物并全量回归

**Goal**: 经 `openspec update` 再生 `.claude/skills/` 与 `.claude/commands/` 生成物，确认生成面与模板一致，全量测试通过。

**Files**:
- Modify: `.claude/skills/openspec-propose/SKILL.md`
- Modify: `.claude/skills/openspec-apply-change/SKILL.md`
- Modify: `.claude/skills/openspec-explore/SKILL.md`
- Modify: `.claude/commands/opsx/propose.md`
- Modify: `.claude/commands/opsx/apply.md`

**Requirements**:
- 生成物仅经 `openspec update` 再生，不手改
- 再生后抽查：propose/apply 生成物含单文件直读指引与 CLI 互补措辞，explore 生成物保留宽视野导航
- `pnpm test` 全量通过（含 `skill-template-length-check` 长度约束回归）

#### Checks

- [x] C1 验证生成物与模板一致
  - Verifies: `specs/opsx-shared-context/spec.md` / Requirement "统一加载协议" / Scenario "Propose 在 artifact 生成前加载 OPSX", "Apply 使用共享上下文"
  - Command: `openspec update && git diff --stat .claude/`
  - Evidence: 再生后 `.claude/skills/openspec-{propose,apply-change}/SKILL.md` 与 `.claude/commands/opsx/{propose,apply}.md` 含 `project.opsx.yaml` 整读指引；无手改痕迹
  - Expect: 生成物内容与模板注入一致

- [x] C2 全量测试回归
  - Verifies: `specs/opsx-shared-context/spec.md` / Requirement "CLI 点查询互补定位" / Scenario "CLI 查询 fragment 不与共享直读冲突"
  - Command: `pnpm test`
  - Expect: 全量通过，含 skill 模板长度约束测试

## Remediation

- [x] [code_fix] CRITICAL Cleanliness: 已将不属于本变更范围的 `temp` 从 staged diff 中移除，避免进入验证/优化提交范围。
