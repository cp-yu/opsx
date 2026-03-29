## Context

`project.opsx.yaml` 的 `project` 块定义了 `intent` 和 `scope` 两个字段，Zod Schema（`ProjectMetadataSchema`）也已声明。但在三条链路上存在断裂：

1. **生成链路**：`assembleBundle()` 的 project 块一直是保守默认值，未消费 bootstrap 过程中已经形成的项目级信息
2. **提示词链路**：`OPSX_SHARED_CONTEXT` 仅引导读取 "domains → capabilities structure"，没有显式引导读取 `project:` 元数据
3. **文档链路**：`docs/opsx-bootstrap.md` 的最小示例仍停留在旧字段


bootstrap 工作区本身已经形成了项目级输入：

- `scope.yaml`：用户确认过的扫描范围与 mode
- `evidence.yaml`：扫描阶段收集的领域列表、来源和领域 intent
- `domain-map/*.yaml`：映射阶段形成的 capability / relation / code-ref 结构
- `review.md`：人类复核后的当前候选结果

另外，bootstrap 当前本就不支持 `formal-opsx` / `invalid-partial-opsx` baseline，因此已有正式 OPSX 的仓库不应因为这次变更而被修改。

## Goals / Non-Goals

**Goals:**
- raw/specs-based 仓库在 bootstrap 组装 candidate OPSX 时，`project.intent` / `project.scope` 来自 bootstrap 工作区已形成的信息
- `OPSX_SHARED_CONTEXT` 显式引导 AI 读取 `project:` 元数据
- 已有 formal OPSX 仓库保持不变，不引入 project 元数据迁移或回写逻辑
- 文档示例与当前 schema 对齐

**Non-Goals:**
- 不改 Schema（不新增 `brief` / `description` 字段）
- 不改 `ProjectMetadataSchema` 的 Zod 定义
- 不把 `intent` / `scope` 从 optional 改成 required
- 不使用 `package.json`、`pyproject.toml`、`Cargo.toml` 等生态特定 manifest 作为 project brief 来源
- 不为已有 formal OPSX 仓库增加 bootstrap 覆写、同步或迁移逻辑

## Decisions

### D1：只在 bootstrap 生成 candidate OPSX 时填充 project 元数据

**选择**：project 元数据填充仅发生在 bootstrap candidate bundle 的组装阶段，适用 baseline 仅限 `raw` / `specs-based`。

**理由**：
- bootstrap 当前已通过 baseline 检测禁止 `formal-opsx` / `invalid-partial-opsx` 仓库进入工作流
- 这样可以把影响面严格限制在“bootstrap 新生成的 OPSX”，避免误伤已有正式 OPSX 项目
- project 元数据激活的目标是补齐 bootstrap 输出，不是给已有项目做迁移

**实现**：
- 保持现有 baseline 约束：`formal-opsx` / `invalid-partial-opsx` 仍不允许 `openspec bootstrap init`
- project 元数据组装逻辑仅位于 `assembleBundle()` 这条 bootstrap candidate 路径
- 不新增任何读取并改写现有 `openspec/project.opsx.yaml` 的逻辑

### D2：project 元数据来源改为 bootstrap 工作区，而非 package manifest

**选择**：`project.intent` 和 `project.scope` 的来源改为 bootstrap 工作区中已形成且可审查的输入，不再依赖 `package.json`。

**理由**：
- bootstrap 工作区信息来自当前流程本身，跨语言有效
- `evidence.yaml` / `domain-map/*.yaml` 已承载项目边界、能力与代码定位，比 manifest 描述更接近 OPSX 所需语义
- `scope.yaml` 反映用户明确确认过的覆盖范围，适合作为 `project.scope` 的来源之一
- review 过程已经为这些输入提供人工兜底，不需要引入 Node 专属启发式

**实现**：
- `project.intent` 基于 bootstrap 已形成的领域 intent 汇总，来源为 `evidence.yaml` 与 `domain-map/*.yaml` 中的当前内容
- `project.scope` 基于 `scope.yaml` 的 mode/include/exclude，以及当前已映射领域的覆盖信息生成
- 若 bootstrap 工作区信息不足以稳定表达某个字段，则该字段留空，不使用外部 manifest 猜测补齐
- `package.json` 等 manifest 不再参与 project 元数据推断

### D3：`project.id` / `project.name` 保持保守策略，不借助生态启发式推断

**选择**：本次变更聚焦激活 `intent` / `scope`，不再把 `project.id` / `project.name` 绑定到 `package.json` 等生态文件。

**理由**：
- bootstrap 工作区当前没有独立的“项目身份”输入文件
- 目录名、包名、模块名在不同语言生态下差异很大，直接拿来做 project identity 容易制造不稳定 ID
- 当前问题的核心是项目 brief / scope 缺失，不是 project identity 命名策略

**实现**：
- 移除 manifest 驱动的 `project.id` / `project.name` 推断逻辑
- 保持现有保守默认值，直到未来有明确、跨语言的一手项目身份输入为止

### D4：Fragment 修改范围

**选择**：仅修改 `OPSX_SHARED_CONTEXT`，不新增 fragment。

**理由**：
- `OPSX_SHARED_CONTEXT` 已被 explore、propose、apply 三个核心 workflow 消费
- 增加一行即可覆盖主要场景
- `OPSX_NAVIGATION_GUIDANCE` 更偏向代码定位，不适合承载 project 元数据读取规则

### D5：文档修改范围

**选择**：仅更新 `docs/opsx-bootstrap.md` 的最小 YAML 示例，使其与当前 schema 对齐。

**理由**：
- 当前文档问题是字段示例落后，不是 bootstrap 过程说明缺页
- 示例改为 `intent` / `scope` 即可消除误导

### D6：Promote 后保留 bootstrap 工作区，改为提示用户手动清理

**选择**：移除 `promoteBootstrap()` 末尾的 `fs.rm(bsDir, { recursive: true, force: true })` 调用，改为向用户打印一条提示，说明 `openspec/bootstrap/` 仍存在，可在确认后手动删除。

**理由**：
- bootstrap 工作区（`scope.yaml`、`evidence.yaml`、`domain-map/*.yaml`、`review.md`）包含了扫描和映射阶段形成的完整项目理解，是 `project.intent` / `project.scope` 的来源
- promote 后这些信息可能仍有参考价值，例如用于审计 bootstrap 过程、手动补充 project 元数据、或未来重新 bootstrap 时对比差异
- agent 主动删除是破坏性且不可逆的操作，而提示用户手动删除成本低、风险低
- `.gitignore` 通常已排除 `openspec/bootstrap/`，不影响版本控制

**实现**：
- 移除 `promoteBootstrap()` 中的 `// Clean up workspace` 代码块（`src/utils/bootstrap-utils.ts:1390-1392`）
- 在 promote 完成后，通过返回值或 stdout 向调用层传递提示消息，由 CLI 层打印：
  - 例如：`Bootstrap workspace retained at openspec/bootstrap/. You may delete it manually once you no longer need it.`
- 不新增任何主动清理的 API

## Risks / Trade-offs

- **[bootstrap 总结质量受 evidence / domain-map 质量影响]** → project 元数据质量取决于 scan/map/review 输入质量，但这比依赖生态 manifest 更符合 OPSX 语义
- **[字段可能留空]** → 当 bootstrap 输入不足时，选择不写入字段而不是伪造 brief；代价是部分 candidate project 元数据仍需人工补充
- **[已有 OPSX 不自动修复]** → 这次变更不会回头修订已有 formal OPSX 项目的 project 元数据；这是有意限制影响面，而不是遗漏
- **[工作区残留]** → promote 后 `openspec/bootstrap/` 仍存在，如果用户不手动清理则会持续占用磁盘；但这比 agent 主动删除风险更低，且提示消息足以引导用户
