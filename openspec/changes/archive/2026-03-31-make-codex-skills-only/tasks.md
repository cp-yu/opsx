## 1. Tool metadata and command-generation cleanup

- [x] 1.1 在 `src/core/config.ts` 为工具增加显式的 Codex command 支持声明，并提供共享判断入口
- [x] 1.2 删除 `src/core/command-generation/` 中的 Codex adapter 与注册项，并更新相关导出和 registry 测试
- [x] 1.3 更新 `src/core/workflow-installation.ts`、`src/core/profile-sync-drift.ts`、`src/core/migration.ts`，让 Codex 不再被视为 command-backed 工具

## 2. Init and update behavior

- [x] 2.1 重构 `src/core/init.ts`，按工具有效行为处理 Codex，在 `delivery=both|skills|commands` 下都仅生成或保留 `.codex/skills/`
- [x] 2.2 重构 `src/core/update.ts`，停止刷新 Codex commands，并修正 summary/skip 文案，避免继续报告 “no adapter” 或虚假的 command 统计
- [x] 2.3 增加清理逻辑，确保历史遗留的 Codex managed command 文件在切换到新行为后会被显式移除，且不使用模式匹配删除

## 3. Documentation and verification

- [x] 3.1 更新 `docs/supported-tools.md` 及必要的 `docs/cli.md` 文案，明确 Codex 为 skills-only
- [x] 3.2 补充或调整 `command-generation`、`init`、`update`、`migration`、`profile-sync-drift` 相关测试，覆盖 Codex 在三种 delivery 下的行为
- [x] 3.3 增加跨平台断言与 Windows CI 验证，确认路径构造和测试期望值继续使用 `path.join()` / `path.resolve()`
- [x] 3.4 运行针对性测试，并在必要时执行完整测试套件验证无回归
