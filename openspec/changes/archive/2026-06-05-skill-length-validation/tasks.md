### Task 1: 实现 skill 模板单文件长度验证与拆分精简

**Goal**: 创建测试验证所有生成 skill 文件单文件不超过 200 行，并将当前超标的 skill 模板拆分或精简到合格，同时保留现有契约语义。

**Files**:
- Create: `test/skills/skill-template-length-validation.test.ts`
- Modify: `src/core/templates/workflows/apply-change.ts`
- Modify: `src/core/templates/workflows/archive-change.ts`
- Modify: `src/core/templates/workflows/bulk-archive-change.ts`
- Modify: `src/core/templates/workflows/explore.ts`
- Modify: `src/core/templates/workflows/impact-sweeper.ts`
- Modify: `src/core/templates/workflows/onboard.ts`
- Modify: `src/core/templates/workflows/optimizer.ts`
- Modify: `src/core/templates/workflows/propose.ts`
- Modify: `src/core/templates/workflows/reviewer.ts`
- Modify: `src/core/templates/workflows/sync-specs.ts`
- Modify: `src/core/templates/workflows/verify-change.ts`
- Modify: `src/core/templates/types.ts`
- Modify: `src/core/templates/sync-engine.ts`
- Modify: `src/core/workflow-installation.ts`
- Modify: `.claude/skills/**/SKILL.md`
- Modify: `.claude/skills/**/references/*.md`
- Modify: `.codex/skills/**/SKILL.md`
- Modify: `.codex/skills/**/references/*.md`
- Modify: `.github/skills/**/SKILL.md`
- Modify: `.github/skills/**/references/*.md`
- Modify: `test/core/shared/skill-generation.test.ts`
- Modify: `test/core/templates/impact-sweeper-template.test.ts`
- Modify: `test/core/templates/skill-templates-parity.test.ts`
- Modify: `test/core/workflow-installation.test.ts`
- Modify: `test/skills/optimizer-skill-content.test.ts`

**Requirements**:
- 调用 `getSkillTemplates()` 获取所有 tool 变体（default、claude、codex）
- 对 `SKILL.md` 使用 `generateSkillContent(template, version).split('\n').length`
- 对 `template.referenceFiles[]` 按每个 reference 文件的 `content.split('\n').length` 独立计算
- 不汇总同一 skill 目录下所有文件的总行数
- 按 `<dirName>/<filePath>` 分组报告超标文件
- 失败时显示参考链接
- 精简当前超标 skill 模板，移除长示例、重复流程说明和下游契约全文复述
- 将 `openspec-optimizer`、`openspec-impact-sweeper`、`openspec-sync-specs` 的长协议拆入 `references/*.md`
- 安装/更新流程写出 `referenceFiles`，并在重写 managed skill 时清理旧 references
- 保留 apply、explore、propose、archive、reviewer、optimizer 等现有 contract tests 覆盖的关键行为短语
- 刷新生成的工具 skill 文件并更新 parity hash

#### Checks

- [x] C1 验证所有生成 skill 文件未超标时测试通过
  - Verifies: `specs/skill-template-length-check/spec.md` / Requirement "测试验证所有生成 skill 文件行数限制" / Scenario "所有模板均未超标"
  - Command: `pnpm test test/skills/skill-template-length-validation.test.ts`
  - Expect: 测试通过，无超标模板

- [x] C2 验证超标时按文件路径分组报告
  - Verifies: `specs/skill-template-length-check/spec.md` / Requirement "测试验证所有生成 skill 文件行数限制" / Scenario "存在超标文件时按路径分组报告"
  - Command: `pnpm test test/skills/skill-template-length-validation.test.ts`
  - Expect: 测试内置 fixture 验证错误信息包含超标数量、分组列表、参考链接

- [x] C3 验证同一文件多个变体行数相同时合并显示
  - Verifies: `specs/skill-template-length-check/spec.md` / Requirement "测试验证所有生成 skill 文件行数限制" / Scenario "同一文件的多个变体行数相同时合并显示"
  - Evidence: 查看错误信息格式
  - Expect: 相同行数的变体显示在同一行，格式为 `• dirName/filePath (variant1, variant2, ...): lines (+over)`

- [x] C4 验证同一文件不同变体行数不同时分别显示
  - Verifies: `specs/skill-template-length-check/spec.md` / Requirement "测试验证所有生成 skill 文件行数限制" / Scenario "同一文件的不同变体行数不同时分别显示"
  - Evidence: 查看错误信息格式
  - Expect: 不同行数的变体分别显示在不同行

- [x] C4a 验证 reference 文件独立计算且不汇总目录总行数
  - Verifies: `specs/skill-template-length-check/spec.md` / Requirement "测试验证所有生成 skill 文件行数限制" / Scenario "reference 文件单独计算"
  - Command: `pnpm test test/skills/skill-template-length-validation.test.ts`
  - Expect: 内置 fixture 只报告超标 reference 文件，不报告同目录 `SKILL.md`

- [x] C5 验证覆盖所有 tool 变体
  - Verifies: `specs/skill-template-length-check/spec.md` / Requirement "测试覆盖所有 tool 变体" / Scenario "获取所有变体"
  - Evidence: 检查测试代码调用 `getSkillTemplates()` 三次
  - Expect: 分别传入 undefined、'claude'、'codex' 作为 toolId 参数

- [x] C6 验证当前超标 skill 已拆分或精简
  - Verifies: `specs/skill-template-length-check/spec.md` / Requirement "现有超标 skill 模板必须拆分或精简" / Scenario "超标 workflow/internal skill 被压缩或拆分"
  - Command: `pnpm test test/skills/skill-template-length-validation.test.ts`
  - Expect: 所有 default、claude、codex 变体的单个生成文件均 ≤ 200 行

- [x] C6a 验证 `referenceFiles` 安装与计划产物
  - Verifies: `specs/skill-template-length-check/spec.md` / Requirement "现有超标 skill 模板必须拆分或精简" / Scenario "长协议拆分到 references"
  - Command: `pnpm test test/core/workflow-installation.test.ts test/core/shared/skill-generation.test.ts`
  - Expect: sync 写出 `references/*.md`，planned artifacts 包含 reference 文件

- [x] C7 验证关键契约语义仍通过现有测试保护
  - Verifies: `specs/skill-template-length-check/spec.md` / Requirement "现有超标 skill 模板必须拆分或精简" / Scenario "关键契约语义仍由现有测试保护"
  - Command: `pnpm test test/core/templates/apply-change.test.ts test/core/templates/propose-template.test.ts test/core/templates/explore-template.test.ts test/skills/reviewer-skill-content.test.ts test/skills/archive-skill-content.test.ts test/skills/optimizer-skill-content.test.ts test/core/templates/impact-sweeper-template.test.ts`
  - Expect: 相关 contract tests 通过

- [x] C8 验证生成工具 skill 与模板源一致
  - Verifies: `specs/skill-template-length-check/spec.md` / Requirement "现有超标 skill 模板必须拆分或精简" / Scenario "生成的工具 skill 与模板源一致"
  - Command: `npm run build && node bin/openspec.js update . --force && pnpm test test/skills/reviewer-skill-content.test.ts test/skills/archive-skill-content.test.ts`
  - Expect: `.claude` / `.codex` / `.github` 生成 skill 与模板源一致

- [x] C9 验收前 subagent 差异审查
  - Verifies: `specs/skill-template-length-check/spec.md` / Requirement "现有超标 skill 模板必须拆分或精简" / Scenario "关键契约语义仍由现有测试保护"
  - Evidence: reviewer subagent 对 `openspec-optimizer`、`openspec-impact-sweeper`、`openspec-sync-specs` 做拆分前后只读审查；初次结果 PASS_WITH_WARNINGS，修复 impact-sweeper reference 读取时机和 sync-engine reference 路径预校验后复核通过，仅保留当前配置未安装 expanded sync skill 的说明性 warning
  - Expect: 无 CRITICAL 行为丢失、触发条件弱化、输出契约缺失或安装副作用
