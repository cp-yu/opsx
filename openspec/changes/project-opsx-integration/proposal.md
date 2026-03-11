# Proposal: Project OPSX Integration

## Problem Statement

OpenSpec 当前缺少对 Project OPSX 概念的系统性支持。虽然设计文档（`todo/projectOPSX.md`）已完整定义 OPSX 作为项目架构真相源的概念，但代码库中：

1. **opsx-delta 零实现**：变更工作流不生成、不合并、不验证 opsx-delta
2. **路径不一致**：设计文档指向 `openspec/project.opsx.yaml`，但部分模板实现写成根目录路径
3. **缺少程序化保障**：完全依赖 AI 提示词，无结构校验、引用完整性检查、原子写入保护
4. **工作流割裂**：propose/sync/verify/apply 等工作流不感知 OPSX，导致 spec delta 与 opsx-delta 不同步
5. **无 Bootstrap 能力**：无法从现有 specs/code 生成初始 project.opsx.yaml

这导致 OPSX 无法作为实际可用的架构管理工具，仅停留在设计阶段。

## Proposed Solution

将 Project OPSX 完整集成到 OpenSpec，使其成为变更管理的一等公民：

### 核心能力

1. **opsx-delta 作为标准制品**：propose/ff-change 自动生成，sync-specs 自动合并，verify-change 强制验证
2. **程序化基础设施**：添加 `src/utils/opsx-utils.ts`，提供 YAML 操作、Zod 校验、引用完整性检查、原子写入
3. **工作流全面集成**：9 个工作流模板（propose/ff-change/sync-specs/archive/bulk-archive/verify/apply/explore/bootstrap）全部支持 OPSX
4. **AI 入口协议**：apply/explore 工作流优先读取 OPSX 图（L0→L1→L2 分层加载），减少盲目代码搜索
5. **Bootstrap 工作流**：从现有项目生成初始 OPSX 图，支持渐进式采用

### 技术方案

**责任划分**：
- **Agent-driven**（AI 在模板中）：语义生成（从 proposal 推导 opsx-delta）、合并执行、Bootstrap 初稿
- **Programmatic**（opsx-utils.ts）：结构校验、引用完整性、原子写入、分片逻辑

**关键设计**：
- 统一路径：`openspec/project.opsx.yaml`（单文件）或 `openspec/project.opsx/`（分片）
- 行数限制 + 按 domain 分片（默认 1000 行/片）
- 原子写入：临时文件 + rename（与现有 artifact 写入一致）
- 21 个 PBT 不变量保证正确性

## Benefits

1. **架构可见性**：project.opsx.yaml 成为项目架构的单一真相源
2. **变更可追溯**：每个 change 的 opsx-delta 记录架构演进
3. **AI 效率提升**：OPSX-first 导航减少无关文件读取，加速 apply/explore
4. **质量保证**：21 个 PBT 属性确保 OPSX 图的结构完整性和引用一致性
5. **渐进式采用**：Bootstrap 工作流支持现有项目平滑迁移

## Risks and Mitigations

| 风险 | 缓解措施 |
|------|----------|
| AI 生成 opsx-delta 质量不稳定 | 程序化校验拦截无效输出；PBT 测试覆盖边界情况 |
| 大文件时 LLM 输出截断 | 行数限制 + 自动分片；输出完整性校验 |
| 并发修改冲突 | 人工处理 spec 冲突 → AI 处理代码冲突；fingerprint 检查 |
| 向后兼容性 | 所有 opsx-delta 处理包含"if not exists, skip"守卫 |
| 模板维护复杂度 | 抽取共享 OPSX 指令片段；工具函数单元测试 >90% |

## Success Criteria

- [ ] 所有 9 个工作流模板集成 OPSX 支持
- [ ] 21 个 PBT 属性测试通过
- [ ] Bootstrap 工作流可用且生成质量可接受
- [ ] 文档完整（工作流指南、Bootstrap 指南、迁移指南）
- [ ] 向后兼容无 opsx-delta 的旧 changes
- [ ] 性能满足要求（YAML 解析 <10ms，校验 <100ms）

## Implementation Phases

1. **Phase 1**: 程序化基础设施（opsx-utils.ts + Zod schemas）
2. **Phase 2**: 工作流模板集成（9 个模板修改）
3. **Phase 3**: PBT 测试套件（21 个属性）
4. **Phase 4**: 文档和迁移指南
5. **Phase 5**: 验证和清理

## Alternatives Considered

### Alternative 1: opsx-delta 作为 schema artifact
**拒绝理由**：opsx-delta 是语义层产物，不适合放入 artifact DAG（它不是"proposal 的依赖"）

### Alternative 2: 完全程序化生成 opsx-delta
**拒绝理由**：需要复杂的 NLP/语义分析，AI 更适合从自然语言 proposal 推导架构概念

### Alternative 3: 延迟到 Phase 2 再做 Zod schema 验证
**采纳部分**：轻量 Zod 校验（结构 + 引用完整性）在 Phase 1，全字段强制验证在 Phase 2

## Dependencies

- 现有 `yaml` 库（已在 project-config.ts 使用）
- 现有 Zod 库（已在 artifact-graph/types.ts 使用）
- 现有 FileSystemUtils（file-system.ts）

## Timeline Estimate

- Phase 1: 程序化基础设施（~10 tasks）
- Phase 2: 工作流集成（~12 tasks）
- Phase 3: PBT 测试（~9 tasks）
- Phase 4: 文档（~7 tasks）
- Phase 5: 验证（~6 tasks）

**Total**: 44 tasks

## Stakeholders

- OpenSpec 核心开发者
- 使用 OpenSpec 管理架构的项目团队
- AI 工作流用户（依赖 OPSX 导航提升效率）
