## 1. Verify Template 扩展

- [ ] 1.1 在 `src/core/templates/fragments/opsx-fragments.ts` 中新增最优性检验 protocol fragment (`OPTIMIZATION_PROTOCOL_SUBAGENT`)，复用 clean-context subagent 模式定义 Phase 2 输入、输出、约束
- [ ] 1.2 修改 `src/core/templates/workflows/verify-change.ts`，在 Step 10 之后新增 Phase 2 instructions，整合最优性检验 protocol：两阶段流程、Search/Replace 块应用、checkpoint 管理、重试预算、退出条件
- [ ] 1.3 修改 `src/core/templates/workflows/archive-change.ts`，扩展 freshness 判定以包含 `optimization` 字段的检查逻辑
- [ ] 1.4 修改 `src/core/templates/workflows/apply-change.ts`，应用模板消费 `.verify-result.json` 时兼容 `optimization` 对象

## 2. 配置体系扩展

- [ ] 2.1 在 `src/core/config-schema.ts` 的 `DEFAULT_CONFIG` 中新增 `optimization` 配置节，包含 `enabled: true` 默认值
- [ ] 2.2 在 `src/core/project-config.ts` 的 `KNOWN_TOP_LEVEL_KEYS` 中注册 `optimization` 顶级 key
- [ ] 2.3 在 `openspec/config.yaml` 中添加 `optimization.enabled` 配置注释，默认 `true`
- [ ] 2.4 在 `src/core/config-schema.ts` 的 `validateConfigKeyPath` 中支持 `optimization` 路径的验证

## 3. Spec 与 OPSX 更新

- [ ] 3.1 更新 `openspec/project.opsx.yaml`：新增 `cap.verify.optimize` capability，intent 描述两阶段最优性检验
- [ ] 3.2 更新 `openspec/project.opsx.relations.yaml`：添加 `cap.verify.optimize` 依赖 `cap.ai.workflow-templates` 的关系
- [ ] 3.3 更新 `openspec/project.opsx.code-map.yaml`：注册 `cap.verify.optimize` 的代码引用到 template 文件
- [ ] 3.4 确认 archive spec (`openspec/specs/archive-verify-gate/spec.md`) 中 freshness 判定逻辑与 `optimization` 字段兼容

## 4. 测试

- [ ] 4.1 编写 `optimization protocol` 的单元测试：验证 Search/Replace 块匹配算法（exact match、whitespace 归一化、唯一性约束）
- [ ] 4.2 编写 Phase 2 workflow 集成测试：happy path (P1 PASS + 优化成功)、degraded path (3 次行为失败)、skipped path (dirty worktree / --skip-optimization)
- [ ] 4.3 编写 git stash checkpoint 测试：验证 dirty worktree 跳过逻辑、stash push/pop 回滚正确性
- [ ] 4.4 编写重试预算测试：格式错误上限 2、匹配错误上限 2、行为错误上限 3
- [ ] 4.5 编写 Windows 跨平台路径处理测试（Path: `path.join` 构建 checkpoint 相关路径）

## 5. Documentation

- [ ] 5.1 更新 CLI 帮助文档 (如果存在 `docs/cli.md`)，说明 verify 命令新增 `--skip-optimization` flag
- [ ] 5.2 确保跨平台路径处理符合项目规范（所有路径使用 `path.join` 构建，无硬编码分隔符）
