## 1. 提示词 Fragment

- [x] 1.1 修改 `src/core/templates/fragments/opsx-fragments.ts` 的 `OPSX_SHARED_CONTEXT`，在 "domains → capabilities structure" 之后增加一行引导读取 `project:` 块的 intent 和 scope

## 2. Bootstrap 产出

- [x] 2.1 移除 `src/utils/bootstrap-utils.ts` 中基于 `package.json` 的 project 元数据推断逻辑
- [x] 2.2 在 `assembleBundle()` 中基于 bootstrap 工作区信息组装 `project.intent`，来源限定为 `evidence.yaml` / `domain-map/*.yaml` 的当前内容
- [x] 2.3 在 `assembleBundle()` 中基于 `scope.yaml` 与当前映射覆盖信息组装 `project.scope`
- [x] 2.4 当 bootstrap 输入不足时，对应字段保持留空，不使用 manifest heuristic 补齐
- [x] 2.5 保持 `formal-opsx` / `invalid-partial-opsx` baseline 不进入该 project 元数据填充路径，且不修改已有 `openspec/project.opsx.yaml`
- [x] 2.6 保持 `project.id` / `project.name` 的保守默认策略，不再从生态特定 manifest 推断

## 3. 文档对齐

- [x] 3.1 更新 `docs/opsx-bootstrap.md` 的 "Minimal Example" 代码块，将 `description/version/code_refs` 替换为 `id/name/intent`

## 5. Bootstrap 工作区保留

- [x] 5.1 移除 `src/utils/bootstrap-utils.ts` 中 `promoteBootstrap()` 末尾的工作区删除代码块（`// Clean up workspace` 及 `fs.rm(bsDir, { recursive: true, force: true })`）
- [x] 5.2 在 `promoteBootstrap()` 返回值或通过 callback 向调用层传递保留提示消息（如 `Bootstrap workspace retained at openspec/bootstrap/. You may delete it manually once you no longer need it.`）
- [x] 5.3 确认 CLI 调用层在 promote 成功后打印该提示
- [x] 5.4 为 `promoteBootstrap()` 添加测试：promote 完成后 `openspec/bootstrap/` 目录仍存在
- [x] 5.5 为 `promoteBootstrap()` 添加测试：promote 输出包含工作区保留提示

## 4. 测试

- [x] 4.1 为 `assembleBundle()` 添加测试：project 元数据从 bootstrap workspace 信息推导，而非 manifest
- [x] 4.2 为 `assembleBundle()` 添加测试：bootstrap 输入不足时 `project.intent` / `project.scope` 留空
- [x] 4.3 为 bootstrap baseline 添加测试：已有 formal OPSX 仓库仍不支持 bootstrap，且不修改现有 OPSX 文件
- [x] 4.4 验证 `OPSX_SHARED_CONTEXT` 文本包含 project 元数据引导
