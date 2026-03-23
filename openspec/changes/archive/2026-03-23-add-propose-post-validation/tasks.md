## 1. 规格与边界固化

- [x] 1.1 将 `opsx-propose-skill` 提升为正式能力 spec，定义 post-propose warning-only 校验行为
- [x] 1.2 明确 `propose` 的职责边界：提示词工作流，不引入阻断式 gate
- [x] 1.3 明确 “单轮修复 + 剩余 warning 透出” 的最终输出契约

## 2. 校验契约对齐

- [x] 2.1 让 generated change specs 的 post-propose 校验与现有 delta spec 校验契约保持一致
- [x] 2.2 复用或抽出与 `sync` / `archive` prepare 阶段等价的 OPSX dry-run merge 校验能力
- [x] 2.3 明确无 `openspec/project.opsx.yaml` 时的 graceful skip 行为

## 3. 轻量文档检查

- [x] 3.1 为 `proposal.md` 增加基于当前 schema template 的轻量结构检查
- [x] 3.2 为 `design.md` 增加基于当前 schema template 的轻量结构检查
- [x] 3.3 为 `tasks.md` 增加基于当前 schema template 的轻量结构检查
- [x] 3.4 确保轻量检查以当前 schema template 为准，而不是散落文档示例

## 4. 工作流与测试

- [x] 4.1 更新 `propose` 工作流模板，插入 post-propose warning 体检与单轮修复步骤
- [x] 4.2 增加测试：warning 不阻断 apply-ready，但会进入单轮修复
- [x] 4.3 增加测试：specs warning 复用既有 delta spec 校验语义
- [x] 4.4 增加测试：opsx warning 复用 sync/archive 的完整性校验语义
- [x] 4.5 增加测试：无 formal OPSX 时优雅跳过
- [x] 4.6 更新相关文档，给出 `propose` 收尾 warning 的示例输出
