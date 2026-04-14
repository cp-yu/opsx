## 1. 共享 Conformance Check Fragment

- [x] 1.1 在 `src/core/templates/fragments/opsx-fragments.ts` 中新增 `CONFORMANCE_CHECK_RULES` 常量，定义 spec-code 一致性检查的共享 prompt 规则（CRITICAL/WARNING 分级、requirement 匹配逻辑、write-back 触发条件）
- [x] 1.2 新增 `VERIFY_WRITEBACK_RULES` 常量，定义 task unmark 和 remediation 生成的 prompt 规则（code_fix vs artifact_fix 分类、tasks.md 追加格式）

## 2. 增强 verify-change 模板

- [x] 2.1 在 `src/core/templates/workflows/verify-change.ts` 的 Step 8（Generate Report）之后增加 Step 9：Write-back，引用 `VERIFY_WRITEBACK_RULES` fragment，对 CRITICAL issue 执行 task unmark 并追加 remediation section
- [x] 2.2 增加 Step 10：持久化验证结果，将 result/timestamp/issues/tasksFileHash 写入 `openspec/changes/<name>/.verify-result.json`
- [x] 2.3 更新 verify 的 exit code 语义说明：`PASS` / `PASS_WITH_WARNINGS` / `FAIL_NEEDS_REMEDIATION`

## 3. 增强 apply-change 模板

- [x] 3.1 在 `src/core/templates/workflows/apply-change.ts` 的 Step 4（读取上下文）中增加：检测 `openspec/changes/<name>/.verify-result.json`，若存在且 result 为 `FAIL_NEEDS_REMEDIATION`，读取 issues 数组
- [x] 3.2 在 Step 5（显示进度）中增加：展示上次 verify 发现的 CRITICAL issues 摘要
- [x] 3.3 在 Step 6（实现循环）中增加：对被 unmark 的 task，将对应 verify issue 作为修复指导注入上下文；识别 `## Remediation` section 中的 `[code_fix]` 和 `[artifact_fix]` 条目
- [x] 3.4 增加完成提示：所有 remediation 修复后建议重新运行 `/opsx:verify`

## 4. 增强 archive-change 模板

- [x] 4.1 在 `src/core/templates/workflows/archive-change.ts` 的 expanded 模式路径中，Step 2 之前插入 verify stamp 检查：读取 `.verify-result.json`，检查存在性、result 值、tasksFileHash 新鲜度
- [x] 4.2 在 core 模式路径中，Step 3（task completion check）之后插入 Step 3.5：inline conformance check，引用 `CONFORMANCE_CHECK_RULES` 和 `VERIFY_WRITEBACK_RULES` fragment
- [x] 4.3 core 模式 inline check 仅在 delta specs 存在时触发，无 delta specs 时跳过

## 5. Delta Specs 更新

- [x] 5.1 更新 `openspec/specs/opsx-verify-skill/spec.md`：合并 write-back 和持久化相关的 MODIFIED requirements
- [x] 5.2 更新 `openspec/specs/opsx-archive-skill/spec.md`：合并 verify gate 和 inline conformance check 相关的 MODIFIED requirements

## 6. 测试

- [x] 6.1 测试 verify write-back：CRITICAL issue 触发 task unmark，tasks.md 中 `[x]` 被替换为 `[ ]`
- [x] 6.2 测试 verify write-back：WARNING issue 不触发 task unmark
- [x] 6.3 测试 remediation 生成：code_fix 和 artifact_fix 类型正确标注并追加到 tasks.md
- [x] 6.4 测试 `.verify-result.json` 持久化：包含正确的 timestamp、result、issues、tasksFileHash
- [x] 6.5 测试 archive expanded 模式：verify stamp 不存在时 soft-prompt，FAIL 时 hard-block，stale 时 soft-prompt
- [x] 6.6 测试 archive core 模式：有 delta specs 时执行 inline conformance check，无 delta specs 时跳过
- [x] 6.7 测试 apply 读取 verify 结果：FAIL_NEEDS_REMEDIATION 时展示 issues 摘要并注入修复上下文
- [x] 6.8 测试 apply 识别 remediation section：code_fix 和 artifact_fix 分别处理
- [ ] 6.9 跨平台路径测试：`.verify-result.json` 的读写使用 `path.join()`，Windows CI 验证通过
