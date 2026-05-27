## Context

`tasks.md` 已分离 `Actions` 和 `Checks`，并通过 `Covers:` 表达检查项和实现动作的关系。现有结构校验只证明 check 覆盖了 action，不能证明 check 锚定了 spec requirement/scenario，因此浅层 grep、文件存在检查仍可通过。

## Goals / Non-Goals

**Goals:**
- 让每个 check 必填 `Verifies:`，把验证意图锚定到 change-local spec requirement/scenario。
- 保持 `Verifies:` 路径语义明确：相对 change 目录的 `specs/<capability>/spec.md`。
- 用确定性 parser/validator 检查字段、路径和 requirement/scenario 引用存在性。

**Non-Goals:**
- 不修改 `apply` 或 `verify` workflow 运行逻辑。
- 不做全局 requirement/scenario coverage 统计。
- 不判断 command、expect 或 verifies target 的语义充分性。

## Decisions

### Decision 1: Verifies 成为 check 的结构字段

`tasks` instruction 和 `tasks.md` template 都加入 `Verifies:`。格式推荐为：

```md
- Verifies: `specs/<capability>/spec.md` / Requirement "<requirement name>" / Scenario "<scenario name>"
```

`Scenario` 和 `Scenarios` 两种关键词在 validator 中兼容，但提示词只展示一种清晰示例。

### Decision 2: spec 路径是 change-local 相对路径

`Verifies:` 中的 spec path 只表达 change 目录内的 delta spec，例如 `specs/cli-artifact-workflow/spec.md`。实现用 `path.join(changeDir, verifiesPath)` 解析，不解析主规约 `openspec/specs/...`。

**替代方案**: 允许主规约路径。拒绝；新增 requirement 在归档前不在主规约中，MODIFIED requirement 也应验证本次 delta 内容。

### Decision 3: validateTaskStructure 只做确定性引用校验

扩展 `validateTaskStructure` 以解析 `Verifies:`，并接收可选的 changeDir 或 spec lookup context。规则：

- 缺失或空 `Verifies:` 为 ERROR
- 有 local specs 时，格式错误、非法路径、spec 文件缺失、requirement 不存在、scenario 不存在为 ERROR
- 没有 local specs 时，非空 `Verifies:` 不要求 spec path，并返回 WARNING 说明跳过 requirement/scenario 交叉校验

不做 coverage 统计，也不做语义充分性判断。

### Decision 4: post-propose 继续 warning-only

`/opsx:propose` 的 post-propose validation 把新增 task structure issues 作为 warning 汇总，并最多执行一轮文档修复。不会把 propose 改成阻断式 gate。

## Risks / Trade-offs

[Risk] Agent 在无 specs change 中写出自然语言 `Verifies:` 后无法交叉校验 → Mitigation: validator 返回 warning，明确没有 change-local specs，跳过 requirement/scenario 校验。

[Risk] 路径规则被写成主规约路径 → Mitigation: 提示词和 validator 都拒绝 `openspec/specs/...`、绝对路径、父级跳转和反斜杠路径。

[Risk] validator 变重 → Mitigation: 不做全局覆盖率统计，不引入 Proposal/Design/Task-only fallback，不做 fuzzy matching。

## Migration Plan

1. 更新 `tasks` artifact instruction 和 template。
2. 扩展 `validateTaskStructure` 的字段解析、issue codes 和可选 spec lookup。
3. 更新 post-propose validation 文案。
4. 补充 task instruction、template、task parser 和 propose template 测试。
