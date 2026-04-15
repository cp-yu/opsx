## 1. 共享调用引用渲染

- [x] 1.1 增加基于 workflow surface manifest 的共享 invocation renderer，按工具输出用户可见 workflow 引用
- [x] 1.2 更新 skill generation 文案转换，确保 Codex 使用精确的 `$openspec-*` skill 名称，并保留其他工具的既有语法
- [x] 1.3 为 `propose`、`new`、`continue`、`apply`、`archive` 等关键 workflow 增加精确命名回归测试

## 2. Init / Update 输出修正

- [x] 2.1 更新 `openspec init` 的 getting-started 与 restart 输出，使 Codex 使用 skills-only 文案
- [x] 2.2 更新 `openspec update` 的 onboarding 与 restart 输出，使 Codex 不再引用 `/opsx:*`
- [x] 2.3 为 Codex-only 与 command-backed 场景补充输出回归测试

## 3. 验证

- [x] 3.1 运行与 skill generation、init、update 相关的定向测试
- [x] 3.2 运行本 change 的规范校验并修正剩余 warning
