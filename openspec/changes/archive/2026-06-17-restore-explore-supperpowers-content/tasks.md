### Task 1: 新增 supperpowers-style reference 内容常量

**Goal**: 在 `explore.ts` 中定义 `EXPLORE_SUPPERPOWERS_STYLE_REFERENCE` 常量，承载 4 块纯行为引导，取自 `git show 64ded25f` 并做只读边界适配。

**Files**:
- Modify: `src/core/templates/workflows/explore.ts`

**Requirements**:
- 常量内容 SHALL 覆盖 The Stance、What You Might Do（含 ASCII State diagram 模板）、Handling Different Entry Points（4 个行为示例）、What We Figured Out 四个主题。
- 常量内容 SHALL NOT 包含 `${...}` 模板插值变量（须是自包含纯字符串）。
- 涉及制品生成的措辞 SHALL 统一为路由到 `$openspec-propose <change-name>`，剔除"Want me to create a proposal"、"I can create a change proposal"、"Updated design.md"等旧表述。
- 常量内容 SHALL NOT 重复 sweeper 委托协议、brainstorming checklist 编号流程或 Future Capture Target 路由表。
- 常量 trim 后内容 SHALL ≤500 行（满足 `skill-template-length-check` reference 限制）。

#### Checks

- [x] C1 验证常量定义且内容覆盖四个主题
  - Verifies: `specs/explore-brainstorming/spec.md` / Requirement "Explore 通过 referenceFiles 暴露 superpowers 行为引导" / Scenario "explore 声明 supperpowers-style reference"
  - Command: `node -e "const t=require('./dist/...'); const c=t.getExploreSkillTemplate(); const r=(c.referenceFiles||[]).find(f=>f.path.includes('explore-supperpowers-style')); console.log(['## The Stance','## What You Might Do','## Handling Different Entry Points','## What We Figured Out'].every(s=>r&&r.content.includes(s)))"`
  - Expect: 输出 `true`，四个主题标题均存在于 reference 内容中

- [x] C2 验证内容无只读边界冲突措辞
  - Verifies: `specs/explore-brainstorming/spec.md` / Requirement "Explore 通过 referenceFiles 暴示 superpowers 行为引导" / Scenario "reference 内容路由到 propose 而非直接写入"
  - Command: `pnpm test test/core/templates/explore-template.test.ts`
  - Expect: explore 模板测试通过；reference 内容不包含 `Want me to create a proposal`、`I can create a change proposal`、`Updated design.md`

### Task 2: 注册 referenceFiles 并在主 instructions 指向 reference

**Goal**: 在 `getExploreSkillTemplate()` 返回对象新增 `referenceFiles` 数组项，主 instructions 保持精简并补一行指向 reference。

**Files**:
- Modify: `src/core/templates/workflows/explore.ts`

**Requirements**:
- 返回对象 SHALL 包含 `referenceFiles: [{ path: 'references/explore-supperpowers-style.md', content: EXPLORE_SUPPERPOWERS_STYLE_REFERENCE }]`。
- 主 instructions SHALL 保持当前 Hard Rules / Skill Delegation Protocol / Mandatory Exploration Flow / Impact Sweeps / Brainstorming Checklist / Existing Changes 等章节不动。
- 主 instructions SHALL 在合适位置补一行指向 `explore-supperpowers-style` reference。
- 现有 `explore-template.test.ts` 所有断言 SHALL 继续通过（主 instructions 关键短语不被改动）。

#### Checks

- [x] C3 验证 referenceFiles 注册正确
  - Verifies: `specs/explore-brainstorming/spec.md` / Requirement "Explore 通过 referenceFiles 暴示 superpowers 行为引导" / Scenario "explore 声明 supperpowers-style reference"
  - Command: `node -e "const {getExploreSkillTemplate}=require('./dist/core/templates/skill-templates.js'); const t=getExploreSkillTemplate(); const r=(t.referenceFiles||[]).find(f=>f.path==='references/explore-supperpowers-style.md'); console.log(!!r && r.path==='references/explore-supperpowers-style.md')"`
  - Expect: 输出 `true`

- [x] C4 验证主 instructions 保持精简且长度合规
  - Verifies: `specs/explore-brainstorming/spec.md` / Requirement "Explore 通过 referenceFiles 暴示 superpowers 行为引导" / Scenario "主 instructions 保持精简并指向 reference"
  - Command: `pnpm test test/skills/skill-template-length-validation.test.ts`
  - Expect: 长度校验通过，openspec-explore 主 SKILL.md ≤200 行、reference ≤500 行

- [x] C5 验证现有 explore 模板断言不破坏
  - Preserves: `openspec/specs/explore-brainstorming/spec.md` / Requirement "Explore 主代理保持只读" / Scenario "Explore 不写入制品"
  - Command: `pnpm test test/core/templates/explore-template.test.ts`
  - Expect: 所有 explore-template 断言通过（sweeper 委托、brainstorming checklist、只读边界、Future Capture Target 路由等短语仍存在）

### Task 3: 新增 reference 内容契约测试并刷新生成产物

**Goal**: 为新增的 reference 内容加契约断言，并运行 `openspec update` 刷新生成的 skill 与 reference 物化文件。

**Files**:
- Test: `test/core/templates/explore-template.test.ts`
- Modify: `.claude/skills/openspec-explore/`（生成目录）
- Modify: `openspec/references/openspec-explore-supperpowers-style.md`

**Requirements**:
- 新增测试 SHALL 断言 `getExploreSkillTemplate()` 返回对象包含 `explore-supperpowers-style` reference，且内容含四个主题标题。
- 新增测试 SHALL 断言 reference 内容不含只读边界冲突措辞。
- 运行 `openspec update` SHALL 物化 `openspec/references/openspec-explore-supperpowers-style.md` 与刷新后的 `.claude/skills/openspec-explore/`。

#### Checks

- [x] C6 验证 reference 内容契约测试通过
  - Verifies: `specs/explore-brainstorming/spec.md` / Requirement "Explore 通过 referenceFiles 暴示 superpowers 行为引导" / Scenario "explore 声明 supperpowers-style reference"
  - Command: `pnpm test test/core/templates/explore-template.test.ts`
  - Expect: 新增 reference 断言与既有断言全部通过

- [x] C7 验证生成产物刷新
  - Verifies: `specs/explore-brainstorming/spec.md` / Requirement "Explore 通过 referenceFiles 暴示 superpowers 行为引导" / Scenario "主 instructions 保持精简并指向 reference"
  - Command: `openspec update && test -f openspec/references/openspec-explore-supperpowers-style.md`
  - Expect: reference 文件物化成功，`.claude/skills/openspec-explore/` 刷新无 STALE

- [x] C8 验证全量测试套件无回归
  - Preserves: `openspec/specs/skill-template-length-check/spec.md` / Requirement "测试验证所有生成 skill 文件行数限制" / Scenario "所有模板均未超标"
  - Command: `pnpm test`
  - Expect: 全量测试通过，无长度超标、无 explore 相关回归
