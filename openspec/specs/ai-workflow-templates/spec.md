# ai-workflow-templates Specification

## Purpose
此规约记录变更 add-subagent-skills 引入的行为，请在后续同步或归档前补全正式 Purpose。
## Requirements
### Requirement: 内部 subagent skill 引用替换内联 fragment
verify/apply/archive 三个模板中 spawn reviewer subagent 的步骤 SHALL 从传递内联 fragment 文本改为 invoke 对应的 `openspec-reviewer` skill。Spawn optimizer subagent 的步骤 SHALL 从传递内联 fragment 文本改为 invoke 对应的 `openspec-optimizer` skill。

模板中的 invoke 指令 SHALL 使用工具适配的 skill 名称引用（如 Claude Code 使用 `openspec-reviewer`，Codex 使用 `$openspec-reviewer`），利用 `cap.ai.tool-invocation-references` 的现有变换管线。

#### Scenario: Propose 模板包含 spec 发现指令

- **WHEN** propose 模板被加载
- **THEN** SHALL 包含步骤指示 LLM 运行 `openspec spec list --json` 获取现有 specs 及其 capabilities 关联
- **AND** SHALL 指示 LLM 交叉对比提议的新 capabilities 与已有 specs，避免创建冗余 spec

#### Scenario: Apply 模板包含 spec 交叉检查指令

- **WHEN** apply-change 模板被加载
- **THEN** SHALL 包含步骤指示 LLM 在实现 capability 前查询关联的所有 specs
- **AND** SHALL 指示 LLM 运行 `openspec spec list --json` 获取 cap→spec 映射
- **AND** SHALL 指示 LLM 确认是否需要同步更新 delta spec

#### Scenario: Verify 模板 spawn reviewer subagent
- **WHEN** verify 模板在 subagent-orchestrated 模式下执行 Phase 1
- **AND** 当前 AI 工具支持 subagent skill invoke
- **THEN** 模板 SHALL 指示顶层 agent spawn clean-context subagent 并 invoke `openspec-reviewer` skill
- **AND** SHALL 同时传递显式证据包作为 subagent 的输入上下文
- **AND** SHALL NOT 内联输出验证协议、严重性阈值或证据标准的文本

#### Scenario: Apply 模板 Phase 2 的 optimizer subagent
- **WHEN** apply 模板执行 Phase 2 优化循环
- **AND** 需要 spawn optimizer subagent
- **THEN** 模板 SHALL 指示主 agent spawn subagent 并 invoke `openspec-optimizer` skill
- **AND** SHALL 传递 Phase 1 结果、制品、文件内容、config 和 failedDirections

### Requirement: 模板不内联 subagent 角色定义
verify/apply/archive 模板 SHALL NOT 在模板 body 中内联 reviewer 或 optimizer 的完整角色定义、验证协议、判断标准或输出格式。这些内容归对应的 skill 文件所有。

模板 SHALL 保留以下 orchestration 职责的描述：证据包收集、subagent spawn 与 invoke、payload 校验、CLI 持久化、checkpoint 管理和写回执行。

#### Scenario: 模板内容精简
- **WHEN** 比较改进前后的 verify 模板
- **THEN** 改进后模板 SHALL NOT 包含 reviewer 的验证维度列表、severity 定义、或输出 JSON schema
- **AND** 改进后模板 SHALL 保留 evidence 包组装和 subagent spawn 指令

### Requirement: 向后兼容 reread 模式
`current-agent-reread` 执行模式 SHALL 不受影响。不支持 subagent skill invoke 的工具 SHALL 继续使用 reread 骨架，无需加载内部 skill 文件。

#### Scenario: Reread 模式不尝试 invoke 内部 skill
- **WHEN** 当前工具不支持 clean-context subagent verify
- **THEN** 系统 SHALL 使用 reread 骨架
- **AND** SHALL NOT 尝试 invoke 不存在或不可用的 openspec-reviewer/optimizer skill

### Requirement: Verify template 包含 coordinator 角色和 mode label

verify-change template（`buildVerifyIntro`）SHALL 在编号步骤开始前包含显式 coordinator role declaration 和 mode label reference table。

role declaration SHALL 将 coordinator、reviewer subagent、optimizer subagent 和 CLI 定义为职责互不重叠的独立角色。

mode label table SHALL 列出 `verify-prompt-orchestration` capability 中定义的全部 10 个 mode label 及其对应 phase 和 trigger。

#### Scenario: Verify prompt 组装时包含角色声明

- **WHEN** 使用 `SUBAGENT_VERIFY_EXECUTION_MODEL` 调用 `createVerifyChangeSkillTemplateForExecutionModel`
- **THEN** 生成的 skill instructions SHALL 以 coordinator role declaration 开头
- **AND** SHALL 包含 mode label reference table
- **AND** 现有 `"Verify that an implementation matches..."` 文本 SHALL 跟在这些新增内容之后

#### Scenario: Reread mode 同样接收角色和 mode label

- **WHEN** 使用 `REREAD_VERIFY_EXECUTION_MODEL` 调用 `createVerifyChangeSkillTemplateForExecutionModel`
- **THEN** 生成的 skill instructions SHALL 同样包含 coordinator role 和 mode label table
- **AND** reread-specific clean-context protocol SHALL 保持不变

### Requirement: Verify template 对 subagent 使用明确 delegation 指令

`buildSubagentVerifyInstructions` function SHALL 将 Step 5 中的 prose description `"Spawn a clean-context reviewer subagent"` 替换为明确的 subagent delegation instructions。

delegation instructions SHALL 指定：

- 调用 clean-context reviewer subagent
- invoke `openspec-reviewer`
- 传入显式 evidence bundle 结构
- 等待完整 reviewer payload

`buildPhase2Step` function SHALL 将 `"Phase 2 Optimization Protocol"` 中的 prose description 替换为 optimizer subagent 的明确 delegation instructions。

#### Scenario: Reviewer subagent step 具有明确 delegation 指令

- **WHEN** subagent-orchestrated verify prompt 到达 Step 5
- **THEN** prompt SHALL 明确要求调用 clean-context reviewer subagent
- **AND** prompt SHALL instruct reviewer to invoke `openspec-reviewer`
- **AND** prompt SHALL 包含 evidence bundle 字段列表
- **AND** SHALL NOT 只包含 `"Spawn a clean-context reviewer subagent"` 这类 prose

#### Scenario: Optimizer subagent step 具有明确 delegation 指令

- **WHEN** verify prompt 到达 Phase 2 optimization step
- **THEN** prompt SHALL 明确要求调用 clean-context optimizer subagent
- **AND** prompt SHALL instruct optimizer to invoke `openspec-optimizer`
- **AND** SHALL 将 failedDirections 作为具名输入字段传入

#### Scenario: Verify template 不包含工具 API 语法

- **WHEN** verify prompt 被组装
- **THEN** prompt SHALL NOT 包含 `Agent({`
- **AND** prompt SHALL NOT 包含 `TaskOutput({`
- **AND** prompt SHALL NOT 包含 `AskUserQuestion`

### Requirement: Phase 2 checkpoint state machine 使用表格格式

`buildPhase2Step` function SHALL 将 checkpoint state machine description 从连续 prose paragraph 重构为 Markdown table，映射 state、trigger 和 git operation。

`VERIFY_STATE_MACHINE_DIAGRAM` fragment SHALL 放在 Phase 2 section 开头，位于 checkpoint state machine table 之前。

`Hard rules` bullet list SHALL 跟在表格之后，列出不可协商的安全约束。

#### Scenario: Checkpoint state 以表格展示

- **WHEN** verify prompt 到达 Phase 2 checkpoint section
- **THEN** 四个 state（CREATED、BASELINE_RESTORED_FOR_RETRY、TERMINAL_ACCEPTED、TERMINAL_RESTORED）SHALL 出现在表格中
- **AND** 每一行 SHALL 显示 state name、trigger condition 和 git operation
- **AND** 表格前 SHALL 出现 `[Mode: Checkpoint]` label

### Requirement: Verify fragment 提取到 opsx-fragments.ts

coordinator role declaration text 和 subagent timeout/waiting rules SHALL 提取为 `src/core/templates/fragments/opsx-fragments.ts` 中的 exported constants。

新增 constants SHALL 为：

- `VERIFY_COORDINATOR_ROLE`: 包含 4-role table 和 core constraint 的完整 role declaration block
- `VERIFY_SUBAGENT_TIMEOUT_RULES`: 工具无关 timeout/waiting constraints block

这些 fragments SHALL 由 `verify-change.ts` import，并在 `buildVerifyIntro`、`buildSubagentVerifyInstructions` 和 `buildPhase2Step` 的适当组装点注入。

#### Scenario: Fragment 可 import 并可注入

- **WHEN** `verify-change.ts` 需要 coordinator role text
- **THEN** 它 SHALL 从 `opsx-fragments.js` import `VERIFY_COORDINATOR_ROLE`
- **AND** SHALL 不经修改地注入 assembled prompt string
- **AND** SHALL NOT inline duplicate role text

#### Scenario: Timeout rules 注入到所有 subagent spawn 位置

- **WHEN** verify prompt 包含 subagent spawn step
- **THEN** assembled prompt SHALL 包含来自 `VERIFY_SUBAGENT_TIMEOUT_RULES` 的 timeout/waiting rules
- **AND** SHALL 出现在 subagent delegation instructions 之后

### Requirement: Explore invokes impact sweeper
`openspec-explore` SHALL invoke `openspec-impact-sweeper` when exploration reaches a code-change concept that needs impact discovery, a user term does not clearly map to project terminology and affects scope, or the agent is preparing to say the discussion is ready for proposal/change artifacts.

The explore agent SHALL treat the sweeper as a reusable method that may be invoked multiple times in one conversation, one concept per invocation. The explore agent SHALL read the JSON report path returned by the sweeper before summarizing impact findings to the user.

#### Scenario: Proposal readiness requires a sweep
- **WHEN** `openspec-explore` is about to recommend creating or updating proposal/change artifacts
- **AND** the current code-change concept has not already been swept in the conversation
- **THEN** the agent SHALL invoke `openspec-impact-sweeper`
- **AND** SHALL read the generated JSON report before saying the discussion is ready for proposal

#### Scenario: New concept triggers another sweep
- **WHEN** the user introduces a new module, workflow, command, configuration key, project concept, or unfamiliar domain term during explore
- **AND** the term may affect implementation scope
- **THEN** the agent SHALL invoke `openspec-impact-sweeper` for that concept
- **AND** SHALL keep the sweep independent from prior concept sweeps

#### Scenario: Scope-affecting uncertainty asks the user
- **WHEN** the sweeper report includes questions that affect scope or proposal readiness
- **THEN** `openspec-explore` SHALL ask the user instead of silently choosing one interpretation
- **AND** SHALL not claim proposal readiness until the scope-affecting question is resolved or explicitly deferred by the user

### Requirement: Impact sweeper report contract
`openspec-impact-sweeper` SHALL accept lightweight location and concept input from the caller: `projectRoot`, `concept`, optional `optionalChangeName`, optional `knownUserTerms`, and optional `focus`.

The sweeper SHALL write a JSON report under `openspec/sweeper/impact-sweep-<english-project-term-slug>.json` relative to `projectRoot`, overwriting the same concept path on repeat runs. The JSON report SHALL use this schema shape:

```json
{
  "concept": "string",
  "projectRoot": "string",
  "termMappings": [
    {
      "userTerm": "string",
      "projectTerms": ["string"],
      "evidence": ["string"]
    }
  ],
  "opsx": {
    "nodes": [
      {
        "id": "string",
        "reason": "string"
      }
    ],
    "relationsExpanded": [
      {
        "from": "string",
        "to": "string",
        "type": "string"
      }
    ],
    "coverageGaps": ["string"]
  },
  "mustChange": [
    {
      "target": "string",
      "reason": "string",
      "evidence": ["string"]
    }
  ],
  "mustCheck": [
    {
      "target": "string",
      "reason": "string",
      "evidence": ["string"]
    }
  ],
  "coverageGaps": ["string"],
  "questions": ["string"]
}
```

The sweeper response SHALL contain only the report path on success. The report content MAY use natural language in item values, but the JSON field names SHALL remain canonical.

#### Scenario: Sweeper writes project report
- **WHEN** `openspec-impact-sweeper` completes an impact sweep for concept `explore impact sweep`
- **THEN** it SHALL write `openspec/sweeper/impact-sweep-explore-impact-sweep.json`
- **AND** SHALL return that path to the caller
- **AND** SHALL not emit a separate summary

#### Scenario: Sweeper prepares ignored report directory
- **WHEN** `openspec/sweeper/` does not exist
- **THEN** the sweeper SHALL create it
- **AND** SHALL ensure `openspec/sweeper/.gitignore` exists with content that ignores reports while keeping `.gitignore`
- **AND** SHALL NOT modify an existing `.gitignore`

### Requirement: Impact sweeper evidence collection
`openspec-impact-sweeper` SHALL ground impact discovery in OPSX before broad code search. It SHALL read `openspec/project.opsx.yaml`, `openspec/project.opsx.code-map.yaml`, and `openspec/project.opsx.relations.yaml` when present. It SHALL inspect one-hop OPSX neighbors for matched nodes and SHALL expand to second-hop only when the first-hop node is shared infrastructure, cross-domain, or code search shows outward runtime use.

The sweeper SHALL use `git ls-files` as the repository search boundary when available and SHALL exclude `openspec/changes/archive/**`. It SHALL perform repo-wide reverse search for mapped project terms, exported symbols, workflow/skill names, command names, config keys, template fragment names, and path references. It SHALL not rely only on OPSX code-map paths.

#### Scenario: OPSX first then reverse search
- **WHEN** the concept maps to an OPSX capability
- **THEN** the sweeper SHALL read matching OPSX node intent, code-map refs, and direct relations
- **AND** SHALL perform repo-wide reverse search for key mapped project terms and symbols
- **AND** SHALL classify relevant targets into `mustChange`, `mustCheck`, `coverageGaps`, or `questions`

#### Scenario: Multiple term mappings are explored
- **WHEN** a user term maps plausibly to multiple project terms
- **THEN** the sweeper SHALL search all plausible mappings
- **AND** SHALL record mappings and evidence in `termMappings`
- **AND** SHALL put scope-changing ambiguity into `questions`

#### Scenario: Optional change artifacts are scoped
- **WHEN** `optionalChangeName` is provided
- **THEN** the sweeper SHALL read only that change's proposal, specs, design, tasks, and opsx-delta if they exist
- **AND** SHALL NOT inspect unrelated active changes

### Requirement: Impact sweeper write and execution boundaries
`openspec-impact-sweeper` SHALL perform read-only analysis except for its report directory writes. It MAY create `openspec/sweeper/`, create `openspec/sweeper/.gitignore` if missing, and write or overwrite its JSON report. It SHALL NOT modify source files, specs, change artifacts, OPSX files, config, package files, tests, or generated workflow files.

The sweeper SHALL NOT run tests, builds, installs, `git diff`, `git status`, or `git log` as impact evidence. It MAY use `git ls-files`, file reads, and text search. Reports under `openspec/sweeper/` SHALL be treated as working notes, not proposal, design, tasks, specs, OPSX delta, sync input, or archive input.

#### Scenario: No tests or git diff
- **WHEN** the sweeper needs impact evidence
- **THEN** it SHALL use OPSX files, main specs, optional selected change artifacts, git tracked file listing, and text search
- **AND** SHALL NOT run `npm test`, build commands, `git diff`, `git status`, or `git log`

#### Scenario: Only sweeper report files are written
- **WHEN** the sweeper writes output
- **THEN** it SHALL write only under `openspec/sweeper/`
- **AND** SHALL NOT modify any formal OpenSpec artifact or implementation file

