# Project OPSX 一页纸初稿

## 1. 定义

Project OPSX 是一个**项目级聚合视图**，用于在进入具体 change 之前，先向 AI 和用户提供“项目当前状态”的结构化语义入口。

它不是新的 source of truth，也不替代现有 change-level OPSX。

它建立在现有 OpenSpec 结构之上：

- `openspec/specs/`：当前正式行为
- `openspec/changes/`：正在发生的变更
- `openspec/config.yaml`：项目级上下文、规则、约束

一句话：

> Project OPSX 让 vibe coding 先基于“项目状态”开始，而不是先基于“代码实现”开始。

---

## 2. 要解决的问题

当前 OPSX 更擅长管理单个 change，但在用户开始一个需求时，AI 很容易直接从代码切入，导致：

- 上下文起点过低，先看实现，不先看项目语义
- 不清楚需求属于哪个 domain / capability
- 不知道应新建 change 还是续接已有 change
- 容易局部修改正确、整体方向漂移

Project OPSX 的目标是提供一个更高层的起点，让 AI 在动代码前先理解：

- 项目现在是什么
- 当前有哪些能力
- 哪些能力正在被修改
- 新需求应该挂到哪里

---

## 3. 核心定位

### 它是什么

Project OPSX 是：

- 面向整个项目的语义索引
- 面向 AI 的项目入口上下文
- 连接“项目现状”和“具体 change 工作流”的桥

### 它不是什么

Project OPSX 不是：

- 新的 specs 替代品
- 新的 change 替代品
- 另一份手工维护的大型总文档
- 代码依赖图或源码文件 DAG

---

## 4. 最小内容模型

一个最小可用的 Project OPSX 应包含以下部分：

### 4.1 Summary
- 项目定位
- 当前阶段
- 核心目标
- 系统边界

### 4.2 Domain / Capability Map
- 当前有哪些 domain
- 每个 domain 下有哪些 capability
- 哪些是核心能力
- 哪些 capability 正在演进

### 4.3 Constraints / Conventions
- 技术栈
- API 规则
- 测试约定
- 向后兼容要求
- 项目级规则

### 4.4 Active Changes Snapshot
- 当前有哪些 active changes
- 每个 change 影响哪些 domain / capability
- 当前推进到什么阶段
- 是否存在重叠或潜在冲突

### 4.5 Entry Hints
- 新需求优先映射到哪个 domain
- 建议优先阅读哪些 specs
- 是否应新建 change
- 是否应先检查已有 change
- 建议从 `/opsx:explore`、`/opsx:propose` 还是续接 change 开始

---

## 5. 数据来源

Project OPSX 不应成为新的真相源，而应从以下内容派生：

- `openspec/config.yaml`
- `openspec/specs/`
- `openspec/changes/`
- 必要时参考 `openspec/changes/archive/`

其中：

- `specs/` 表示当前正式状态
- `changes/` 表示未来增量状态
- `config.yaml` 表示项目级约束

---

## 6. 与现有 OPSX 的关系

关系模型：

```text
Project OPSX
└── Change OPSX
```

工作顺序：

1. AI 先读取 Project OPSX，理解项目现状
2. AI 再判断需求应：
   - 新建 change
   - 继续已有 change
   - 或先探索
3. 然后进入现有 OPSX 流程：
   - `/opsx:explore`
   - `/opsx:propose`
   - `/opsx:new`
   - `/opsx:apply`
   - `/opsx:archive`

---

## 7. 形式建议

第一阶段建议采用**轻量文档草稿**，例如：

- `openspec/project-opsx.md`
- 或 `todo/projectOPSX.md`（概念验证阶段）

不建议一开始就做成复杂系统。

优先验证的不是“格式”，而是它是否真的能提升：

- AI 对项目全局的理解
- change 的挂接准确率
- vibe coding 的语义稳定性

---

## 8. 成功标准

如果 Project OPSX 有效，应该能看到以下结果：

- AI 面对新需求时，不再优先从代码入口开始
- AI 能先判断需求属于哪个 domain / capability
- AI 能更稳定地决定新建 change 还是续接 change
- change proposal / specs / design 的方向更一致
- 局部代码改动更少偏离项目全局语义

---

## 9. 当前建议

当前阶段不建议立即把 Project OPSX 产品化。

更合适的路径是：

1. 先把它作为概念草稿存在
2. 先验证它是否真的帮助 AI 建立项目级认知
3. 如果有效，再决定：
   - 是否纳入正式 OpenSpec 结构
   - 是否自动生成
   - 是否提供独立入口命令（如 `/opsx:project`）

---

## 10. 一句话结论

Project OPSX 的价值，不是在现有 OPSX 旁边再堆一层文档，而是在进入 change 之前，为 AI 提供一个“项目现状优先”的语义起点。