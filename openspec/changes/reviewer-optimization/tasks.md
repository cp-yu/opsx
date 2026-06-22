### Task 1: 新增 Pre-flight Scan 步骤到 apply-change skill 模板

**Goal**: 在 apply-change workflow 模板中 OPSX 导航之后、Branch Isolation 之前新增 Pre-flight Scan 段落，要求 agent 扫描 tasks.md 检测 task 间矛盾和依赖顺序问题。

**Files**:
- Modify: `src/core/templates/workflows/apply-change.ts`
- Modify: `test/core/templates/apply-change.test.ts`

**Requirements**:
- Pre-flight Scan 段落 SHALL 出现在 OPSX 导航片段之后、Branch Isolation Preflight 之前
- 段落 SHALL 指示 agent 扫描所有 task 的 Goal/Files/Requirements/Checks 检测矛盾和依赖顺序
- 段落 SHALL 要求发现问题时一次性呈现所有 findings，扫描干净时无声继续

#### Checks

- [x] C1.1 pre-flight scan 段落存在于生成的 skill 模板中
  - Verifies: `specs/apply-preflight-scan/spec.md` / Requirement "Task 间矛盾检测" / Scenario "扫描干净时无声继续"
  - Command: `pnpm test -- --grep "pre-flight" test/core/templates/apply-change.test.ts`
  - Expect: 测试验证生成的模板包含 pre-flight scan 相关指令文本

- [x] C1.2 pre-flight scan 段落位置正确
  - Verifies: `specs/apply-preflight-scan/spec.md` / Requirement "Task 间矛盾检测" / Scenario "检测到 task 间文件声明互斥"
  - Command: `pnpm test -- --grep "preflight.*position\|position.*preflight" test/core/templates/apply-change.test.ts`
  - Expect: 测试验证 pre-flight 文本�� OPSX 导航之后、Branch Isolation 之前

- [x] C1.3 pre-flight scan 包含依赖顺序检测指令
  - Verifies: `specs/apply-preflight-scan/spec.md` / Requirement "Task 依赖顺序检测" / Scenario "检测到前序 task 依赖后序 task ���产出"
  - Command: `pnpm test -- --grep "dependency.*order\|依赖顺序" test/core/templates/apply-change.test.ts`
  - Expect: 测试验证模板文本包含依赖顺序检测相关指令

### Task 2: 替换 Continuous Recovery Protocol 为增强版

**Goal**: 将现�� `Continuous Recovery Protocol` 段落替换为包含诊断优先、单变量修复和累计 3-strike 机制的增强版，删除"error signature 变化即进步"假设。

**Files**:
- Modify: `src/core/templates/workflows/apply-change.ts`
- Modify: `test/core/templates/apply-change.test.ts`

**Requirements**:
- 增强版 SHALL 包含诊断优先步���（读错误→定位层面→找 working example→形成假设）
- 增强版 SHALL 包含单变量修复约束
- 增强版 SHALL 包含累计 3-strike 计数器（同一 task 累计 3 次修复未解决 → 停止并呈现证据）
- 增强版 SHALL 保留连续 2 次相同 error signature 快速 pause 规则
- 增强版 SHALL NOT 包含"A changed normalized error signature is progress"语义

#### Checks

- [x] C2.1 "error signature 变化即进步"语义已移除
  - Verifies: `specs/apply-task-decomposition/spec.md` / Requirement "任务执行失败处理" / Scenario "累计修复次数达到上限"
  - Command: `grep -c "changed.*error.*signature.*is progress\|A changed normalized error signature is progress" src/core/templates/workflows/apply-change.ts`
  - Expect: 0（无匹配）

- [x] C2.2 诊断优先纪律存在
  - Verifies: `specs/apply-recovery-protocol-enhanced/spec.md` / Requirement "诊断优先于修复" / Scenario "非预期失败触发诊断"
  - Command: `pnpm test -- --grep "diagnos\|诊断" test/core/templates/apply-change.test.ts`
  - Expect: 测试验证模板包含诊断优先步骤指令

- [x] C2.3 单变量修复约束存在
  - Verifies: `specs/apply-recovery-protocol-enhanced/spec.md` / Requirement "单变量修复约束" / Scenario "修复仅改变一个变量"
  - Command: `pnpm test -- --grep "single.*variable\|单变量" test/core/templates/apply-change.test.ts`
  - Expect: 测试验证模板包含单变量修复约束指令

- [x] C2.4 累计 3-strike 机制存在
  - Verifies: `specs/apply-recovery-protocol-enhanced/spec.md` / Requirement "累计 3-strike 升级机制" / Scenario "累计 3 次失败后停止"
  - Command: `pnpm test -- --grep "3.*strike\|cumulative.*3\|累计.*3" test/core/templates/apply-change.test.ts`
  - Expect: 测试验证模板包含累计 3 次修复上限和停止行为

- [x] C2.5 连续相同 error 快速 pause 保留
  - Verifies: `specs/apply-recovery-protocol-enhanced/spec.md` / Requirement "累计 3-strike 升级机制" / Scenario "保留连续相同 error 快速 pause"
  - Command: `grep -c "same.*normalized.*error.*signature.*consecutive\|��一.*error.*连续.*2" src/core/templates/workflows/apply-change.ts`
  - Expect: ≥1（匹配存在）
