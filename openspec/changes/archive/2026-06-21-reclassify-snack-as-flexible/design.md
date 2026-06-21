## Design Decisions

### Decision 1: 三项变更合并入同一 change

类型联合替换（`'expanded'` → `'flexible'`）、snack 标签重分类、`getWorkflowsForPreset()` 死代码删除 —— 这三者都是 `delete-expanded-profile` 变更未清理干净的尾巴。合并到一个 change 避免分散 review，也让 git history 更清晰地记录"语义标签系统的最终归位"。

### Decision 2: 不调整 bootstrap-opsx 的 `modeMembership: []`

bootstrap-opsx 保持空数组。空标签表达"独立引导工具"语义，既不属于 core 也不属于 flexible —— 这与 bootstrap 是一次性项目初始化工具的定位一致。无变更理由，保持现状。

### Decision 3: 保留 `WorkflowPreset` 联合类型而非改为 `string[]`

虽然 `modeMembership` 已无运行时过滤行为，保留 `WorkflowPreset = 'core' | 'flexible'` 的枚举约束有以下好处：
- 强制新增标签时显式扩展类型，避免笔误
- 编译器能捕获所有标签字面量引用点（本次变更正是利用此特性验证无遗漏）
- 未来如需新增 `'experimental'` 等标签，仍走类型扩展路径

### Decision 4: 不修改 `template-artifact-pipeline` spec

`template-artifact-pipeline/spec.md` 中 "SHALL NOT 使用 modeMembership 过滤" 条款约束的是过滤行为，本次变更强化而非违反该约束 —— snack 改标签后仍被全量安装，无过滤逻辑回潮。该 spec 未断言具体 tag 值，无需 delta。

## Risks

- **类型变更的外部消费者**：已验证 `WorkflowPreset` 仅被 `workflow-surface.ts` re-export，无运行时字面量依赖 `'expanded'`。TS 编译器将捕获所有遗漏。
- **init/update 行为回归**：安装集合来源是 `WorkflowManifestRegistry.entries` 全集（经 `filterByWorkflowIds` 按 workflowId 过滤），不读 `modeMembership`。`test/integration/snack-workflow.test.ts` 的 "init installs 6 workflow skills including snack" 用例作为行为不变的回归保护。

## Alternatives Considered

- **完全删除 `modeMembership` 字段**：被否决。字段作为元数据标签仍有价值（未来可能恢复过滤语义或用于工具链可视化），保留比删除成本低。
- **保留 `'expanded'` 死值**：被否决。死值会让 `WorkflowPreset` 联合类型失去表达力，未来读者无法判断哪些值是 active 的。
- **把本次变更拆分为三个独立 change**：被否决。同源同质，合并更符合精准手术原则。
