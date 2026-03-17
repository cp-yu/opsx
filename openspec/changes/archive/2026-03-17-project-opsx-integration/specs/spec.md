# Specifications: Project OPSX Integration

## Overview

将 Project OPSX 概念完整集成到 OpenSpec，使 opsx-delta 成为变更增量描述的一等公民，并实现完整的 OPSX 工作流支持。

## Core Requirements

### R1: OPSX File Path Standardization
- **Requirement**: 统一 OPSX 文件路径为 `openspec/project.opsx.yaml`
- **Rationale**: 消除设计文档与实现之间的路径不一致
- **Acceptance Criteria**:
  - 所有模板引用统一路径常量
  - 分片文件位于 `openspec/project.opsx/` 目录
  - 向后兼容检查（如果根目录存在旧文件，提示迁移）

### R2: Programmatic Infrastructure
- **Requirement**: 添加最小程序化支持，遵循现有项目模式
- **Components**:
  - `src/utils/opsx-utils.ts`: OPSX 工具函数模块
  - Zod schemas: `OpsxNodeSchema`, `OpsxRelationSchema`, `OpsxDeltaSchema`, `ProjectOpsxSchema`
  - YAML parse/serialize（使用 `yaml` 库）
  - Referential integrity 校验
  - 原子写入（临时文件 + rename）
  - 分片逻辑（按 domain，每片 ≤ max_lines）
- **Acceptance Criteria**:
  - 所有 YAML 操作通过工具函数
  - 校验失败零副作用
  - 写入操作原子性保证

### R3: opsx-delta Generation in Propose Workflow
- **Requirement**: propose 工作流生成 opsx-delta.yaml
- **Input**: proposal.md（capabilities 列表）+ spec delta
- **Output**: `openspec/changes/<name>/opsx-delta.yaml`（ADDED/MODIFIED/REMOVED 三段式）
- **Acceptance Criteria**:
  - AI 从 proposal 提取 capabilities 并推导 OPSX 节点
  - 生成的 opsx-delta 通过结构校验
  - 与 spec delta 生成在同一原子操作中

### R4: opsx-delta Generation in FF-Change Workflow
- **Requirement**: ff-change 工作流同步生成 opsx-delta
- **Behavior**: 与 propose 相同的生成逻辑
- **Acceptance Criteria**: 快进变更包含有效的 opsx-delta

### R5: opsx-delta Merging in Sync-Specs Workflow
- **Requirement**: sync-specs 工作流合并 opsx-delta → project.opsx.yaml
- **Process**:
  1. 读取当前 project.opsx.yaml（或所有分片）
  2. 读取 opsx-delta.yaml
  3. AI 执行合并（ADDED/MODIFIED/REMOVED）
  4. 程序化校验（referential integrity + spec_refs 存在性）
  5. 原子写入（单文件或分片）
- **Acceptance Criteria**:
  - 合并满足 21 个 PBT 不变量
  - 超过行数限制时自动分片
  - 校验失败时回滚，零副作用

### R6: OPSX Awareness in Archive Workflows
- **Requirement**: archive-change 和 bulk-archive-change 感知 opsx-delta
- **Behavior**: 归档时检查 opsx-delta 是否已同步到 project.opsx.yaml
- **Acceptance Criteria**: 未同步的 opsx-delta 触发警告或阻止归档

### R7: OPSX Alignment Verification
- **Requirement**: verify-change 增加 OPSX 对齐验证维度
- **Checks**:
  - spec_refs 双向对齐（capability ↔ spec 文件）
  - opsx-delta 与 spec delta 一致性
  - project.opsx.yaml 结构完整性
  - Referential integrity
- **Acceptance Criteria**: 验证失败时提供清晰的修复指引

### R8: OPSX Context Loading in Apply Workflow
- **Requirement**: apply-change 插入 OPSX 上下文加载协议
- **Protocol**:
  1. 读取 project.opsx.yaml（L0: project 元数据）
  2. 读取相关 domains（L1: 域边界）
  3. 按需读取 capabilities/invariants（L2: 具体约束）
  4. 定位代码文件（通过 code_refs）
- **Acceptance Criteria**: AI 优先使用 OPSX 导航，减少盲目代码搜索

### R9: OPSX-First Navigation in Explore Workflow
- **Requirement**: explore 工作流引导 OPSX-first 导航
- **Behavior**: 探索代码库时先读 OPSX 图，再定位代码
- **Acceptance Criteria**: 探索效率提升，减少无关文件读取

### R10: Bootstrap Workflow
- **Requirement**: 新建 bootstrap-opsx 工作流，从现有 specs/code 生成初始 project.opsx.yaml
- **Process**:
  1. 扫描 openspec/specs/ 提取 capabilities
  2. 分析代码库推导 domains/interfaces
  3. 生成 [DRAFT] 标记的 project.opsx.yaml
  4. 3 个人工审查检查点
- **Acceptance Criteria**:
  - 生成格式与 greenfield 一致
  - [DRAFT] 标记清晰
  - 提供审查指引

## Non-Functional Requirements

### NFR1: Performance
- YAML 解析 < 10ms（1000 行文件）
- 分片读取并行化
- 校验时间 < 100ms

### NFR2: Reliability
- 所有写入操作原子性
- 校验失败零副作用
- 临时文件自动清理

### NFR3: Maintainability
- 共享 OPSX 指令片段，避免模板重复
- 工具函数单元测试覆盖率 > 90%
- PBT 测试覆盖 21 个不变量

### NFR4: Compatibility
- 向后兼容无 opsx-delta 的旧 changes
- 优雅处理缺失 project.opsx.yaml
- 支持渐进式迁移

## Out of Scope

- Zod schema 强制验证 project.opsx.yaml 全部字段（Phase 2）
- code_refs/evidence 自动生成（需 LSP 集成）
- 多 change 并行修改同一 OPSX 节点的冲突自动解决
- OPSX 可视化工具

## Success Metrics

- 所有 9 个工作流模板集成 OPSX 支持
- 21 个 PBT 属性测试通过
- Bootstrap 工作流可用
- 文档完整且示例清晰
