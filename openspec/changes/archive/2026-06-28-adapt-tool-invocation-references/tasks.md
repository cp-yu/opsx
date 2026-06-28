### Task 1: 工具调用引用渲染

**Goal**: 让 workflow reference renderer 和 transform pipeline 按工具输出正确 invocation。

**Files**:
- Modify: `src/core/templates/transforms/builtin-transforms.ts`
- Modify: `src/utils/command-references.ts`
- Test: `test/core/templates/transforms.test.ts`
- Test: `test/utils/command-references.test.ts`

**Requirements**:
- Codex 使用 `$<skillDirName>`。
- Claude 使用 `/<skillDirName>`。
- Pi 使用 `/skill:<skillDirName>`。
- OpenCode 保持 `/opsx-<commandSlug>`。
- 未知工具保持中性 skill invocation 文案。

#### Checks

- [x] C1 Verify Pi skill invocation transform
  - Verifies: `specs/tool-invocation-references/spec.md` / Requirement "Workflow 引用 SHALL 通过显式工具表面元数据渲染" / Scenario "Pi 引用使用 skill 前缀格式"
  - Command: `npm test -- test/core/templates/transforms.test.ts test/utils/command-references.test.ts`
  - Expect: Pi workflow references render `/skill:openspec-archive-change` and `/skill:openspec-apply-change`

- [x] C2 Verify existing tool invocation boundaries
  - Verifies: `specs/tool-invocation-references/spec.md` / Requirement "Workflow 引用 SHALL 通过显式工具表面元数据渲染" / Scenario "Codex 引用使用精确的受管 skill 名称", "Claude Code 引用使用 slash-command 格式", "OpenCode 引用保持 command-backed 格式", "无精确语法的工具使用中性文案", "替换范围仅限已注册 workflow surface"
  - Command: `npm test -- test/core/templates/transforms.test.ts test/utils/command-references.test.ts`
  - Expect: Codex, Claude, OpenCode, fallback, and unknown `/opsx:unknown` behavior remain covered by tests

### Task 2: Apply archive-ready handoff

**Goal**: 让 apply 完成提示使用 canonical archive reference，最终由工具适配输出用户可调用 invocation。

**Files**:
- Modify: `src/core/templates/workflows/apply-change.ts`
- Test: `test/core/templates/apply-change.test.ts`

**Requirements**:
- apply skill template source text 使用 `/opsx:archive <change-name>`。
- apply template source text 不再硬编码 `/opsx-archive`。
- archive-ready call-to-action 仍保留 `Archive ready.` 和 `<change-name>`。

#### Checks

- [x] C3 Verify archive-ready canonical source
  - Verifies: `specs/opsx-apply-skill/spec.md` / Requirement "Apply 完成时输出 archive 指引" / Scenario "seal 通过后输出 call-to-action"
  - Command: `npm test -- test/core/templates/apply-change.test.ts`
  - Expect: apply template contains `Archive ready. Run /opsx:archive <change-name> to complete the workflow.` and does not contain `Archive ready. Run /opsx-archive`

- [x] C4 Verify generated archive handoff can be tool-adapted
  - Verifies: `specs/opsx-apply-skill/spec.md` / Requirement "Apply 完成时输出 archive 指引" / Scenario "seal 通过后输出 call-to-action"
  - Command: `npm test -- test/core/templates/transforms.test.ts test/core/templates/apply-change.test.ts`
  - Expect: canonical archive source is available for transform tests covering Codex, Claude, Pi, and OpenCode archive invocation

## Remediation

- [x] [code_fix] 为缺少精确 invocation 语法的 skill 工具补充 transform fallback，避免 generated skills 保留 `/opsx:*` source reference。
