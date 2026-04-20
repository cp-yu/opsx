## 1. 生命周期与命令入口

- [x] 1.1 为 bootstrap metadata 增加 completed 状态字段与 legacy completed 推断 helper，供 `status`、`instructions` 和 `init` 共用
- [x] 1.2 扩展 `openspec bootstrap init` 选项解析与 CLI 帮助，加入显式 `--restart` 入口并区分 completed/in-progress workspace 的错误与成功文案
- [x] 1.3 在 `promoteBootstrap()` 成功路径写入 completed 状态，并保持 refresh 的 anchor 写回语义

## 2. Retained workspace 重启语义

- [x] 2.1 实现 completed retained workspace 的快照搬运流程，使用显式历史目录常量保存旧 `openspec/bootstrap/`
- [x] 2.2 实现 fresh workspace 重建逻辑，仅继承 mode、scope 与可用的 `refresh_anchor_commit`，并显式清空派生 fingerprint / candidate 状态
- [x] 2.3 保持 in-progress workspace 为 resume-only，拒绝 `--restart` 覆盖，并将用户引导到当前 phase 的 status/instructions

## 3. 文档、模板与规约对齐

- [x] 3.1 更新 `openspec/specs/bootstrap/spec.md`、`openspec/specs/bootstrap-refresh-mode/spec.md` 与 `openspec/specs/bootstrap-init-ux/spec.md` 对应实现语义
- [x] 3.2 更新 `src/core/templates/workflows/bootstrap-opsx.ts`、`docs/opsx-bootstrap.md` 与 `schemas/bootstrap/templates/promote.md`，统一 retained workspace restart guidance
- [x] 3.3 确认所有 restart 相关清理/搬运路径都通过显式常量或显式文件列表追踪，不使用 glob 或模式匹配

## 4. 测试与跨平台验证

- [x] 4.1 添加 CLI / utils 测试，覆盖 completed retained workspace 的 `init --mode refresh --restart` 主路径
- [x] 4.2 添加 legacy workspace 测试，覆盖旧 metadata 下的 completed 推断、anchor 继承与无 anchor 的全量回退
- [x] 4.3 添加 in-progress workspace 测试，验证 `--restart` 被拒绝且不会移动或覆盖当前 workspace
- [x] 4.4 添加 Windows 路径与 CI 验证任务，确保历史目录、workspace 快照和显式文件追踪在不同分隔符条件下稳定
