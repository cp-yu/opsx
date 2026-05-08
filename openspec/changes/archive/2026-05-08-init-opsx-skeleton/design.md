## Context

当前 `openspec init` 创建 `openspec/config.yaml`、空 `specs/`、空 `changes/archive/` 和 AI 工具 skills/commands，但不生成 OPSX 三文件。用户必须单独运行 `/opsx:bootstrap` 来创建架构映射。新用户不知道这个隐藏步骤，导致 init 后的 openspec 目录不完整。

OPSX 三文件的标准路径：
- `openspec/project.opsx.yaml`
- `openspec/project.opsx.relations.yaml`
- `openspec/project.opsx.code-map.yaml`

## Goals / Non-Goals

**Goals:**
- 首次 `openspec init` 时自动写入最小化 OPSX 骨架文件
- init 成功提示中显式引导用户运行 `/opsx:bootstrap`
- 刷新模式（extend mode）下不覆盖已有 OPSX 文件

**Non-Goals:**
- 不做任何代码分析或自动填充架构内容（那是 bootstrap 的职责）
- 不修改 bootstrap 工作流本身
- 不新增 CLI 标志或命令

## Decisions

### 决策 1: 骨架文件内容为最小空结构

骨架文件包含合法的 YAML 结构和 `schema_version: 1`，但 domains、capabilities、relations、nodes 均为空数组。`project.id` 和 `project.name` 从 `package.json` 的 `name` 字段或目录 basename 推断。

**理由**: 最小骨架让 `openspec verify --opsx` 和后续 `/opsx:bootstrap refresh` 可以正常工作，同时明确标记"尚未填充"的状态。

### 决策 2: 生成时机放在 `createDirectoryStructure()` 之后、`generateSkillsAndCommands()` 之前

```typescript
// execute() 中的调用顺序:
await this.createDirectoryStructure(openspecPath, extendMode);
if (!extendMode) {
  await this.writeOpsxSkeleton(projectPath, openspecPath);
}
const results = await this.generateSkillsAndCommands(...);
```

**理由**: 目录结构必须先存在；骨架文件是基础设施的一部分，应在业务逻辑（skills/commands）之前完成。

### 决策 3: 项目名推断策略

1. 读取 `package.json` 的 `name` 字段
2. 回退到 `path.basename(projectPath)`

转换为合法的 `proj.<name>` ID 格式（小写、特殊字符替换为连字符）。

### 决策 4: Bootstrap 引导文案插入位置

在 `displaySuccessMessage()` 的 "Getting started" 区块之后、链接之前：

```
Next: run /opsx:bootstrap to map your architecture
```

显示条件：bootstrap-opsx workflow 在 active profile 中，且非 extend 模式，且 proposal/new 等入口在 profile 中。

## Risks / Trade-offs

- [骨架文件为空导致 `openspec verify --opsx` 可能行为异常] → verify 对空 domains/capabilities 应能通过（无引用即无校验失败）
- [用户在 extend 模式下期望骨架更新] → 非目标场景，extend 模式不应篡改已有 OPSX 文件
