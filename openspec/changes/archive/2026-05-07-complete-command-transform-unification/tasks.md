## 1. Sync Engine — 命令路径接入变换管线

- [x] 1.1 修改 `writeCommands()` 函数：对每个 entry 的 body 调用 `runTransforms`，传入 `{ toolId, workflowId: entry.content.id, artifactType: 'command' }`，仅执行 `preAdapter` 阶段
- [x] 1.2 在 `writeCommands` 中添加 inline comment 说明 `entry.content.id` 即 `workflowId`

## 2. 适配器清理 — 移除内嵌变换

- [x] 2.1 从 `opencode.ts` 中移除 `transformToHyphenCommands` import
- [x] 2.2 从 `opencode.ts` 的 `formatFile()` 中移除 `transformToHyphenCommands` 调用，直接使用 `content.body`
- [x] 2.3 从 `pi.ts` 中移除 `transformToHyphenCommands` import
- [x] 2.4 从 `pi.ts` 的 `formatFile()` 中移除 `transformToHyphenCommands` 调用，直接使用 `content.body`

## 3. 工具函数清理 — 移除无调用方函数

- [x] 3.1 从 `command-references.ts` 中移除 `getWorkflowReferenceTransformer` 函数（无生产调用方）
- [x] 3.2 验证 `transformToHyphenCommands` 仍被 `command-references.ts` 内部使用（`transformWorkflowReferences` 调用链），保留为内部实现
- [x] 3.3 保留 `transformToHyphenCommands` 在 `src/utils/index.ts` 中的 public export（向后兼容）

## 4. 测试更新

- [x] 4.1 更新 `command-references.test.ts`：移除 `getWorkflowReferenceTransformer` 相关测试，保留 `transformToHyphenCommands` 核心逻辑测试
- [x] 4.2 在 `transforms.test.ts` 中新增命令路径变换测试：验证 `writeCommands` 对 opencode/pi 命令 body 正确执行 hyphen 变换
- [x] 4.3 运行现有 parity 测试确认 opencode/pi 命令输出不变

## 5. 验证

- [x] 5.1 运行完整测试套件 (`pnpm test`)
- [x] 5.2 运行 `openspec verify --all` 确认无退化
- [x] 5.3 手动验证 opencode/pi 命令生成输出与变更前等价
