# 2026-03-20 fix-bootstrap-and-completion-gaps 归档

以下待办已由归档变更 `openspec/changes/archive/2026-03-20-fix-bootstrap-and-completion-gaps/` 完成：

- CLI shell completion 补齐 `bootstrap`、`sync`、`status`、`instructions`、`templates`、`schemas`、`new` 等缺失命令与子命令
- `bootstrap init` 不再因为空 `openspec/specs/` 被误判，只显示 `full`
- `full` 模式在无真实 spec 内容时，promote 会正确写入 OPSX 并创建 specs starter
- bootstrap baseline 检测不再把空 `openspec/specs/` 视为已有 specs
- bootstrap baseline 命名从 `no-spec` / `specs-only` 规范为 `raw` / `specs-based`

说明：

- bash completion 的实际根因是旧备份脚本覆盖主脚本，不是 CLI 命令没有注册
- 已修复 bash installer 的 `.bashrc` 写入逻辑：只 source 主 completion 文件，并且在脚本内容未变化时仍刷新 `.bashrc`
- 本次归档最初使用了 `--skip-specs`，随后已将 `bootstrap-baseline` 和 `cli-completion-registry` 手动同步回主 `openspec/specs/`
