## Context

apply-change skill 是纯 prompt 制品（`.pi/skills/openspec-apply-change/SKILL.md`），不涉及 TypeScript 运行时代码。变更对象是 agent 行为指令文本。

当前 apply flow：
1. Select change → 2. CLI status/instructions → 3. OPSX context → 4. Read context files → 5. CLI OPSX 导航 → **6. Branch Isolation** → 7. TDD 实现

目标：在 5 和 6 之间插入 pre-flight scan，替换 7 内部的 recovery protocol。

## Goals / Non-Goals

**Goals:**
- 在 TDD 循环启动前发现 tasks.md 内部矛盾和依赖顺序问题，零成本中止
- 约束 agent 的调试行为：先诊断再修复、单变量、有明确升级出口
- 堵住"error signature 持续变化 → 永不 pause"的漏洞

**Non-Goals:**
- 不引入新 subagent、新脚本或 CLI 代码变更
- 不改变 Phase 1/2/3 的 reviewer/optimizer 行为
- 不改变 TDD Checkpoint 1-3 的内容
- 不修改 tasks.md 的格式规范

## Decisions

### Decision 1: Pre-flight scan 是 agent 行为指令，不是程序化校验

**选择**：在 SKILL.md 中新增文本段落，要求 agent 读完 context 后执行一次扫描。

**替代方案**：实现 CLI 命令（如 `openspec preflight`）做程序化检测。

**理由**：变更影响面最小，且检测逻辑（task 间语义矛盾）本身需要 LLM 推理能力，纯规则引擎覆盖不了全部场景。

### Decision 2: 删除"error signature 变化 = 进步"假设

**选择**：删除此假设，用累计 3-strike 计数器替代。

**理由**：此假设允许 agent 在每次产生不同错误时无限重试。3 次累计上限既给了合理的重试空间，又有确定性的停止点。

### Decision 3: 3-strike 后的行为是 pause + 呈现证据，不是自动回退

**选择**：agent 停下来向用户呈现已尝试路径和根因判断，由用户决定下一步。

**替代方案**：自动回退到上一个 checkpoint commit。

**理由**：3 次失败的根因可能是 spec/design 有问题，自动回退不解决根因且浪费用户时间。

## Risks / Trade-offs

- **Pre-flight scan 误报**：LLM 可能将非矛盾判为矛盾 → 用户可指示忽略，不会死锁
- **3-strike 对复杂 task 可能过于保守** → 用户在 pause 后可指示继续，计数器重置
- **spec 改动会破坏现有 apply-task-decomposition spec 的"错误变化继续执行"scenario** → 需要 delta spec 删除该 scenario
