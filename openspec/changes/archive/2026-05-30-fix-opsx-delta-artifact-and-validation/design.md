## Context

`opsx-delta.yaml` 当前通过 propose/ff-change 模板中的硬编码步骤 4d 生成，而非通过 artifact graph 系统。生成的提示词缺少具体的 YAML 结构示例，导致 LLM 可能输出 Markdown 风格的非法格式。post-propose 验证告知 LLM 手动执行 OPSX dry-run merge，但无程序化 CLI 支持。修复涉及三层：提示词、schema artifact 化、validate 命令补全。

## Goals / Non-Goals

**Goals:**
- 在提示词中嵌入具体的 YAML 结构示例，消除 LLM 歧义
- 将 `opsx-delta` 注册为正式 artifact，提供 template 和 `openspec instructions` 支持
- 在 `Validator` 中添加 `validateOpsxDelta()` 方法，使 `openspec validate --type change` 自动校验 opsx-delta
- 保持向后兼容：现有 change 不受影响，opsx-delta 不在 apply 关键路径

**Non-Goals:**
- 不修改 `applyOpsxDelta()` 的 merge 逻辑本身
- 不修改 OPSX Zod schema（`OpsxDeltaSchema`）
- 不改变 `prepareChangeSync()` 或 sync/archive 流程
- 不将 opsx-delta 加入 `apply.requires` 或 `tasks.requires`

## Decisions

### Decision 1: opsx-delta 作为非关键路径 sidecar artifact

opsx-delta 的 `requires: [specs]`，但不在 `apply.requires` 或 `tasks.requires` 中。artifact loop 会在 specs 完成后自然遇到它，但即使缺失也不阻塞 apply。

**替代方案**: 将 opsx-delta 加入 tasks.requires → 会破坏所有没有 opsx-delta.yaml 的现有 change。

### Decision 2: validateOpsxDelta 复用现有纯函数

`validateOpsxDelta()` 直接调用 `readProjectOpsx()` → `readOpsxDelta()` → `applyOpsxDelta()` → `validateReferentialIntegrity()` → `validateCodeMapIntegrity()`。五个函数全部是现有的、纯函数、不写磁盘。不新增重复逻辑。

**替代方案**: 创建新的 validation-specific merge 函数 → 会导致逻辑分叉，sync 和 validate 可能不一致。

### Decision 3: validate 命令自动并行执行两种校验

`validate --type change` 对每次 change 校验并行调用 `validateChangeDeltaSpecs()` + `validateOpsxDelta()`。不增加新的 CLI flag。用户不用改变使用习惯。

**替代方案**: 增加 `--opsx` flag → 增加学习成本，且 opsx-delta 校验本应默认运行。

### Decision 4: projectRoot 从 changeDir 推算

`validateOpsxDelta` 通过 `path.resolve(changeDir, '..', '..', '..')` 计算 projectRoot，与 `change-sync.ts` 中 `projectRoot` 的用法一致。不额外接受 projectRoot 参数。

## Risks / Trade-offs

- [Risk] `path.resolve(changeDir, '..', '..', '..')` 假设 changeDir 在 `openspec/changes/<name>/` 下 → Mitigation: 与 `change-sync.ts:68` 模式一致，已充分验证
- [Risk] `applyOpsxDelta` 对 MODIFIED 不存在节点抛出异常（非返回值） → Mitigation: `validateOpsxDelta` 以 try/catch 包裹并转为 ERROR issue
- [Risk] schema.yaml 新增 artifact 条目后 `parseSchema()` 的校验（去重、依赖引用、无环） → Mitigation: `opsx-delta` ID 唯一，`specs` 是已有 artifact，无环，校验自动通过