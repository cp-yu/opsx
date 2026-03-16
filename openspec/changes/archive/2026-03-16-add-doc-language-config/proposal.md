## Why

当前 OpenSpec 生成 artifact 时，不仅缺少一个足够直接、统一的文档语言配置入口，也缺少一种让不同用户按母语或团队常用语言定义文档输出方式的标准机制。需要用一个单一、可理解的配置项，让 AI 在生成或更新 OpenSpec 文档前先读取项目配置，再按模板稳定地产出目标语言的自然语言正文，从而降低理解门槛并提升不同语言背景用户的使用体验。

## What Changes

- 在 `openspec/config.yaml` 中新增顶层配置项 `docLanguage`，作为 OpenSpec 文档自然语言正文的默认输出语言入口。
- 要求 OpenSpec 的全局 workflow prompt 在生成或更新任意 OpenSpec artifact 前先读取 `openspec/config.yaml`。
- 明确 AI 必须按既有模板结构填写内容，仅让自然语言正文遵守 `docLanguage`，不改变结构化 token、标识符和模板协议性关键字。
- 在 `openspec init` 的交互流程中加入文档语言设置，并将结果写入 `openspec/config.yaml`。
- 更新相关文档与指令约束，使 `docLanguage` 的语义清晰、可望文生义，避免额外的语言注入机制。

## Capabilities

### New Capabilities
<!-- Capabilities being introduced. Replace <name> with kebab-case identifier (e.g., user-auth, data-export, api-rate-limiting). Each creates specs/<name>/spec.md -->

### Modified Capabilities
<!-- Existing capabilities whose REQUIREMENTS are changing (not just implementation).
     Only list here if spec-level behavior changes. Each needs a delta spec file.
     Use existing spec names from openspec/specs/. Leave empty if no requirement changes. -->
- `config-loading`: 扩展项目配置加载语义，支持读取并暴露 `docLanguage`。
- `cli-init`: 扩展初始化流程，在交互式配置中采集文档语言并写入项目配置。
- `docs-agent-instructions`: 更新全局 OpenSpec 指令约束，要求 AI 先读取配置并按模板结构生成文档内容。

## Impact

- 影响项目配置解析与校验逻辑，以及 `openspec/config.yaml` 的字段说明。
- 影响 `openspec init` 的交互式配置体验和默认生成的配置文件内容。
- 影响 OpenSpec workflow prompts / agent instructions 对 artifact 生成行为的约束方式。
- 不引入额外的 per-artifact 语言注入机制；现有模板结构、标识符和协议性关键字保持原样。
