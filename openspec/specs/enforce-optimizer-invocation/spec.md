# enforce-optimizer-invocation Specification

## Purpose
此规约记录变更 enforce-optimizer-subagent 引入的行为，请在后续同步或归档前补全正式 Purpose。
## Requirements
### Requirement: CLI 拒绝无证据的 NO_OPTIMIZATION_NEEDED

系统 SHALL 在 `handleOptimization()` 中校验 `NO_OPTIMIZATION_NEEDED` 的 `summary` 字段，当 summary 为空或缺失时拒绝该请求，返回错误码和诊断信息。

#### Scenario: summary 非空时接受 NO_OPTIMIZATION_NEEDED

- **WHEN** agent 调用 `openspec verify phase2 "<change>" --type=optimization --input '{"status":"NO_OPTIMIZATION_NEEDED","summary":"..."}'`
- **AND** `summary` 字段为非空字符串（trim 后长度 > 0）
- **THEN** CLI SHALL 接受该请求
- **AND** 将 `optimization.status` 设为 `NOT_NEEDED`
- **AND** 返回 `{ ok: true }`

#### Scenario: summary 缺失时拒绝 NO_OPTIMIZATION_NEEDED

- **WHEN** agent 调用 `openspec verify phase2 "<change>" --type=optimization --input '{"status":"NO_OPTIMIZATION_NEEDED"}'`
- **AND** `summary` 字段不存在
- **THEN** CLI SHALL 拒绝该请求
- **AND** 返回 `{ ok: false, reason: "OPTIMIZER_REQUIRED" }`
- **AND** 输出诊断信息: "NO_OPTIMIZATION_NEEDED requires a non-empty summary from the optimizer subagent"
- **AND** 返回 exit code 1

#### Scenario: summary 为空字符串时拒绝 NO_OPTIMIZATION_NEEDED

- **WHEN** agent 调用 `openspec verify phase2 "<change>" --type=optimization --input '{"status":"NO_OPTIMIZATION_NEEDED","summary":"  "}'`
- **AND** `summary` 字段 trim 后为空字符串
- **THEN** CLI SHALL 拒绝该请求
- **AND** 行为等同于 summary 缺失

### Requirement: Prompt fragment 强制委托 optimizer subagent

`VERIFY_SIMPLE_CHANGE_FAST_PATH` 常量 SHALL 重写为强制委托语义，明确禁止 master agent 自行判断是否需要优化，要求始终 spawn optimizer subagent。

#### Scenario: 常量名保持不变

- **WHEN** 开发者修改 `src/core/templates/fragments/opsx-fragments.ts`
- **THEN** SHALL 保持常量名 `VERIFY_SIMPLE_CHANGE_FAST_PATH` 不变
- **AND** 所有现有引用点（`apply-change.ts`）无需修改 import

#### Scenario: 新文本禁止 master agent 自主判断

- **WHEN** `VERIFY_SIMPLE_CHANGE_FAST_PATH` 被渲染到 agent prompt 中
- **THEN** 文本 SHALL 包含以下语义约束：
  - MUST spawn optimizer subagent 至少一次
  - optimizer subagent（而非 master agent）决定是否需要优化
  - 若 optimizer 返回 "No optimization opportunities found"，记录 `NO_OPTIMIZATION_NEEDED` 并将 optimizer 结论作为 summary
  - master agent MUST NOT 自行做出 "not needed" 判断
  - 唯一例外为 `--skip-optimization` flag 或 `optimization.enabled: false`

### Requirement: Apply 编排文本明确角色分离

`apply-change.ts` 中 Phase 2 编排段落 SHALL 在开头增加强制约束文本，明确 master agent 角色为 evidence collector 和 patch applicator，不得替代 optimizer 做判断。

#### Scenario: Phase 2 段落包含角色约束

- **WHEN** apply skill 模板被渲染
- **THEN** Phase 2 段落 SHALL 包含以下语义：
  - 始终 spawn optimizer subagent 作为 Phase 2 第一个动作
  - optimizer subagent 读取 change artifacts 和 Phase 1 issues 后决定是否存在优化机会
  - master agent 角色为 evidence collector 和 patch applicator，不是 optimization judge

