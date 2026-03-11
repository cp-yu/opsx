# Project OPSX 设计文档

## 1. 核心命题

**第一准则：`T_current`（project.opsx.yaml + openspec/specs/）是已接受的当前真相，代码是其合规实现。**

抽象层级链：

```
人类意图
   ↓  （人表达）
T_current = OPSX 语义图 + Specs 行为契约（已接受的当前真相）
   ↓  （变更通过 Δ_change 表达增量意图）
T_effective = T_current ⊕ Δ_change（活跃变更的有效真相）
   ↓  （AI 作为 Contractor：在蓝图约束下自主施工，重大决策报批）
代码（中级抽象：T_effective 的一种合规实现）
   ↓  （编译器/运行时）
执行（底层）

   ↑  Advisory Channel（AI → Human，仅建议，无执行力）
```

Project OPSX 是项目的**语义中间表示（Semantic IR）**——位于人类意图和代码实现之间的高密度抽象层。它不是"更好的文档"，而是项目的**活体语义图**。

> 汇编 → C 增加了一层抽象，让人类更高效地控制机器。
> 代码 → Project OPSX 增加了一层抽象，让人类更高效地与 AI 协作。

变更通过 `Δ_change`（opsx-delta + spec delta）表达增量意图，代码对齐 `T_effective`。Truth-sync 原子地将增量合并回 `T_current`。

---

## 2. 要解决的问题

代码是**低密度协作介质**：

- AI 每次载入项目都要重新扫描代码，大量 context window 浪费在实现细节上
- 人类自动压缩（心智模型），AI 不能——必须读原始代码
- AI 从代码入口开始，而不是从语义入口开始
- 结果：局部修改正确，整体方向漂移

Project OPSX 的价值：**~1800 tokens 描述整个项目的语义结构**，而不是让 AI 花 50000+ tokens 扫描代码仍一无所知。

---

## 3. 已确认的设计原则

### P1: T_current 是已接受的当前真相
- `T_current = project.opsx.yaml + openspec/specs/`——同一基线的双视图
- 代码反映 `T_effective`（= `T_current ⊕ Δ_change`），不是反过来
- 当 `T_current` 和代码不一致时，`T_current` 是正确的，代码需要修复
- 变更不直接修改 `T_current`，而是通过 `Δ_change` 表达增量意图
- Truth-sync 原子地将 `Δ_change` 合并回 `T_current`（同时更新 OPSX + specs）
- 项目提示词必须包含此准则

### P2: 混合作者模式

**人写**（需要人类判断力，AI 无法自动推导）：

| 项 | 含义 | 例子 |
|---|------|------|
| **intent** | 节点的存在目的——WHY | "管理从创建到归档的变更生命周期" |
| **boundary** | 什么在范围内、什么不在 | "只处理 spec-driven 模式，不处理自定义 schema" |
| **invariant** | 不可破坏的规则 | "main specs 只描述当前行为，不描述未来" |
| **decision** | 设计取舍的 WHY | "用 delta 而不是全量 spec，因为减少冲突" |
| **contract** | 对外承诺 | "CLI 接受 `openspec archive [name] --yes`" |

**机器派生**（可从代码/测试/文件系统自动推导）：

| 项 | 含义 | 来源 |
|---|------|------|
| **code_refs** | 哪些文件/符号实现了这个节点 | LSP + 静态分析 |
| **evidence** | 什么代码/测试支撑什么判断 | 测试覆盖 + 代码扫描 |
| **verified_by** | 哪些测试验证了哪个 capability | 测试文件映射 |
| **implemented_by** | 哪段代码实现了哪个 capability | LSP symbol resolution |

### P3: 最小类型系统，YAML 表达
- 不发明 DSL
- 底层是结构化 YAML，Markdown 是渲染视图
- 类型系统尽量小，只覆盖必要的语义节点

### P4: ChangeDelta 不进 project.opsx.yaml
- `project.opsx.yaml` 只存**当前真相**
- 变更 delta 存在 `changes/<name>/opsx-delta.yaml`
- 理由：多分支同时改真相文件 → 冲突失控

### P5: 粒度到 Capability，不到函数
- 函数名只在 `code_refs.symbols` 里当证据锚点
- 不做函数级真相建模

---

## 4. 语义图模型

### 4.1 节点类型（7 种）

| 节点 | 必填字段 | 可选字段 | 高密度含义 |
|------|---------|---------|-----------|
| **Project** | id, name, intent, truth, roots | — | 项目使命、真相边界、仓库路径 |
| **Domain** | id, name, intent | boundary | 稳定问题域的边界和词汇表 |
| **Capability** | id, name, intent, status, spec_refs | code_refs, external_deps | 一个"值得路由"的能力单元 |
| **Invariant** | id, statement, scope, severity | — | 不可破坏的规则 |
| **Interface** | id, kind, surface, contract | — | 外部接触面和对外承诺 |
| **Decision** | id, statement, status | — | 设计取舍的 WHY |
| **Evidence** | id, kind, ref, claim | — | 证明链：什么代码/测试支持什么判断 |

**字段值域**：OPSX 是高自由度文本格式，字段值不做枚举强制。以下为推荐值：

- `Capability.status`：implemented / planned / deprecated
- `Invariant.severity`：critical / high / medium
- `Invariant.scope`：all / `<domain-id>` / `<path-glob>`
- `Decision.status`：accepted / superseded / deferred

#### Capability 扩展字段

**`code_refs`**（机器派生，bootstrap 自动生成）：

```yaml
code_refs:
  - path: src/core/artifact-graph.ts
    symbols: [ArtifactGraph, loadArtifactGraph]  # 可选，只列入口符号
  - path: src/adapters/                           # 可以是目录
```

**`external_deps`**（外部依赖声明，不新增节点类型）：

```yaml
external_deps:
  - name: zod                        # 必填：包名/服务名
    link: https://zod.dev            # 可选：URL 或路径
    desc: Runtime schema validation  # 可选：WHY 依赖它
```

外部依赖是 Capability 的**属性**，不是图中的独立节点。理由：
- 外部库不是项目的语义单元（不是用户可见行为），违反最小类型系统原则（P3）
- 避免 50+ 依赖各建节点导致 token 预算膨胀
- AI 不需要"从 zod 节点出发找到谁依赖它"这种遍历

### 4.2 关系类型（5 种存储 + 1 种派生）

| 关系 | 含义 | 存储 |
|------|------|------|
| `contains` | 包含（Project → Domain → Capability） | 存储 |
| `depends_on` | 依赖（Capability A 依赖 Capability B） | 存储 |
| `constrains` | 约束（Invariant 约束 Capability/Interface） | 存储 |
| `implemented_by` | 实现（Capability 由 Evidence 实现） | 存储 |
| `verified_by` | 验证（Capability 被 Evidence 验证） | 存储 |
| `modified_by` | 修改（节点被 Change 修改） | **派生，不存储** |

`modified_by` 从 opsx-delta 数据机械推导，不写入 `project.opsx.yaml`。
两个遍历方向均可从 delta 记录推导：
- "此 Capability 被哪些 Change 改过？" → 扫描所有 delta 中的 MODIFIED 段
- "此 Change 改了哪些节点？" → 读取该 change 的 opsx-delta.yaml

### 4.3 文件位置

```
openspec/project.opsx.yaml    ← 项目语义图（当前真相）
openspec/specs/                ← 行为规范（OPSX 的展开视图）
openspec/changes/<name>/
  .openspec.yaml               ← change 元数据
  opsx-delta.yaml              ← 执行决策时的 OPSX 变更记录
  proposal.md / design.md / tasks.md / specs/
```

### 4.4 Project OPSX 与 Specs 的关系：同一基线的双视图

```
T_current = project.opsx.yaml + openspec/specs/（已接受的当前真相）

- project.opsx.yaml：语义图（WHY + WHAT + 拓扑结构）
- openspec/specs/：行为契约视图（HOW it behaves，Capability 节点的行为展开）
- 两者不是竞争真相，而是同一 accepted state 的两种物化形式
- Truth-sync 必须原子化：OPSX + specs 一起更新或一起不更新
- Specs 是行为契约（behavior contract），不是实现计划
```

### 4.5 YAML 结构决策

| 决策 | 选择 | 理由 |
|------|------|------|
| 顶层结构 | 按节点类型**平铺** | 跨类型关系无法用嵌套表达；支持分层按段加载 |
| Relations | **独立区段**，`{ from, type, to }` 行内格式 | 集中管理语义图的边，方便验证完整性 |
| 层级标记 | `# --- L0/L1/L2 ---` 注释 | 人类友好的分层边界，AI 按需截取 |

```yaml
# 顶层结构示意
project: { ... }           # L0
domains: [ ... ]            # L1
capabilities: [ ... ]       # L2
invariants: [ ... ]         # L2
interfaces: [ ... ]         # L2
decisions: [ ... ]          # L2
relations: [ ... ]          # L2（独立区段，{ from, type, to } 行内格式）
```

---

## 5. OPSX Delta（变更的增量描述）

### 5.1 性质

OPSX delta 是**变更对 OPSX 层面的增量描述**（ADDED/MODIFIED/REMOVED），与 spec delta 共同构成完整的 `Δ_change`：

- 记录变更在 OPSX 层面引入了什么新节点、修改了什么、删除了什么
- 帮助创建 plan（AI 据此理解变更范围和语义影响）
- 在 truth-sync 阶段，被原子地合并回 `project.opsx.yaml`

因果链：Create change（人表达意图）→ 生成 opsx-delta + spec delta → 代码对齐 `T_effective` → truth-sync 合并回 `T_current`。

### 5.1.1 Truth-Sync 合并语义

Truth-sync 对 `opsx-delta.yaml` 的处理（Agent-driven，与 spec sync 一致）：

- **ADDED nodes** → 添加到 `project.opsx.yaml` 对应区段（domains/capabilities/invariants/etc.），自动补充相关 relations
- **MODIFIED nodes** → 按 `id` 定位目标节点并替换变更字段
- **REMOVED nodes** → 按 `id` 删除节点 + 清理关联 relations

合并顺序：先 sync spec delta → 再 sync opsx-delta（specs 是行为展开，OPSX 是语义索引）。两者在同一次操作中完成，不允许只做一半。

用和 delta specs 完全相同的 ADDED/MODIFIED/REMOVED 模式。

### 5.2 OPSX Delta 格式

存放位置：`openspec/changes/<name>/opsx-delta.yaml`

````yaml
# openspec/changes/add-websocket/opsx-delta.yaml

## ADDED Nodes

domains:
  - id: domain.realtime
    name: Realtime
    intent: Push-based notifications for change status.

capabilities:
  - id: cap.ws-notifications
    name: WebSocket Notifications
    intent: Push real-time change status updates to connected clients.
    status: planned
    spec_refs:
      - path: openspec/changes/add-websocket/specs/realtime/spec.md

relations:
  - from: domain.realtime
    type: contains
    to: cap.ws-notifications
  - from: cap.ws-notifications
    type: depends_on
    to: cap.change-create

## MODIFIED Nodes

capabilities:
  - id: cap.change-archive
    intent: Apply approved spec deltas AND OPSX deltas before moving change to archive.
    # (Previously: Apply approved spec deltas and move change to archive.)

## REMOVED Nodes

capabilities:
  - id: cap.legacy-diff
    # (Superseded by header-based delta merge.)

relations:
  - from: domain.change-workflow
    type: contains
    to: cap.legacy-diff
````

---

## 6. 分层加载协议

### 6.1 Token 预算（以 OpenSpec 自身为例）

| 层级 | 内容 | Token |
|------|------|-------|
| L0 | project 段（intent, truth, roots） | ~120 |
| L1 | domains 列表（6 个 domain 的 id+name+intent） | ~240 |
| L2 | 单域的 capabilities + invariants + interfaces | ~300-500/域 |
| L3 | active changes 状态 | ~200 |
| L4 | 完整 specs（OPSX 的展开视图） | 按需 |
| **冷启动** | **L0 + L1** | **~360** |
| **单域深入** | **+ 相关 L2** | **~700-1000** |
| **全量** | **全部层** | **~1760** |

### 6.2 AI 入口协议

```
Step 1: 加载 project.opsx.yaml 的 project + domains (~360 tokens)
        → AI 获得项目使命、域拓扑、全局不变量

Step 2: 用户描述需求 → AI 匹配目标 Domain
        → 加载该 Domain 的 capabilities (~300 tokens)

Step 3: AI 确定影响哪些 Capability
        → 通过 spec_refs 加载对应 spec.md (~500 tokens/spec)
        → 通过 code_refs 定位代码文件（按需读取）

Step 4: AI 通过 Δ_change（opsx-delta + spec delta）表达变更意图，代码对齐 T_effective
```

### 6.3 语义路由（取代 RAG 碎片化）

当前 AI 的代码搜索是无上下文的碎片检索（把不同模块的同名文件混在一起）。Project OPSX 充当**语义路由器**：AI 先确定问题属于哪个域，再在域边界内搜索代码。

---

## 7. Change 生命周期

### 7.1 形式化状态模型

```
T_current  = project.opsx.yaml + openspec/specs/     （已接受的当前真相）
Δ_change   = opsx-delta.yaml + changes/<name>/specs/  （本次变更的增量）
T_effective(change) = T_current ⊕ Δ_change             （活跃变更的有效真相）
```

- **main/已归档态**：`T_effective = T_current`
- **活跃 change 中**：代码和验证对齐 `T_current ⊕ Δ_change`
- **Update（truth-sync）**：将 `Δ_change` 物化回新的 `T_current`

### 7.2 生命周期流程（7 阶段）

```
1. Propose    — AI 创建 change，包含 proposal + opsx-delta + delta specs
2. Review     — 人工审阅提案和增量
3. Approve    — 变更获批进入实现
4. Implement  — 按 tasks.md 清单实现（代码对齐 T_effective）
5. Deploy     — 变更部署到生产环境
6. Update     — Truth-sync：原子地将增量合并回 T_current
                 a. apply spec delta → openspec/specs/
                 b. apply opsx-delta → project.opsx.yaml
7. Archive    — 移动 change → archive/YYYY-MM-DD-<name>/
```

### 7.3 关键区分

- **Change** 是一个增量意图的容器（`Δ_change`）
- **`T_current`** 是已接受的当前真相（OPSX + specs 双视图）
- **`T_effective`** 是活跃变更期间代码应对齐的有效真相
- opsx-delta.yaml 和 spec delta 是变更的增量描述，不直接污染 `T_current`

### 7.4 Update（Truth-Sync）

Update 阶段执行 truth-sync，是原子操作：

1. 先 apply spec delta → `openspec/specs/`（Agent-driven 智能合并）
2. 再 apply opsx-delta → `project.opsx.yaml`（Agent-driven，同模式）
3. 两者必须一起完成，不允许只做一半

### 7.5 Archive

Archive 在 Update 完成后执行，将 change 目录移动到 `archive/YYYY-MM-DD-<name>/`。

---

## 8. 验证流水线（编译正确性检查）

验证的目标：**代码是否正确反映了 OPSX 意图**。

| 优先级 | 校验 | 含义 |
|--------|------|------|
| P0 | OPSX → specs 一致性 | capability 的 spec_refs 是否存在且对应 |
| P1 | OPSX → code 一致性 | code_refs 引用的文件/符号是否存在 |
| P2 | 跨域依赖完整性 | depends_on 关系是否成立 |
| P3 | Invariant 验证 | 代码是否违反 OPSX 声明的不变量 |

**与现有 Spec 验证的关系**：互补，不冲突。

| 层 | 现有验证 | OPSX 验证 |
|----|---------|-----------|
| 目标 | Spec 文件格式正确性（文档 lint） | OPSX → Code 编译正确性（语义一致性） |
| 检查项 | Purpose 长度、SHALL/MUST 关键字、Scenario 完整性 | spec_refs 存在、code_refs 存在、依赖完整、不变量 |

两层叠加：现有验证确保 spec 文件格式合规，OPSX 验证确保语义图与实现一致。
悬空引用（spec_refs 指向不存在的文件、code_refs 指向已删除的符号）由 AI 编译器在日常维护中更新。

---

## 9. 关键洞察

### 9.1 语义路由取代 RAG 碎片化
AI 先通过 OPSX 确定问题属于哪个域，再在域边界内搜索，而不是无差别地向量检索整个代码库。

### 9.2 意图合并取代代码冲突
两个开发者的代码冲突 → 先在 OPSX 层对齐意图。意图不冲突 → AI 自动重写代码。意图冲突 → 人类在 OPSX 层对话，而不是看 git diff。

### 9.3 验证流水线检查编译正确性
方向是 OPSX → code（代码是否正确反映意图），不是 code → OPSX（OPSX 是否跟上代码）。

### 9.4 Bootstrap 方法论

大多数用户是 brownfield。Bootstrap 建模为特殊的 `bootstrap-baseline` change，归档后形成首个 `T_current`。

统一三种起点：
- **Greenfield**：`T_current` 近乎为空，bootstrap 从零开始
- **Brownfield（有 specs）**：从既有 specs 反推完整 `T_current`
- **Brownfield（仅代码）**：最小种子 + JIT 扩展
- 之后三者走同一条 change-first 生命周期

**两种模式由用户选择**。

#### 模式 A：完整 Bootstrap（已有 openspec/specs/ 的项目）

1. **证据采集**（自动）——输入优先级：现有 specs > README/ADR > Tests > Code/LSP
2. **完整草稿生成**（AI → L0-L2）——从 specs 归纳 domain/capability/spec_refs/relations/invariants/interfaces；LSP 补 code_refs；intent/invariant/decision 标记 `[DRAFT]`
3. **人工审查**（3 个 Checkpoint）：
   - A: 项目边界——`project.intent` / `truth` / `roots` 是否准确
   - B: 粒度——domain/capability 划分是否合适，未混入实现细节
   - C: 语义——intent/invariant/decision 是 WHY，不是代码现状复述
4. **接受基线**——移除 `[DRAFT]` → 生成 `bootstrap-baseline` change → 归档 → 首个 `T_current`

#### 模式 B：种子 Bootstrap（仅代码、无 specs 的项目）

1. **证据采集**（自动，信号弱）——Code / LSP / Tests / README
2. **最小种子生成**（AI → L0-L1 + 核心 L2）——只输出 project + domains + 核心 capabilities（名称 + intent 草稿）；不生成 invariants/interfaces/decisions/relations
3. **简化审查**——仅 Checkpoint A（项目边界）和 B（粒度）
4. **接受种子基线**——归档 → 后续 change 的 opsx-delta 逐步丰富深层节点

---

## 10. 待验证事项

| 编号 | 事项 | 状态 |
|------|------|------|
| V0 | 为 OpenSpec 自身写一个真实的 project.opsx.yaml，验证 AI 认知提升 | 完成（含 code_refs + external_deps） |
| V2 | AI 入口从"读代码"变为"读 OPSX → 定位域 → 定位能力 → 按需读代码" | 待做 |
| V3 | 验证流水线：代码是否正确反映 OPSX 意图 | 待做 |
| V4 | OPSX YAML Zod schema（与代码库风格一致）| 待做 |

---

## 11. 开放问题

1. **~~Archive 冲突合并~~**（已解决）：两个 change 同时 modify 同一 OPSX 节点如何处理？
   - 两个 change 对应同一个 project OPSX，各自产生 opsx-delta 和 spec delta
   - 先在 OPSX 层面合并两个 `T_current`（project.opsx.yaml + specs）
   - 合并完成后，两个 change 各自保留
   - Code 跟随 OPSX 合并结果即可
   - **核心原则：在最高抽象层合并，低层自动跟随**

2. **~~Bootstrap 流程~~**（已解决）：已有项目如何生成初始 project.opsx.yaml？
   - 建模为特殊的 `bootstrap-baseline` change
   - 两种模式：完整 Bootstrap（有 specs）和种子 Bootstrap（仅代码），由用户选择
   - 具体流程见 §9.4 Bootstrap 方法论

3. **MODIFIED 的 old_value**：opsx-delta 中是否需要记录变更前的值？
   - delta 放在 change 中可以记录 old_value
   - change 是计划，project.opsx.yaml 是计划执行后的呈现

4. **~~AI 编译边界~~**（已解决）：OPSX → code 的"编译"过程中，AI 的角色边界在哪？

   **精确角色：OPSX Contractor（承包商）**

   对外沟通用"编译器"作为一句话隐喻，系统内部用 Contractor 定义。
   编译正确性 = 输出满足所有 OPSX 约束（不要求输出唯一确定）。

   **四级协议：**

   | 级别 | 名称 | AI 行为 | 例子 |
   |------|------|---------|------|
   | L0 | 自主执行 | 不需人类参与 | 内部函数/类、命名、错误处理、日志、格式 |
   | L1 | 决策并记录 | 自行决策，记录 WHY | 从多种等效实现中选一种、性能优化 |
   | L2 | 停止并请示 | 列出选项，等人类裁决 | OPSX 缺失依赖、语义歧义、架构建议 |
   | L3 | 绝对禁止 | 无论如何不可做 | 在 Update（truth-sync）流程之外直接改 OPSX、绕过 invariant、删 OPSX 节点 |

   **Advisory Channel（建议通道）：**

   ```
   [主通道]   OPSX  ──→  AI  ──→  Code
                         │
   [建议通道]            └──→  Advisory Report  ──→  Human
   ```

   AI 可上报 OPSX 不一致/遗漏/优化建议，但建议通道是纯信息性的，无执行力。
   AI 绝不能直接修改 project.opsx.yaml。

5. **~~互斥能力声明~~**（已解决）：两个 Capability 语义互斥如何表达？
   - 用 Invariant 节点声明（如 "系统不可同时启用 X 和 Y"），不新增 `conflicts_with` 关系类型
   - 符合最小类型系统原则（P3）

6. **~~替代语义~~**（已解决）：Capability 被新 Capability 替代时如何记录？
   - 替代关系是历史信息，存在 opsx-delta.yaml 的 REMOVED 注释中即可
   - 不污染 project.opsx.yaml（当前真相文件只存当前状态）

7. **~~回滚/撤销~~**（已解决）：Change 实现失败如何回滚？
   - 利用 git 工具（revert/reset），不需要 OPSX 层面的回滚机制
   - opsx-delta 是记录而非指令，git 历史是回滚依据

8. **~~Schema 版本演化~~**（已解决）：project.opsx.yaml 的 schema 如何升级？
   - 字段增删对 AI 编译器是自适应的（高自由度文本）
   - 重大结构变更时提供迁移指引
