## Tasks

### 1. 新增 standalone sync CLI

- [x] 1.1 从 `ArchiveCommand` 中提取 change 选择逻辑为共享函数 `selectActiveChange(changesDir)` 放入 `src/core/change-utils.ts`
- [x] 1.2 在 `src/cli/index.ts` 新增 `openspec sync [change-name]` 命令，接受 `--no-validate` 选项
- [x] 1.3 实现 sync 命令主体：调用 `assessChangeSyncState()` → `prepareChangeSync()` → `applyPreparedChangeSync()`
- [x] 1.4 无参数时调用 `selectActiveChange()` 交互选择 change
- [x] 1.5 无 delta 时输出 `No sync required.` 并以 exit code 0 退出
- [x] 1.6 将 `ArchiveCommand` 中的 change 选择逻辑替换为调用共享函数
- [x] 1.7 添加 sync CLI 单元测试：直接指定、交互选择、无 change、无 delta 四种场景
- [x] 1.8 添加 sync 幂等性测试：连续两次 sync 后主 specs 和 OPSX 内容一致

### 2. 统一 `--skip-specs` 语义说明

- [x] 2.1 审查 `src/core/templates/workflows/archive-change.ts` 中 `--skip-specs` 相关描述，对齐为 "skip all archive-time sync writes"
- [x] 2.2 审查并对齐 docs/ 中涉及 `--skip-specs` 的文档描述
- [x] 2.3 添加回归测试：`--skip-specs` 同时跳过 spec sync 和 OPSX sync

### 3. 重建 bootstrap domain-map 三态模型

- [x] 3.1 在 `src/utils/bootstrap-utils.ts` 中新增 `InvalidDomainMap` 接口
- [x] 3.2 在 `BootstrapState` 中新增 `invalidDomainMaps: Map<string, InvalidDomainMap>` 字段
- [x] 3.3 修改 `readBootstrapState()` 的 domain-map 读取逻辑：捕获异常后保留诊断信息到 `invalidDomainMaps`
- [x] 3.4 在 `DomainStatus` 中新增 `mapState: 'valid' | 'missing' | 'invalid'` 和可选 `mapError` 字段
- [x] 3.5 修改 `getBootstrapStatus()` 构建 `DomainStatus` 时填充 `mapState` 和 `mapError`
- [x] 3.6 添加单元测试：valid / missing / invalid 三种 domain-map 文件的状态识别

### 4. Gate 与 derived artifact 一致性

- [x] 4.1 修改 `validateGate('map_to_review')`：对 `invalidDomainMaps` 中的条目报告具体文件名和失败原因
- [x] 4.2 修改 `deriveBootstrapArtifacts()`：当 `invalidDomainMaps` 非空时，`candidateState` 和 `reviewState` 不得为 `current`，降级为 `stale`
- [x] 4.3 确保 `promoteBootstrap()` 在 stale 状态下拒绝执行
- [x] 4.4 添加测试：invalid map 导致 gate 失败且 derived artifacts 降级为 stale
- [x] 4.5 添加测试：修复 invalid map 后 validate 可恢复 current 状态

### 5. Bootstrap init TTY-only 模式提问

- [x] 5.1 在 `src/commands/bootstrap.ts` 的 `bootstrapInitCommand()` 中添加 TTY 检测分支
- [x] 5.2 TTY 且未传 `--mode` 时：使用 inquirer prompt，选项来自 `getAllowedBootstrapModes(baselineType)`
- [x] 5.3 non-TTY 且未传 `--mode` 时：抛出错误，提示显式传 `--mode`
- [x] 5.4 已传 `--mode` 时：行为不变，直接使用指定值
- [x] 5.5 添加测试：mock TTY/non-TTY 环境验证 prompt 或 fail-fast 分支

### 6. Bootstrap 命令面动态暴露

- [x] 6.1 在 install planning 入口（`src/core/workflow-installation.ts` 或等效位置）添加 `resolveEffectiveWorkflows()` 逻辑
- [x] 6.2 检测 `openspec/bootstrap/` 目录存在时，将 `bootstrap-opsx` 追加到 effective workflow 列表
- [x] 6.3 确保 `openspec update` 同样遵循此规则
- [x] 6.4 不修改 `CORE_WORKFLOWS` / `EXPANDED_WORKFLOWS` 静态常量
- [x] 6.5 添加测试：bootstrap 目录存在/不存在时 effective workflow 列表的差异
- [x] 6.6 添加收敛性测试：连续两次 update 产生相同命令面文件集合

### 7. 统一 OPSX 共享上下文

- [x] 7.1 在 `src/core/templates/fragments/opsx-fragments.ts` 中新增 `OPSX_SHARED_CONTEXT` 常量
- [x] 7.2 修改 `explore.ts` 模板：将 `OPSX_READ_CONTEXT` 替换为 `OPSX_SHARED_CONTEXT`（保留 `OPSX_NAVIGATION_GUIDANCE`）
- [x] 7.3 修改 `propose.ts` 模板：在 artifact 生成循环前插入 `OPSX_SHARED_CONTEXT`
- [x] 7.4 修改 `apply-change.ts` 模板：将 `OPSX_READ_CONTEXT` 替换为 `OPSX_SHARED_CONTEXT`
- [x] 7.5 保留 `OPSX_READ_CONTEXT` 导出（可能有其他消费者），不删除
- [x] 7.6 添加 fragment 一致性测试：验证 explore / propose / apply 模板均引用 `OPSX_SHARED_CONTEXT`
