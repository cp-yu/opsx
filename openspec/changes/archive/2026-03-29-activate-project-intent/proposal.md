## Why

`project.opsx.yaml` 的 `project` 块已有 `intent` 和 `scope` 字段（Schema 和 Zod 均已定义），但这两个字段在系统里仍处于“死字段”状态：

1. **Bootstrap 不生成**：`assembleBundle()` 仍以保守默认值输出 project 块，无法把 bootstrap 过程中已经形成的项目级理解带入候选 OPSX
2. **旧方案来源不可靠**：此前设计把 `package.json` 的 `name` / `description` 当作 project 元数据来源，但这既偏向 Node 生态，也不能可靠表达项目 brief 或目标
3. **提示词不引导读取**：`OPSX_SHARED_CONTEXT` 只提 "domains → capabilities structure"，未显式要求读取 project 元数据
4. **文档漂移**：`docs/opsx-bootstrap.md` 仍使用旧的 `description/version` 示例

因此，这次变更需要把 project 元数据的来源改回 bootstrap 自身已经产出的信息，而不是依赖生态特定的 manifest。

## What Changes

- **Bootstrap 输出**：仅在 bootstrap 为 raw/specs-based 仓库组装 candidate OPSX 时，使用 bootstrap 工作区已形成的信息（如 `scope.yaml`、`evidence.yaml`、`domain-map/*.yaml`、review 状态）填充 `project.intent` / `project.scope`
- **Bootstrap 工作区保留**：promote 完成后不再主动删除 `openspec/bootstrap/` 工作区，改为向用户打印提示说明可手动删除；工作区信息可供后续参考使用
- **已有 OPSX 项目保持不变**：对于已经存在 formal OPSX 的仓库，不新增调整、迁移或回写 `project` 元数据的路径
- **提示词 fragment**：`OPSX_SHARED_CONTEXT` 增加一行，显式引导 AI 读取 `project:` 块的 intent 和 scope
- **文档对齐**：`docs/opsx-bootstrap.md` 将旧的 `description/version` 示例更新为 `intent/scope`

## Capabilities

### New Capabilities

_无_

### Modified Capabilities

- `opsx-shared-context`：`OPSX_SHARED_CONTEXT` fragment 增加对 `project.intent` / `project.scope` 的读取引导
- `bootstrap`：bootstrap candidate bundle 的 `project` 元数据改为来自 bootstrap 过程本身，而非 `package.json` 等外部 manifest；promote 后不再主动删除工作区，改为提示用户可手动清理

## Impact

- `src/core/templates/fragments/opsx-fragments.ts`：修改 `OPSX_SHARED_CONTEXT` 常量
- `src/utils/bootstrap-utils.ts`：修改 `assembleBundle()` 的 project 元数据组装逻辑；移除 `promoteBootstrap()` 末尾的工作区删除逻辑，改为打印提示
- `docs/opsx-bootstrap.md`：更新示例 YAML
- `test/utils/bootstrap-utils.test.ts`：改为验证 bootstrap workspace 信息驱动的 project 元数据生成
- 已有 formal OPSX 项目无迁移、无写回、无结构调整
