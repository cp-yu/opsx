<!-- Smart routing: Design Summary found. inputLength=from confirmed explore discussion; detailScore=5/5; multiSubsystem=true but already decomposed by explore; decision=proceed using Design Summary. -->

## Why

当前 apply 主路径已经从旧的 implementer TDD 模型迁移为 Master 直接实现，但模板、schema、README、测试和已生成 skill surface 中仍混有 TDD cycles、direct implementation、`openspec-implementer` 与 `.apply-steps` 的冲突表述。结果是 apply 既不严格 TDD，又容易被残留指令误导。

## What Changes

- 将 `/opsx:apply` Phase 0 定义为 Master agent 严格 TDD：行为/代码变更必须先写或更新测试、确认预期失败、最小实现、确认通过，再勾选 Check。
- 保留当前架构取舍：不恢复 `openspec-implementer`，不恢复 `.apply-steps`，不恢复 cheap coding subagent guidance。
- 明确非运行时文本/制品变更只要求最终证据通过，不伪造 red failure；配置、schema、template 默认按行为变更处理，除非证明没有 runtime consumer。
- 清理 active surface 中 stale apply/implementer 残留，并用测试防止再生。
- 保持 Phase 1 reviewer、Phase 2 optimizer、Phase 3 seal 和现有 recovery loop 不变。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `apply-change-workflow`: apply Phase 0 从“Master 直接实现”收紧为“Master 严格 TDD”，同时继续禁止 `.apply-steps` 和 `openspec-implementer`。
- `apply-task-decomposition`: 任务执行规则改为按 Check 执行 strict red/green cycle，并保留 `tasks.md` 为进度源。
- `cli-artifact-workflow`: schema instructions 输出不再混用旧 TDD cycles 与 direct implementation 文案，明确 strict TDD 与 text-only 例外。
- `internal-skill-installation`: update/init 生成面继续排除 implementer，并清理 managed generated surfaces 中残留的 stale implementer skill。

## Impact

- 影响 `src/core/templates/workflows/apply-change.ts`、`schemas/spec-driven/schema.yaml`、相关 active specs、README/docs、template tests、artifact workflow tests、skill generation/profile drift tests 和已生成 `.codex/.claude/.github` surfaces。
- 不引入新依赖，不新增 executor skill，不改变 verify CLI 数据模型。
- 不修改 `openspec/changes/archive/**` 历史记录。
