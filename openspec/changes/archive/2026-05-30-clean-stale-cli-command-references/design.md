## Context

当前真实 CLI surface 已确认：

- `openspec verify` 仅提供 `phase1`、`phase2`、`seal`、`status`
- `openspec validate` 承担 change/spec 结构验证，并支持 `--all`、`--changes`、`--specs`
- `openspec archive [change-name]` 和 `openspec sync [change-name]` 使用 positional change name
- `openspec bootstrap validate` 承担 bootstrap gate

扫描发现的活跃 stale references 包括：

- `CLAUDE.md`: removed verify `--change`、`--opsx`、`--all` flags and sync `--change`
- `docs/opsx-bootstrap.md`: removed verify `--change`、`--all`、`--check-refs` flags
- `docs/opsx-migration.md`: removed verify `--opsx` and archive `--change`
- archive 历史中也存在 removed verify flags，但默认不作为修改目标

## Goals / Non-Goals

**Goals:**

- 清理当前会被用户或 Agent 读取并执行的 stale command references。
- 防止模板或生成源头在下一次 `openspec update` 后重新生成旧命令。
- 保持 verify、validate、bootstrap validate、archive/sync 的语义边界清晰。

**Non-Goals:**

- 不改变 CLI 命令注册、参数兼容性或 runtime 行为。
- 不新增 removed verify flag 兼容别名；旧命令应被移除而不是复活。
- 不默认改写 `openspec/changes/archive/**` 中的历史记录。

## Decisions

### Decision: 按语义映射，不做机械替换

Removed verify flags 不能一律替换成 `openspec validate --all`。只有当上下文说的是 change/spec 结构验证时才替换为 validate；如果上下文说的是 archive 前实现验证，应改为 `openspec verify status <change-name> --json` 或对应 workflow gate；如果上下文说的是 bootstrap gate，应改为 `openspec bootstrap validate`。

### Decision: 优先修源头，再同步生成物

`.codex/skills/**`、`.claude/**`、`.github/**` 和 docs 中有些文件是生成产物。实现时先定位 `src/core/templates/**`、fragment 或 workflow registry 中是否存在同一 stale text；若存在，改源头并按项目现有生成流程同步产物，避免后续 update 回退。

### Decision: archive 历史只报告，不默认修改

archive 中的旧命令是历史事实。修改它们会污染变更历史，收益很低。实现时把 archive 命中作为审计结果单独报告，只有当某个 archived 文件被当前生成流程消费时才纳入修改。

## Risks / Trade-offs

- [Risk] 只改生成物不改模板，后续 regenerate 会复发 → Mitigation: 任务要求先定位源头并验证 active surface 搜索结果。
- [Risk] 机械替换导致语义错误，例如把 bootstrap OPSX 检查写成 validate all → Mitigation: spec 明确按语义分类替换。
- [Risk] 扫描命令引用时误伤合法 `openspec verify phase*` → Mitigation: 验证搜索区分 removed verify flags 与支持的 verify 子命令。
- [Risk] archive 历史仍包含旧命令导致搜索噪音 → Mitigation: 最终报告必须区分 active failures 与 archive-only occurrences。

## Open Questions

- 是否需要为命令引用一致性增加自动测试或 lint？本 change 至少要求 repeatable search verification；若现有测试结构允许，可增加轻量 fixture 或 snapshot 检查。
