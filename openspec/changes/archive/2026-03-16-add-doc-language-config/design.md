## Context

OpenSpec 当前已经通过 `openspec/config.yaml` 承载项目级生成约束，例如 `schema`、`context` 和 `rules`。但文档语言仍然缺少一个单一且显式的配置入口，导致 workflow prompt 只能依赖分散约束或会话上下文来影响 artifact 的自然语言输出，难以形成稳定、可复用的行为契约。

这次变更需要在不增加额外语言注入机制的前提下，建立一个更简单的约束链路：AI 在生成或更新 OpenSpec artifact 前先读取项目配置，再按模板结构填写内容，让自然语言正文遵守 `docLanguage`，同时保留模板中的结构化 token、标识符和协议性关键字不变。该能力还需要在 `openspec init` 中可配置，并且字段语义要足够直观，降低理解成本。

**Goals:**
- 为 OpenSpec 文档输出增加唯一配置入口 `docLanguage`
- 让全局 OpenSpec prompt 在生成或更新 artifact 前强制读取 `openspec/config.yaml`
- 明确 AI 仅本地化自然语言正文，保持模板结构与协议性 token 原样
- 在 `openspec init` 中采集并写入文档语言设置
- 保持方案最小化，不新增 per-artifact language injection 或额外语言提示块

**Non-Goals:**
- 不做现有 OpenSpec 文档的自动翻译或迁移
- 不改变 chat 语言、CLI 输出语言或代码注释语言策略
- 不本地化 schema key、artifact ID、relation type、BDD 关键字等结构化内容
- 不引入复杂的多语言渲染层或模板翻译系统

## Decisions

### 1. 使用顶层 `docLanguage` 作为唯一配置入口
将文档语言配置放在 `openspec/config.yaml` 顶层，而不是嵌入 `rules`、`context` 或新增嵌套命名空间。这样可以保持字段可读、可发现，并与 `schema` 这类全局项目配置处于同一层级。

选择 `docLanguage` 而不是更泛化的 `language` / `locale`，是为了让字段语义直接指向“OpenSpec 文档中的自然语言正文”。它不承担 UI 本地化、时间格式或其他 locale 语义。

### 2. 用共享 workflow prompt 建立最小行为契约
不新增单独的语言 instruction 字段，也不在每个 artifact 的 instructions JSON 中再注入语言块。相反，所有 OpenSpec workflow prompt 共享一条总规则：在生成或更新任意 OpenSpec artifact 前，先读取 `openspec/config.yaml`，并使用其中的 `docLanguage` 约束自然语言正文。

这样既避免了多层注入机制，也避免把行为一致性完全押在模型对字段名的猜测上。

### 3. 模板结构与正文内容分离
AI 必须按模板填写内容。`docLanguage` 只影响自由书写的自然语言正文，不影响模板中的结构性内容。需要保持原样的内容包括：
- 模板标题与结构 token
- YAML keys / schema keys
- capability / domain / requirement 等标识符
- relation types
- BDD 关键字如 `Given / When / Then`
- 文件名、路径、命令和代码标识符

这保证了 OpenSpec 文档继续兼容现有模板、验证约束和后续处理逻辑。

### 4. `openspec init` 提供语言采集入口
在交互式初始化时增加一个文档语言输入项，并将结果写入 `openspec/config.yaml`。这样新项目从初始化开始就能拥有稳定的文档语言约束，而不是依赖后续手工编辑配置。

对于未设置 `docLanguage` 的项目，系统保持现有默认行为，不强制迁移旧项目。

## Risks / Trade-offs

- [风险] 仅依赖 prompt 读取配置，仍然受模型指令遵循能力影响 → 缓解：将“先读 config + 按模板写正文”的规则收敛成共享 workflow prompt 中的硬性要求，而不是散落在局部说明里
- [风险] 用户误以为 `docLanguage` 会翻译所有可见文本 → 缓解：在配置文档与提示词中明确其只控制自然语言正文，不控制结构化 token
- [风险] 更新已有英文 artifact 时产生中英混杂 → 缓解：默认只要求新增或修改的正文遵守 `docLanguage`，不自动整篇迁移旧文档
- [风险] 将来自定义 schema 的模板语言可能不总是英文 → 缓解：规则应表述为“保持模板结构原样”，而不是把“英文”写死成唯一协议
