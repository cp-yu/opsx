## Why

当前 refresh 合同把 `openspec/bootstrap/` 视为应在 promote 后保留的审计与输入上下文，但 `openspec bootstrap init --mode refresh` 仍在目录已存在时直接失败。结果是 formal OPSX 仓库无法在“保留旧 workspace”与“开启下一轮 refresh”之间取得一致行为，用户只能手工备份或删除目录来绕过状态机缺口。

现在需要把 bootstrap refresh 的 re-entry/restart 行为补成显式合同，避免文档、状态输出、模板提示和实际 CLI 行为继续互相矛盾。

## What Changes

- 为已完成 promote 且仍保留 `openspec/bootstrap/` 的仓库定义显式的下一轮 refresh 入口，而不是继续要求用户靠手工删除目录重启。
- 收敛 bootstrap 状态语义，区分“继续当前未完成 workspace”与“基于已完成 workspace 启动新一轮 refresh run”。
- 明确旧 workspace 中哪些信息会被复用、哪些派生产物会在 restart/re-init 时重建，并要求使用显式文件列表或常量处理清理与保留。
- 对齐 `status`、`instructions`、`init` 错误文案、workflow template 与 promote 模板，去掉当前自相矛盾的 guidance。
- 补充涉及 Windows 路径与跨平台文件处理的测试，确保 restart/re-entry 行为不依赖路径字符串拼接或模糊匹配。

## Capabilities

### New Capabilities

### Modified Capabilities
- `bootstrap`: 调整 bootstrap 生命周期合同，使保留 workspace 后的下一轮启动路径、状态呈现和模板文案保持一致。
- `bootstrap-refresh-mode`: 调整 refresh 合同，定义 formal OPSX 仓库在已有 retained workspace 场景下的 re-entry/restart 语义、复用边界和派生产物重建规则。
- `bootstrap-init-ux`: 调整 `bootstrap init` 的命令语义与提示文案，为显式 restart 意图暴露可发现、可审计的入口。

## Impact

- 影响 bootstrap 状态与初始化路径：`src/utils/bootstrap-utils.ts`、`src/commands/bootstrap.ts`
- 影响 bootstrap CLI 注册与帮助文案：`src/cli/index.ts`
- 影响 bootstrap workflow 模板与文档：`src/core/templates/workflows/bootstrap-opsx.ts`、`docs/opsx-bootstrap.md`、`schemas/bootstrap/templates/promote.md`
- 影响 bootstrap 相关 specs 与测试，尤其是 retained workspace、re-init/restart、Windows 路径与显式文件追踪场景
