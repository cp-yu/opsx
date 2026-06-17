### Task 1: snack 改为读模板生成制品并自检

**Goal**: 让 snack 在生成 proposal/specs/design 前读 artifact 模板，生成后跑 validate 自检，消除归档验证失败链路。

**Files**:
- Modify: `.claude/skills/openspec-snack/SKILL.md`
- Modify: `src/core/templates/workflows/snack.ts`
- Test: `test/integration/snack-workflow.test.ts`

**Requirements**:
- Flow 中 proposal/specs/design 生成步骤改为先跑 `openspec instructions <id> --change "<name>" --json`，严格用返回的 template+instruction 填充，不自造章节、不重复实现 ADDED/MODIFIED 判定规则
- specs 的 ADDED/MODIFIED 判定与目录名遵循 instruction 规则（复用 `openspec/specs/<capability>/` 已有名或 proposal capability 名；新增关注点 ADDED，改已有 requirement MODIFIED 标题逐字匹配）
- proposal 的 `## Capabilities` 先于 specs 确定 capability 列表作为共同输入，code-map 无映射文件标 `[REVIEW NEEDED]`
- design 保留 template 全部章节骨架，内容标 `[INFERRED FROM CODE]`
- 新增生成后 `openspec validate "<name>" --type change --json` 自检步骤，有 ERROR/WARNING 跑一轮修复再验一次，残留问题逐条披露
- opsx-delta 与"不生成 tasks.md"行为保持不变

#### Checks

- [x] C1 验证 proposal 生成步骤读取模板
  - Verifies: `specs/snack-skill/spec.md` / Requirement "Proposal 模板合规生成" / Scenario "生成前读取 proposal 模板"
  - Command: `grep -c "openspec instructions proposal" .claude/skills/openspec-snack/SKILL.md`
  - Expect: 计数 ≥ 1
- [x] C2 验证 specs 生成步骤读取模板
  - Verifies: `specs/snack-skill/spec.md` / Requirement "Specs 中层推断生成" / Scenario "生成前读取 specs 模板"
  - Command: `grep -c "openspec instructions specs" .claude/skills/openspec-snack/SKILL.md`
  - Expect: 计数 ≥ 1
- [x] C3 验证 design 生成步骤读取模板
  - Verifies: `specs/snack-skill/spec.md` / Requirement "Design 简化生成" / Scenario "生成 design.md"
  - Command: `grep -c "openspec instructions design" .claude/skills/openspec-snack/SKILL.md`
  - Expect: 计数 ≥ 1
- [x] C4 验证新增 validate 自检步骤
  - Verifies: `specs/snack-skill/spec.md` / Requirement "生成后 validate 自检" / Scenario "自检发现 ERROR 并修复"
  - Command: `grep -c "openspec validate" .claude/skills/openspec-snack/SKILL.md`
  - Expect: 计数 ≥ 1
- [x] C5 验证输出提示包含自检结果
  - Verifies: `specs/snack-skill/spec.md` / Requirement "输出提示包含双路径" / Scenario "输出 validate 自检结果"
  - Command: `grep -i "validate" .claude/skills/openspec-snack/SKILL.md | grep -ic "输出\|提示\|result"`
  - Expect: 计数 ≥ 1
- [x] C6 验证生成模板保持合规
  - Verifies: `specs/snack-skill/spec.md` / Requirement "Proposal 模板合规生成" / Scenario "生成前读取 proposal 模板"
  - Command: `pnpm exec vitest run test/integration/snack-workflow.test.ts`
  - Expect: 3 tests passed
