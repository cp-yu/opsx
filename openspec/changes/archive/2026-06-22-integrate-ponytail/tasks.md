### Task 1: Explore SKILL 融入 ponytail-lite

**Goal**: 在 `openspec-explore/SKILL.md` 的 Brainstorming Checklist 中融入 ponytail-lite 意识。

**Files**:
- Modify: `.pi/skills/openspec-explore/SKILL.md`

**Requirements**:
- 方案对比时自然带上 ponytail 简化视角
- 单方案讨论中发现过度规格化时用一行指出
- 不触发时自然跳过，不加独立步骤

#### Checks

- [x] C1 验证 explore skill 包含 ponytail-lite 行为指导
  - Verifies: `specs/explore-brainstorming/spec.md` / Requirement "2-3 方案对比" / Scenario "方案对比时加入 ponytail 视角"
  - Command: `grep -q "ponytail-lite\|ponytail.*替代\|ponytail.*简化\|ponytail.*ladder" .pi/skills/openspec-explore/SKILL.md && echo "PASS" || echo "FAIL"`
  - Expect: 文件中包含 ponytail-lite 相关行为指导

- [x] C2 验证 explore skill 保留流程完整性
  - Verifies: `specs/explore-brainstorming/spec.md` / Requirement "分段设计呈现" / Scenario "单方案中发现过度规格化"
  - Command: `grep -c "Brainstorming Checklist\|一次一问\|2-3.*方案\|Design Summary" .pi/skills/openspec-explore/SKILL.md`
  - Expect: 现有流程步骤计数与修改前一致

### Task 2: Apply SKILL 嵌入 ponytail-full

**Goal**: 在 `openspec-apply-change/SKILL.md` 中嵌入 ponytail-full 6-rung ladder 作为编码行为约束。

**Files**:
- Modify: `.pi/skills/openspec-apply-change/SKILL.md`

**Requirements**:
- 6-rung ladder 嵌入编码实现指导部分
- specs 明确要求的照做，不质疑
- specs 未覆盖的实现细节走 ladder
- 不含独立 ponytail 审核步骤

#### Checks

- [x] C1 验证 apply skill 包含 ponytail-full ladder 约束
  - Verifies: `specs/apply-task-decomposition/spec.md` / Requirement "Master agent 直接执行 pending task" / Scenario "specs 未覆盖的实现细节走 ponytailladder"
  - Command: `grep -q "Does this need to exist\|stdlib\|native\|one line\|YAGNI\|6-rung\|ladder\|ponytail.*full" .pi/skills/openspec-apply-change/SKILL.md && echo "PASS" || echo "FAIL"`
  - Expect: 文件中包含 6-rung ladder 原则

- [x] C2 验证 apply skill 包含「specs 第一」硬约束
  - Verifies: `specs/apply-task-decomposition/spec.md` / Requirement "Master agent 直接执行 pending task" / Scenario "specs 明确要求的照做"
  - Command: `grep -q "specs.*要求.*照做\|specs.*未指定\|specs.*覆盖范围\|specs.*明确要求" .pi/skills/openspec-apply-change/SKILL.md && echo "PASS" || echo "FAIL"`
  - Expect: 文件中包含 specs 优先的硬约束表述

### Task 3: Optimizer SKILL 采纳 ponytail 标签

**Goal**: 在 `openspec-optimizer/SKILL.md` 中引入 ponytail 标签体系分类优化提案。

**Files**:
- Modify: `.pi/skills/openspec-optimizer/SKILL.md`

**Requirements**:
- 使用 ponytail 标签（delete/stdlib/native/yagni/shrink）分类优化
- 不标记因 specs 要求而存在的代码
- 标签作为附加分类，不改变 Search/Replace 块结构

#### Checks

- [x] C1 验证 optimizer skill 包含 ponytail 标签体系
  - Verifies: `specs/openspec-optimizer-skill/spec.md` / Requirement "Optimizer 角色与硬约束" / Scenario "使用 ponytail 标签分类优化"
  - Command: `grep -q "delete.*stdlib.*native.*yagni.*shrink\|ponytail.*标签\|ponytail.*tag" .pi/skills/openspec-optimizer/SKILL.md && echo "PASS" || echo "FAIL"`
  - Expect: 文件中包含 ponytail 标签列表

- [x] C2 验证 optimizer skill 包含「不挑战 specs」约束
  - Verifies: `specs/openspec-optimizer-skill/spec.md` / Requirement "Optimizer 角色与硬约束" / Scenario "不标记 specs 要求的代码"
  - Command: `grep -q "specs.*要求的代码\|不标记.*specs\|specs.*明确要求" .pi/skills/openspec-optimizer/SKILL.md && echo "PASS" || echo "FAIL"`
  - Expect: 文件中包含 specs 边界约束
