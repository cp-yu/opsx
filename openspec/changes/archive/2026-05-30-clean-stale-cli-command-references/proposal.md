## Why

当前 CLI 已多次演进，但部分文档与 Agent 指令仍引用已不存在的命令形式，例如 removed verify flags (`--all`、`--opsx`、`--change`、`--check-refs`) 以及 removed sync/archive `--change` flags。这些引用会误导用户和 Agent 执行无效命令，尤其会让 verify 与 validate 两套门禁语义混淆。

## What Changes

- 建立一条命令引用一致性合同：当前可读文档、生成模板、Agent 指令和 prompt 产物中的 `openspec ...` 示例必须匹配真实 CLI surface。
- 清理活跃 surface 中的 stale command references，并按语义映射到当前命令：
  - change/spec 结构验证使用 `openspec validate ...`
  - 实现验证 gate 使用 `openspec verify phase1|phase2|seal|status ...`
  - archive/sync/change name 使用 positional 参数而非旧 `--change` flag
  - bootstrap gate 使用 `openspec bootstrap validate`
- 增加审计任务，确保实现后不会继续生成旧命令引用。
- archive 历史记录默认不修改，只作为审计证据；除非某个 archived artifact 被当前模板或文档生成流程读取为用户/Agent 指令。

## Capabilities

### New Capabilities
- `cli-command-reference-consistency`: 定义当前用户文档、Agent 指令、生成模板和 prompt 产物中的 CLI 命令引用必须与真实 CLI command surface 保持一致。

### Modified Capabilities
- `docs-agent-instructions`: Agent 指令文档必须避免已删除 CLI flags 和伪命令，并指向当前验证/归档/sync 语义。
- `bootstrap`: bootstrap 相关文档不得继续使用已删除的 verify flag OPSX 检查命令。

## Impact

- 可能修改用户文档：`CLAUDE.md`、`docs/opsx-bootstrap.md`、`docs/opsx-migration.md` 以及其他扫描发现的活跃 docs。
- 可能修改生成源头：`src/core/templates/**`、`.codex/skills/**`、`.claude/**`、`.github/**` 中仍会生成或暴露 stale command references 的文件。
- 不改变 Commander.js 命令注册和 CLI 行为。
- 不默认重写 `openspec/changes/archive/**` 历史记录。
