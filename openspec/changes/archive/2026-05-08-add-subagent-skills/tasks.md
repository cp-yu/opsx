## 1. Skill 模板文件

- [x] 1.1 创建 `src/core/templates/workflows/reviewer.ts` — `getReviewerSkillTemplate()` 函数，输出包含 6 模块的 `openspec-reviewer` SkillTemplate
- [x] 1.2 创建 `src/core/templates/workflows/optimizer.ts` — `getOptimizerSkillTemplate()` 函数，输出包含 6 模块的 `openspec-optimizer` SkillTemplate
- [x] 1.3 在 `src/core/templates/skill-templates.ts` 中导出两个新模板函数

## 2. Manifest 类型与注册

- [x] 2.1 修改 `src/core/templates/manifest/types.ts` — `WorkflowManifestEntry.getCommandTemplate` 改为 optional
- [x] 2.2 修改 `src/core/templates/manifest/registry.ts` — 命令 slug map / skill dir map 生成逻辑适配 optional 字段
- [x] 2.3 新建 `INTERNAL_SKILL_TEMPLATES` 常量数组（在 `skill-generation.ts` 中），包含 reviewer 和 optimizer 模板函数

## 3. 内部 Skill 安装管线

- [x] 3.1 修改 `src/core/shared/skill-generation.ts` — `getSkillTemplates()` 合并 workflow surface + 内部 skill，`getCommandTemplates()` 过滤无 `getCommandTemplate` 的 entry
- [x] 3.2 验证 `init` 时 core preset 安装包含两个内部 skill（`.claude/skills/`、`.codex/skills/`、`.pi/skills/`）
- [x] 3.3 验证 `update` 时刷新并覆盖内部 skill 文件
- [x] 3.4 确保路径构建全部使用 `path.join()`，跨 Windows/macOS/Linux 兼容

## 4. 模板 subagent spawn 指令更新

- [x] 4.1 修改 `src/core/templates/workflows/verify-change.ts` — `buildSubagentVerifyInstructions()` 和 `buildPhase2Step()` 中 reviewer/optimizer spawn 步骤改为 invoke skill 引用，移除内联 fragment 文本
- [x] 4.2 修改 `src/core/templates/workflows/apply-change.ts` — Phase 1 reviewer spawn 和 Phase 2 optimizer spawn 步骤改为 invoke skill 引用
- [x] 4.3 修改 `src/core/templates/workflows/archive-change.ts` — `buildArchiveFullVerifyContract()` 中 reviewer/optimizer spawn 引用改为 invoke skill

## 5. 跨工具适配验证

- [x] 5.1 确认 Claude Code subagent invoke `openspec-reviewer`/`openspec-optimizer` 机制可用
- [x] 5.2 确认 Codex skill 名称格式（`$openspec-reviewer` invoke 语法），利用现有 `cap.ai.tool-invocation-references` 变换管线
- [x] 5.3 确认 Pi skill invoke 机制与 Claude Code 一致
- [x] 5.4 确保 reread 模式工具不受影响（不尝试 invoke 内部 skill）

## 6. 测试

- [x] 6.1 更新 `test/core/templates/skill-templates-parity.test.ts` — 验证新 skill 模板的生成内容与 existing fragment 常量一致
- [x] 6.2 更新 `test/core/shared/skill-generation.test.ts` — 验证 `getSkillTemplates()` 返回内部 skill，`getCommandTemplates()` 不返回
- [x] 6.3 更新 `test/core/templates/verify-writeback-templates.test.ts` — 验证模板中不再内联 reviewer/optimizer 角色定义
- [x] 6.4 更新 `test/core/templates/apply-change.test.ts` — 验证 apply 模板 subagent spawn 指令变更
- [x] 6.5 更新 integration 测试 — 验证 `openspec init`/`openspec update` 在 Claude Code、Codex、Pi 上正确安装内部 skill
- [x] 6.6 添加 Windows 路径测试 — 验证 `path.join()` 构建的 skill 路径在 Windows 上的正确性

## 7. 验证与清理

- [x] 7.1 运行 `pnpm test` 全部测试通过
- [x] 7.2 运行 `openspec validate "add-subagent-skills" --type change` 通过
- [x] 7.3 TypeScript 编译无错误（`pnpm exec tsc --noEmit`）
- [x] 7.4 手动验证：在 /tmp 项目中 `openspec init` 后确认 `.claude/skills/openspec-reviewer/SKILL.md` (205行) 和 `openspec-optimizer/SKILL.md` (171行) 内容完整，三工具均安装成功