## Context

skill reference 文件由 TS 模板常量生成，经 sync-engine 写入各工具 skill 目录（`.claude/` `.codex/` `.github/`），每次 update 先 `rm -rf references/` 再整体重写（`sync-engine.ts:198-211`）。当前 6 个 skill 共 13 个 reference，39 份物理副本。抽查确认各工具目录的同名 reference 内容完全一致，无 per-tool transform 依赖。

git 配置面：`git.autoCommit`（auto/manual）只控制 archive 后 handoff；`git.archive.commitMessage.convention` 与 `git.merge.commitMessage.convention` 为单值 enum，各自拖着 zod schema、projection、warning 与十几处测试断言，却无可配置性——格式的事实来源是模板源码。

本设计来自 explore 阶段与用户逐节确认的 Design Summary。

## Goals / Non-Goals

**Goals:**
- 全部 reference 归一到 `openspec/references/`，单一物理副本，用户可见可抄。
- 以 `openspec-` 文件名前缀为所有权边界：update 只逐文件覆盖前缀文件，永不目录级删除。
- 删除伪配置（autoCommit、两个 convention enum），新增有真实自由度的 `git.commitMessage.{boundary,archive,merge}` 路径覆盖。

**Non-Goals:**
- 不改变 boundary commit 的语义（由后续变更 `boundary-commit-change-summary` 处理；本变更只预留 `boundary` 配置键）。
- 不为 agent 内部协议类 reference（optimizer/reviewer/sweeper 协议等）提供 config 覆盖——它们不是配置面。
- 不引入 per-tool reference 差异化机制。

## Decisions

1. **迁移全部 reference，而非只迁移 commit message 模板。**
   - 理由：两个存放位置就是两套规则；全部归一后 update 写入逻辑只有一条路径。
   - 替代方案：只迁可定制模板，内部协议留在 skill 目录。被否：产生"为什么这个在这那个在那"的特例记忆负担。

2. **文件名前缀（`openspec-`）作为所有权边界，而非子目录或清单文件。**
   - 理由：用户在同目录 `cp openspec-x.md my-x.md` 即完成自定义起步，规则一眼可见；逐文件覆盖天然实现（写入时按生成清单逐个写，不枚举目录）。
   - 替代方案：managed 清单文件。被否：多一个状态文件要同步，违反 KISS。

3. **删除 `git.autoCommit` 而非改名。**
   - 理由：用户确认 manual 模式无使用场景；开关名实不符是误解来源。删除后 archive handoff 恒为 agent auto。
   - 风险缓解：加载时对残留 `git.autoCommit` 字段输出废弃 warning，杜绝静默翻转无感知。

4. **convention enum 替换为可选路径覆盖，且三种 commit 类型对称。**
   - 理由：enum 是 speculative generality；路径覆盖解决真实痛点（手改生成文件会被 update 清除）。三键对称避免"这个能配那个不能"的特例。
   - `boundary` 键在本变更只进 schema 与校验，无消费方——接口先行，避免后续变更再动 config schema。

5. **生成时校验工具中立与文件名唯一，违反即抛错（fail loudly）。**
   - 理由：共享单副本后 per-tool transform 失效是隐式前提，必须显式化为契约；现状已满足（抽查一致），校验只是锁死。
   - 路径校验复用 sync-engine 现有模式：拒绝绝对路径、`..` 逃逸，强制 POSIX 正斜杠。

6. **update 一次性清理 skill 目录残留 `references/`。**
   - 理由：旧布局文件已无消费方，留着是误导；清理目标按生成清单显式列举，不做模式匹配删除。

## Risks / Trade-offs

- [Risk] sync-engine 写入 bug 误删用户自定义模板 → Mitigation: 代码层面无目录级删除路径，只逐文件覆盖生成清单内文件；测试预置非前缀文件断言 update 后幸存。
- [Risk] `git.autoCommit: manual` 存量项目行为静默翻转 → Mitigation: 加载时废弃 warning 指明"该字段已删除，archive handoff 恒为 agent 自动"。
- [Risk] 未来某 reference 需要 per-tool 差异 → Mitigation: 工具中立校验报错时显式暴露需求，届时再设计（YAGNI）。
- [Trade-off] skill 目录失去自包含性（reference 在项目根）→ OpenSpec skills 本来强依赖 `openspec` CLI 与 `openspec/` 目录，实际无损。
- [Trade-off] 配置自定义模板的项目需自行维护模板与内置格式演化的同步 → 可随时 diff 同目录的 `openspec-` 前缀内置版本。

## Migration Plan

1. sync-engine 切换写入目标 + 新增校验（先行，含测试）。
2. config schema/projection/prompts 减法与新键（含废弃 warning）。
3. workflow 模板路径引用更新 + init/update 物化与迁移逻辑更新。
4. `openspec update --force` 刷新生成产物：skill 目录 references 清除、`openspec/references/` 物化。
5. 回滚策略：单 commit revert 即可恢复旧布局；旧 skill 目录 references 由 update 重新生成。

## Open Questions

无——设计决策已在 explore 阶段逐节确认。
