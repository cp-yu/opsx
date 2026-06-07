## Why

`openspec-apply-change` 的 Phase 2 skill 摘要把 checkpoint 压缩成 `create apply-opt-checkpoint-r0`，导致 agent 可能把 checkpoint 名误解为 tag 名并执行 `git tag`。同时现有 200 行限制同时约束 `SKILL.md` 和 reference 文件，迫使复杂流程被过度压缩。

## What Changes

- 将 apply Phase 2 优化协议从主 `SKILL.md` 拆到 `references/apply-phase2-optimization.md`，主指令只保留强制读取 reference 的入口。
- 在 apply Phase 2 reference 中明确 checkpoint 是 git stash entry，并列出 `git stash push -u -m "apply-opt-checkpoint-r0"`、`git stash push -u -m "apply-opt-checkpoint-r<N>"`、`git stash apply stash@{0}` 等关键命令。
- 保持 `SKILL.md` 行数限制为 200，将所有 `template.referenceFiles[]` 文件的全局行数限制放宽到 500。
- 更新模板、长度校验、contract/parity 测试，并通过 `openspec update` 刷新生成工具产物。

## Capabilities

### New Capabilities

### Modified Capabilities
- `apply-verify-integration`: apply Phase 2 skill surface 必须通过 reference 文件暴露完整 stash checkpoint 协议，避免 tag checkpoint 歧义。
- `skill-template-length-check`: `SKILL.md` 保持 200 行限制，`template.referenceFiles[]` 全局改为 500 行限制。

## Impact

- Affected code: `src/core/templates/workflows/apply-change.ts`, `test/core/templates/apply-change.test.ts`, `test/skills/skill-template-length-validation.test.ts`, `test/core/templates/skill-templates-parity.test.ts`
- Affected specs: `openspec/specs/apply-verify-integration/spec.md`, `openspec/specs/skill-template-length-check/spec.md`
- Generated artifacts: `.codex/skills/openspec-apply-change/`, `.claude/skills/openspec-apply-change/`, and other tool skill outputs refreshed by `openspec update`
