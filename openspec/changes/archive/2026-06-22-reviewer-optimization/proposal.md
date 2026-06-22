## Why

当前 apply-change skill 的执行纪律存在两个缺口：一是 TDD 实现循环启动前缺乏对 tasks.md 内部一致性的预检，导致 task 间矛盾在执行中才暴露、浪费整轮 TDD 成本；二是 Recovery Protocol 仅定义 pause 条件（相同 error × 2）而未约束诊断行为，使 agent 在 error signature 持续变化时陷入无限"猜测→修→猜测"循环。借鉴 Superpowers v6 的 pre-flight plan review 和 systematic debugging 纪律来填补。

## What Changes

- 在 apply-change skill 的 Step 5（OPSX 导航）之后、Branch Isolation 之前新增 **Pre-flight Scan** 步骤：扫描 tasks.md 所有 task 的 Goal/Files/Requirements/Checks，检测 task 间矛盾和依赖顺序问题
- **替换** 现有 `Continuous Recovery Protocol` 段落为增强版：增加诊断优先、单变量修复和累计 3-strike 计数器纪律；删除 "A changed normalized error signature is progress" 假设

## Capabilities

### New Capabilities

- `apply-preflight-scan`: apply 执行前的 tasks.md 一致性预检，检测 task 间矛盾和依赖顺序问题
- `apply-recovery-protocol-enhanced`: 增强版 Recovery Protocol，引入诊断优先、单变量修复和累计 3-strike 升级机制

### Modified Capabilities

- `apply-task-decomposition`: 修改"任务执行失败处理"requirement，删除"错误变化继续执行"语义，替换为累计计数器 + 诊断优先纪律

## Impact

- 仅影响 `.pi/skills/openspec-apply-change/SKILL.md` 和对应 spec
- 不涉及 CLI 代码变更、新 subagent、新脚本
- 不影响 reviewer/optimizer 行为
- 现有 `apply-task-decomposition` spec 的"任务执行失败处理" requirement 需要重写
