## Context

当前项目通过 `src/core/templates/workflows/*.ts` 定义 skill 模板，使用 `getSkillTemplates()` 获取模板列表并通过 `generateSkillContent()` 生成最终的 SKILL.md 文件。部分模板的 `instructions` 字段过长（最长达 604 行），超过了业界推荐的 500 行上限，本项目设定更严格的单文件 200 行限制。

现有测试主要验证模板结构和内容正确性，但缺少对生成内容长度的验证。需要在开发阶段就能发现超标问题。

## Goals / Non-Goals

**Goals:**
- 在测试阶段验证所有生成 skill 文件行数 ≤ 200
- 将当前超标的 skill 拆分或精简到每个文件 ≤ 200 行
- 覆盖所有 tool 变体（default、claude、codex）
- 按文件路径分组报告，清晰展示每个 skill 文件的所有变体
- 提供明确的失败信息和业界参考链接

**Non-Goals:**
- 不验证生成文件的语义质量（由其他测试覆盖）
- 不限制同一 skill 目录的总行数；只限制单个文件
- 不引入脚本生成机制；本次只支持模板声明式 references 文件

## Decisions

### Decision 1: 验证每个生成文件

**选择：** 对 `SKILL.md` 使用 `generateSkillContent(template, version).split('\n').length`，对 `template.referenceFiles[]` 使用各自 `content.split('\n').length`。

**理由：**
- 验收标准是“单个文件 ≤ 200 行”，不是 skill 目录总行数
- `SKILL.md` 和 `references/*.md` 都会被实际写入工具目录
- 生成后的主文件包含 frontmatter，测试应覆盖真实文件形态

**替代方案：** 只验证 `template.instructions`
- 问题：会漏掉拆分后的 reference 文件超标
- 问题：与最终落盘文件不一致

### Decision 2: 测试所有 tool 变体

**选择：** 调用 `getSkillTemplates(undefined, undefined)`、`getSkillTemplates(undefined, 'claude')`、`getSkillTemplates(undefined, 'codex')` 获取所有变体

**理由：**
- 某些 skills（verify、archive）针对不同 tool 有不同实现
- 需要确保所有变体都符合行数限制
- 避免只测默认变体而遗漏其他变体的问题

**替代方案：** 只测试默认变体
- 问题：claude/codex 特定变体可能超标但未被发现

### Decision 3: 按文件路径分组报告

**选择：** 收集所有变体后按 `<dirName>/<filePath>` 分组，格式为 `<dirName>/<filePath> (variant1, variant2): lines (+over)`

**理由：**
- 避免相同 skill 文件的多个变体重复报告
- 清晰展示具体超标文件，包括 `references/*.md`
- 便于开发者快速定位需要修复的模板文件

**替代方案：** 每个变体单独一行
- 问题：输出冗长，相同文件的信息分散

### Decision 4: 提供外部参考链接

**选择：** 失败时提供 Matt Pocock 的 write-a-skill 示例链接

**理由：**
- 业界认可的 skill 编写最佳实践
- 展示如何拆分大文件到 references/
- 开发者可以参考实际案例而非抽象建议

## Risks / Trade-offs

**Risk 1: 200 行限制过于严格** → Mitigation: 基于探索阶段的分析，当前 6 个超标 skill 需要精简或拆分，这是合理的重构工作

**Risk 2: Tool 变体可能返回重复文件** → Mitigation: 分组逻辑按 `<dirName>/<filePath>` + `lines` 去重，相同文件内容只报告一次

**Risk 3: 测试失败会阻塞开发流程** → Mitigation: 这是预期行为，强制开发者在修改模板时保持精简

### Decision 5: 对前三候选拆分为 references

**选择：** 为 `SkillTemplate` 增加 `referenceFiles`，让 `openspec-optimizer`、`openspec-impact-sweeper`、`openspec-sync-specs` 的长协议拆到 `references/*.md`；主 `SKILL.md` 保留入口、输入、边界和 reference 清单。

**理由：**
- 这些 skill 的长内容是稳定协议、schema 或示例，适合按需读取
- 拆分符合 Matt Pocock 的短入口 + references 结构
- 单个文件均保持 ≤ 200 行，同时不丢失原有行为契约

**替代方案：** 继续压缩所有内容到 `SKILL.md`
- 问题：会丢失 optimizer/sweeper/sync 的关键细则或让入口文件贴近上限
- 问题：不符合用户要求的“拆分 + 压缩”处理
