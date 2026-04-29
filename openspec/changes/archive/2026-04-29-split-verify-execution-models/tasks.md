## 1. Verify Execution Model Split

- [x] 1.1 将 `verify` 模板拆分为 execution-model-specific skeleton：保留 current-agent-reread 路径，并新增 orchestration-only 的 subagent verify 骨架
- [x] 1.2 调整 Codex / Claude 的模板入口与 resolver lookup，使其显式选择 subagent verify skeleton，而不是继续复用通用主模板后只注入 protocol fragment
- [x] 1.3 抽取或重组 reviewer / optimizer 协议模块，使 subagent skeleton 顶层不再直接承载 completeness、correctness、coherence judgment 语义

## 2. Archive And Optimization Alignment

- [x] 2.1 更新 `archive` full verify rerun 语义：支持 subagent 的工具复用 verify orchestration contract，不再保留 archive 内联的主线程 review 语义
- [x] 2.2 更新 Phase 2 `P1_SPECULATIVE_FENCE` 语义：subagent 模式必须重新调用 reviewer subagent 获取 speculative verdict，reread 模式保持现有契约
- [x] 2.3 对齐 skill / command 生成与相关共享片段，确保 verify 与 archive 的 execution-model 选择逻辑使用显式 lookup，而不是隐式约定或模式匹配

## 3. Tests And Validation

- [x] 3.1 为 verify 模板选择补充测试：覆盖 Codex / Claude 选择 subagent skeleton，其他工具保持 reread skeleton
- [x] 3.2 为 subagent skeleton 补充模板测试：确认顶层模板不再直接包含 Phase 1 judgment 步骤，archive rerun 复用相同 orchestration contract
- [x] 3.3 更新相关模板/快照/skill-generation 测试，并完成一次包含跨平台路径约束检查的回归验证
