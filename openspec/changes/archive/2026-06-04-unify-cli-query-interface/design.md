## Context

当前系统中，AI Agent（如 openspec-impact-sweeper）需要查询 OPSX 架构数据和 cap→spec 映射时，直接读取 `openspec/project.opsx.yaml`、`openspec/project.opsx.relations.yaml`、`openspec/project.opsx.code-map.yaml` 和 `openspec/specs/*/spec.md` frontmatter。这导致：

1. **重复解析逻辑**：每个模板都需要实现 YAML 解析和 frontmatter 提取
2. **不稳定接口**：CLI 不是稳定的数据接口，Agent 无法依赖统一契约
3. **错误处理不一致**：直接文件读取缺乏统一的错误处理和验证

同时，`openspec spec list --json` 已被标记为 deprecated，但推荐的 `openspec list --specs --json` 缺少 `capabilities` 字段，导致模板仍然使用 deprecated 命令。

现有数据访问层已经提供了 `readProjectOpsx()`、`readProjectOpsxRelations()`、`readProjectOpsxCodeMap()` 和 `parseSpecFrontmatter()` 工具函数，但这些函数未通过 CLI 暴露给 Agent。

## Goals / Non-Goals

**Goals:**
- 将 CLI 建立为稳定的数据查询接口，Agent 通过 CLI 而非直接文件读取获取数据
- 扩展 `openspec list --specs --json` 输出 `capabilities` 字段
- 新增 `openspec opsx query <node-id>` 命令，提供 OPSX 节点、关系和 code-map 查询
- 删除 deprecated 的 `openspec spec list` 命令
- 更新所有模板从直接读取文件迁移到 CLI 查询
- 严格错误处理：OPSX 文件缺失或 node 不存在时明确报错

**Non-Goals:**
- 不实现 OPSX 数据的修改操作（write/update/delete）
- 不实现多跳关系查询（--depth N）或复杂图查询（保留为未来扩展）
- 不实现关系类型过滤（--type）或方向过滤（--incoming/--outgoing），保持第一版简单
- 不改变现有 OPSX 文件格式或 spec frontmatter 格式
- 不强制所有 spec 都有 capabilities frontmatter（兼容现状）

## Decisions

### 决策 1：CLI 命令结构 - `openspec opsx query` + 过滤参数

**选择**：`openspec opsx query <node-id> [--relations] [--code-map] --json`

**备选方案**：
- A: `openspec opsx show <node-id>` - 语义偏展示，不够体现查询用途
- B: 分散的子命令 `opsx relations`, `opsx code-map`, `opsx info` - 需要多次调用

**理由**：
- `query` 语义清晰，强调只读查询
- 单一命令 + 过滤参数可一次获取完整数据，sweeper 友好
- 为未来扩展其他 opsx 子命令（validate, export）留出空间
- 符合 Unix 哲学：一个命令做一件事，通过参数调整行为

**默认行为**：无过滤参数时返回完整数据（node + relations + code-map），因为 OPSX 文件通常较小（KB 级），完整返回无性能问题。

### 决策 2：废弃命令处理 - 硬删除 `openspec spec list`

**选择**：完全删除 `openspec spec list` 及其实现和测试

**备选方案**：
- A: 保留作为别名，内部转发到 `list --specs` - 维护双重入口
- B: 限制模式（仅人类可用，Agent --json 报错）- 实现复杂

**理由**：
- 归档内容已陈旧，不应成为设计约束
- 强制迁移确保所有 Agent 使用统一接口
- 减少维护负担，代码库更清晰
- Breaking change 可通过明确错误信息引导迁移

### 决策 3：输出格式兼容 - 保持 `requirementCount` 字段名

**选择**：`openspec list --specs --json` 输出保持与旧 `spec list --json` 兼容的字段名

```json
{
  "id": "cli-spec",
  "title": "CLI Specification",
  "requirementCount": 10,
  "capabilities": ["cap.cli.list"]
}
```

**备选方案**：
- 优化字段名为 `requirements: 10` - 更简洁但 breaking

**理由**：
- 降低迁移成本，Agent 仅需改命令名，无需改解析逻辑
- 一致性优先于简洁性
- 避免引入额外的 breaking change

### 决策 4：错误处理 - 严格模式

**选择**：OPSX 文件缺失或 node ID 不存在时报错退出，不返回空结果

**备选方案**：
- 宽松模式：返回空结果或降级到文件系统扫描

**理由**：
- 明确错误信息帮助 Agent 快速定位问题
- 避免基于不完整数据做决策
- 错误信息可引导用户运行 `openspec bootstrap init` 或 `openspec init`
- sweeper 模板可在 Evidence Protocol 中明确 OPSX 文件必须存在

**错误信息示例**：
```
Error: OPSX files not found. Initialize with:
  openspec bootstrap init  (for existing projects)
  openspec init            (will create minimal OPSX)

Error: Node 'cap.x' not found in OPSX.
Available nodes: cap.cli.list, cap.cli.spec, cap.ai.impact-sweeper...
```

### 决策 5：数据访问层复用

**选择**：新 CLI 命令复用现有工具函数，不重复实现解析逻辑

- `src/utils/opsx-utils.ts` 的 `readProjectOpsx()` 系列函数
- `src/core/parsers/spec-frontmatter.ts` 的 `parseSpecFrontmatter()`

**理由**：
- 这些函数已被多个模块使用（change-sync, backfill-specs, bootstrap-utils, validator）
- 解析逻辑已稳定且经过测试
- 避免维护重复代码
- 确保 CLI 输出与内部数据结构一致

## Risks / Trade-offs

### 风险 1：Breaking change 影响现有 Agent 脚本

**风险**：删除 `openspec spec list` 后，使用该命令的 Agent 脚本会失败

**缓解**：
- 同步更新所有模板（impact-sweeper, propose, apply-change）
- 清晰的错误信息：`Command 'openspec spec list' not found. Use 'openspec list --specs' instead.`
- 归档的 specs 中引用已陈旧，不作为迁移阻塞

### 风险 2：OPSX 文件不存在时命令无法使用

**风险**：未运行 bootstrap 的项目无法使用 `openspec opsx query`

**缓解**：
- 严格错误提示，引导用户运行 `openspec bootstrap init` 或 `openspec init`
- 模板中明确 OPSX 查询的前置条件
- `openspec init` 已自动生成最小化 OPSX 骨架文件

### 风险 3：capabilities frontmatter 覆盖率低

**风险**：当前只有 4 个 spec 有 capabilities 字段，大部分 spec 返回空数组

**缓解**：
- 不阻塞本次变更，空数组是合法返回值
- 后续通过 `openspec bootstrap backfill-specs` 补全
- 模板应处理空 capabilities 的情况

### 权衡 1：完整返回 vs 按需查询

**选择**：默认返回完整数据（node + relations + code-map）

**得到**：sweeper 一次调用即可获取所有需要的数据，使用便捷

**失去**：按需查询的性能优化机会

**判断**：OPSX 文件通常较小（KB 级），完整返回无明显性能问题。未来若文件增长，可添加过滤参数优化。

### 权衡 2：硬删除 vs 保留别名

**选择**：硬删除 `openspec spec list`

**得到**：代码清爽，强制统一接口，减少维护负担

**失去**：向后兼容性，可能影响未知的外部脚本

**判断**：技术债清理优先，breaking change 可通过清晰错误信息和模板更新缓解。
