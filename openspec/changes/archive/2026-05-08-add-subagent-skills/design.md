## Context

当前 OpenSpec 的 skill 系统围绕 `WorkflowManifestEntry` 构建——每个 workflow（propose、verify、apply 等）同时产出 skill 文件（`SKILL.md`）和 slash command。但 verify/apply/archive 在 subagent-orchestrated 模式下内部 spawn 的 reviewer 和 optimizer subagent，其指令仅为 `opsx-fragments.ts` 中的简短内联文本片段。这些 subagent 缺少：

- 完整的角色定义和身份约束
- 结构化的输入/输出合约
- 详细的验证协议和判断标准
- 边界情况和优雅降级策略

将这些 fragment 升级为正式的内部 skill，使 subagent invoke 时获得完整指导，同时保持 clean-context 独立性。

现有基础设施：
- `SkillTemplate` 接口：name, description, instructions, license, compatibility, metadata
- `getSkillTemplates()` → 基于 `WorkflowManifestEntry` 列表生成
- `getCommandTemplates()` → 同上，产出 command
- 安装管线：`sync-engine.ts` 中 `writeSkills()` / `writeCommands()` → 写入 `{skillsDir}/skills/{skillDirName}/SKILL.md`

## Goals / Non-Goals

**Goals:**
- 为 reviewer 和 optimizer subagent 各创建一个结构化、可复用的内部 skill
- 内部 skill 随 core preset 安装到所有 AI 工具（Claude Code `.claude/`、Codex `.codex/`、Pi `.pi/` 等）
- verify/apply/archive 模板改为 invoke skill 引用，而非内联 fragment
- 保持向后兼容：不支持 subagent 的工具（reread 模式）不受影响
- 支持 Windows 路径（`path.join()` 构建 skill 文件路径）

**Non-Goals:**
- 不创建对应的 slash command——这些是纯内部 subagent skill
- 不改变 verify CLI（`openspec verify phase1/phase2`）的接口
- 不改变 fragment 常量的定义——它们继续作为模板构建块存在
- 不给用户暴露直接调用入口

## Decisions

### Decision 1: 内部 skill 使用独立的常量列表注册，而非混入 WorkflowManifestRegistry

**选择**: 在 `skill-generation.ts` 中新增 `INTERNAL_SKILL_TEMPLATES` 常量数组，与 `WorkflowManifestEntry` 分离。

**理由**: 内部 skill 不是 workflow——它们没有 command、没有 promptMeta、没有 mode membership。强行塞入 manifest 会污染 `ALL_WORKFLOWS` 列表和命令生成逻辑。使用独立列表，`getSkillTemplates()` 合并两个来源，`getCommandTemplates()` 仅使用 workflow surface。

**备选方案**: 扩展 `WorkflowManifestEntry` 加 `internal: true` 标记。被拒绝——这会增加所有消费方的过滤负担。

### Decision 2: 内部 skill 的 `SkillTemplate.metadata.type = 'subagent'`

**选择**: 利用现有的 `metadata` 字段（`Record<string, string>`）添加 `type: 'subagent'` 标记。

**理由**: `SkillTemplate` 接口已有 `metadata` 自由字段。无需改类型定义即可传递内部标记。安装管线可据此做差异化处理（如日志消息区分 "workflow skill" vs "subagent skill"）。

### Decision 3: Subagent spawn 指令由模板中的 invoke 文本替代

**选择**: verify/apply/archive 模板中，原内联 fragment 替换为：
```
Spawn a clean-context reviewer subagent. Instruct it to invoke skill `openspec-reviewer` with the evidence bundle below.
```

**理由**: 主 agent 在 spawn subagent 时，将 skill 名称和证据包一起传入 prompt。Subagent 启动后其上下文包含 skill 的完整指令。这是 Claude Code Agent Skills 规范的标准机制。

**Codex 适配**: Codex 的 skill 名称为 `$openspec-reviewer`（`$` 前缀），模板中的 invoke 文本需按工具渲染。利用现有的 `cap.ai.tool-invocation-references` 的 skill 名称变换管线处理。

**Pi 适配**: Pi 遵循标准 Agent Skills 规范，skill 名称无前缀。路径结构与 Claude Code 一致（`.pi/skills/openspec-reviewer/SKILL.md`）。

### Decision 4: Fragment 不变，skill 模板中重新组合

**选择**: `opsx-fragments.ts` 中的常量保持不变。新的 `reviewer.ts` 和 `optimizer.ts` 模板函数中直接书写聚合后的 Markdown 文本，复用 fragment 文本但做视角转换（从"外部指令"转为"自我角色定义"）。

**理由**: Fragment 常量还被 reread 模式模板和 archive 模板的某些部分使用。改动 fragment 会影响所有消费方。内部 skill 的提示词视角不同（"You are..." vs "The agent should..."），需要独立文本。

## Risks / Trade-offs

- **[Risk] 内部 skill 内容与 fragment 常量不同步** → 在 reviewer/optimizer 模板中添加注释标注对应的 fragment 来源，未来 fragment 变更时需同步更新 skill 模板
- **[Risk] Codex skills-only 模式下 invoke 机制差异** → Codex 不支持 Agent 工具的 skill invoke，需验证其 subagent spawn 的实际机制，可能需要不同的 invoke 语法
- **[Risk] 内部 skill 文件被用户误修改** → description 写明 "Internal use only"，metadata 标记 `type: subagent`；`update` 时按 managed 文件覆盖

## Migration Plan

1. `openspec update` 自动安装新的两个内部 skill 到所有已配置工具的 skills 目录
2. 新 `init` 项目自动包含
3. 无破坏性变更——现有 verify/apply/archive 模板中的 fragment 引用保留至代码修改阶段统一替换
4. 回滚：删除两个 SKILL.md 文件即可，模板回退到内联 fragment（功能不变，仅质量下降）

## Open Questions

- Codex subagent spawn 的具体语法？是否需要 `$openspec-reviewer` 格式或不同的 invoke 方式？
- Pi 的 skill invoke 机制是否与 Claude Code 完全一致？