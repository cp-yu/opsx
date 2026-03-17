## Context

OpenSpec 当前已经具备 bootstrap 的真实执行能力，但体系中对它的“命令面”定义仍然不一致。核心 CLI 已在 `src/cli/index.ts` 和 `src/commands/bootstrap.ts` 中提供 `status`、`init`、`instructions`、`validate`、`promote` 五阶段子命令；同时 `src/core/templates/workflows/bootstrap-opsx.ts` 也已有对应 agent 模板。然而，`docs/opsx-bootstrap.md` 仍保留旧式伪接口示例，`docs/commands.md` 又未正式暴露 `/opsx:bootstrap`，而生成链路、迁移、drift 检测、cleanup 仍把内部 workflow ID `bootstrap-opsx` 直接当作外部命令文件名使用。

这个问题不是 bootstrap 核心实现缺失，而是 command surface 没有产品化闭环。修复目标是：让 `/opsx:bootstrap` 成为唯一、清晰、可发现的外部入口；其底层完全复用现有 `openspec bootstrap ...` CLI；并让 generation、detection、migration、cleanup、docs、tests 全部基于同一套 workflow→command slug 映射模型。

## Goals / Non-Goals

**Goals:**
- 将 bootstrap 统一为 CLI-backed agent workflow，外部命令面固定为 `/opsx:bootstrap`
- 保留内部 workflow ID `bootstrap-opsx` 作为 profile/config/filtering 的稳定标识
- 引入共享的 workflow→command slug 映射，使 command generation、migration、drift detection、cleanup 使用同一规则
- 删除 bootstrap 文档中的过时伪命令示例，并让主命令文档正式收录 `/opsx:bootstrap`
- 让相关 specs 与 tests 反映 bootstrap 已成为受支持的 command surface

**Non-Goals:**
- 不重新设计 bootstrap 的五阶段状态机
- 不新增新的 bootstrap CLI 子命令或“extend 模式”
- 不把 bootstrap 纳入默认 `core` profile
- 不改动 bootstrap 的业务语义（baseline 分类、mode 支持、promote 行为）

## Decisions

### 1. 保留 `bootstrap-opsx` 作为内部 workflow ID，引入独立 external command slug

**Decision:**
新增一层共享命名模型，将内部 workflow ID 与外部 command slug 分离。bootstrap 继续使用内部 ID `bootstrap-opsx`，但外部命令 slug 为 `bootstrap`。

**Rationale:**
- profile/config、template filter、workflow selection 当前已经依赖 `bootstrap-opsx`
- 直接把 workflow ID 改成 `bootstrap` 会扩大变更面并引入不必要迁移风险
- 只在 adapter 层做 bootstrap 特判会破坏 migration、drift、cleanup、tool detection 的一致性

**Alternatives considered:**
- **直接把 workflow ID 改为 `bootstrap`**：拒绝。会波及 profile/config、tests、existing templates，迁移成本更高。
- **只对 Claude adapter 特判 `bootstrap-opsx -> bootstrap`**：拒绝。其他工具和检测链路仍会继续使用错误假设，修不干净。

### 2. 让 command generation contract 显式承载 command slug

**Decision:**
扩展 `CommandContent` / command template entry，使其既携带内部 `id`，也携带用于文件生成的 `commandSlug`。`generateCommand()` 与 adapters 用 `commandSlug` 生成路径；上层 workflow 过滤仍用内部 ID。

**Rationale:**
- 当前 `generateCommand()` 直接调用 `adapter.getFilePath(content.id)`，把内部 ID 当作外部文件名
- 这是 bootstrap 命令产物变成 `.claude/commands/opsx/bootstrap-opsx.md` 的根因
- 一旦 command slug 成为一等字段，所有工具 adapter 都能无差别复用

**Alternatives considered:**
- **保留 CommandContent 不变，增加外部路径后处理**：拒绝。会让生成与检测走不同规则，难以维护。

### 3. 共享同一套 workflow→command slug 映射给 generation、detection、migration、cleanup

**Decision:**
把 command slug 映射做成共享常量/工具函数，供以下路径共同使用：
- `src/core/shared/skill-generation.ts`
- `src/core/shared/tool-detection.ts`
- `src/core/profile-sync-drift.ts`
- `src/core/migration.ts`
- `src/core/update.ts`

**Rationale:**
- 当前这些路径都直接把 workflow ID 传给 `adapter.getFilePath(...)`
- 如果只改生成，不改 detection/migration/drift，会出现：文件生成正确但系统认为缺失，或者 cleanup 删不掉旧产物
- 用户指令已明确要求显式列表查找，而不是通配/正则式推断；共享映射正好满足该约束

**Alternatives considered:**
- **靠 glob 或 pattern matching 推断 bootstrap 命令文件**：拒绝。与项目规则“显式列表优先”冲突，也容易在 Windows/不同工具路径下失真。

### 4. Bootstrap docs 全部收口到真实 CLI 合同

**Decision:**
`docs/opsx-bootstrap.md` 与 `docs/commands.md` 全部改写为只描述 CLI-backed bootstrap 流程。保留 `/opsx:bootstrap` 作为 agent command 名称，但其内容只引导使用真实 CLI 子命令。

**Rationale:**
- 当前伪接口（`--focus`、`--extend`、`--refresh`）在代码中根本不存在
- `openspec/specs/bootstrap/spec.md` 已要求 schema、CLI、templates、generated instructions 保持合同一致
- 真实的范围入口是 `openspec bootstrap init --scope ...`，不是虚构命令参数

**Alternatives considered:**
- **保留旧文档并补充“已废弃”说明**：不推荐。会继续污染用户心智，且没有实现支撑。

## Risks / Trade-offs

- **[Risk] command slug 模型渗透面比表面看起来更广** → **Mitigation:** 统一从共享映射切入，优先修改 generation、detection、migration、cleanup 四条主链，避免分散特判。
- **[Risk] specs 仍沿用“9 commands”旧叙事，导致 archive 后契约回退** → **Mitigation:** 同步修改 `cli-init`、`command-generation`、`bootstrap` 相关 specs，使 bootstrap 成为正式 command surface 的一部分。
- **[Risk] 只在某个 tool adapter 生效，其他 adapter 仍产出 `bootstrap-opsx` 文件名** → **Mitigation:** 通过 `CommandContent.commandSlug` 统一所有 adapter 输入，而不是单工具修补。
- **[Risk] Windows 路径测试继续硬编码斜杠导致误报** → **Mitigation:** 在 specs、tests、design 中明确要求使用 `path.join()` / `path.resolve()` 与 path-aware assertions。
- **[Risk] 现有已生成项目产物与新规则产生 drift** → **Mitigation:** 更新 migration 与 profile-sync-drift，让已有 bootstrap workflow 能被正确识别并在 `openspec update` 时收敛到新路径。

## Migration Plan

1. 先引入共享 workflow→command slug 模型，不改 bootstrap CLI 本身。
2. 更新 command generation contract 与 adapters，使新生成路径使用 external slug。
3. 同步更新 detection / migration / profile-sync-drift / cleanup，使系统能识别新路径并正确删除旧选择外的命令产物。
4. 修正文档与模板，删掉 bootstrap 伪接口叙事并加入 `/opsx:bootstrap` 主文档入口。
5. 补充回归测试，覆盖：生成、迁移识别、drift 检测、cleanup、文档契约。
6. 如仓库内已有旧生成产物，依赖 `openspec update` 统一刷新到正确命令路径。

## Open Questions

- 是否需要在成功输出或 onboarding 文案中显式提到 `/opsx:bootstrap`，还是仅在 expanded workflow 文档中暴露即可？
- 旧 `bootstrap-opsx` 命令文件是否需要专门兼容迁移提示，还是直接由 `update` 覆盖/清理足够？
