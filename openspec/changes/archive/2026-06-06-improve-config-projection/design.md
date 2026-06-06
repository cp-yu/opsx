## Context

当前项目配置系统有两层：全局配置（`~/.config/openspec/`）通过 `openspec config` 读写，项目级配置（`openspec/config.yaml`）通过 `readProjectConfig()` 读取后编译为 `configProjection` 注入 `openspec instructions` 命令的输出。

现存问题：
- `configProjection` 已经存在于 artifact instructions 的 JSON 输出中，但 propose skill 第 6 步未提及需读取此字段
- `generateApplyInstructions()` 完全没有输出 `configProjection`
- archive skill 引用"compiled prompt projection"获取 git 配置，但无法通过任何 CLI 命令获取
- `docLanguage` 字段名暗示控制"文档语言"，实际仅控制自然语言散文，准确名称应为 `proseLanguage`

## Goals / Non-Goals

**Goals:**
- 将配置字段 `docLanguage` 重命名为 `proseLanguage`，保留旧名兼容
- 新增 `openspec config project --json` CLI 命令，输出归一化项目配置
- `generateApplyInstructions()` 输出包含 `configProjection`
- 更新 propose、apply、archive skill 文档，显式指导读取配置投影

**Non-Goals:**
- 不改变 `configProjection` 的内容或结构
- 不修改 `openspec config` 全局配置命令的行为
- 不修改 explore、reviewer、optimizer skill（它们不依赖项目配置投影）
- 不引入新的配置文件格式或 schema

## Decisions

### Decision 1: `docLanguage` → `proseLanguage` 兼容策略

**选型**：Zod schema 同时接收 `proseLanguage`（优先）和 `docLanguage`（deprecated fallback），`normalizeProjectConfig()` 自动迁移。

**替代方案**：
- 硬改名（不做兼容）：破坏已有项目配置，不可行
- 仅改注释不改字段名：未解决语义模糊问题

**理由**：向后兼容，Zero cost for existing users，已配置的项目无需改动即可继续工作。

### Decision 2: `openspec config project` 命令设计

**选型**：纯查询命令，`--json` 返回 `NormalizedProjectConfig` 格式，无 `--json` 返回人类可读文本。

**替代方案**：
- 复用 `openspec config list`（全局配置）：混淆两层配置，语义不清
- 新增独立命令 `openspec project-config`：API 表面积增大，但也可接受

**理由**：`openspec config` 已有子命令体系（`list`, `get`, `set`, ...），`project` 作为子命令自然嵌入。输出格式与 `instructions` 命令中的 `configProjection.normalized` 一致，实现代码复用。

### Decision 3: Skill 文档改动方式

**选型**：在 propose/apply/archive skill 的步骤中显式写入字段名和读取方式。

**理由**：skill 文档是 agent 的直接指令源，字段名必须明确到 JSON key 级别才能被可靠执行。抽象描述（如"compiled projection"）在 agent 执行时容易被忽略。

## Risks / Trade-offs

- [Breaking 字段名变更] → Zod schema 同时接受新旧字段名，在 `normalizeProjectConfig` 中自动从 `docLanguage` 迁移到 `proseLanguage`
- [Skill 修改后 agent 仍未读取配置] → 在 skill 步骤中使用 `configProjection.prompt.fragments` 具体 JSON 路径，避免抽象措辞
- [archive 依赖新增命令] → `openspec config project` 命令在 archive 之前已存在，因 archive 是工作流最后一步
- [`openspec config project` 与 `openspec config list` 命名混淆] → 前者返回项目配置，后者返回全局用户配置，在 help 中明确区分

## Migration Plan

1. 代码层：Zod schema 支持双字段名 → `normalizeProjectConfig` 自动迁移 → 发布
2. 配置层：`openspec/config.yaml` 手动将 `docLanguage` 改为 `proseLanguage`
3. 文档层：skill 文档在部署新版本后立即生效，无需迁移

回滚：旧版本 CLI 读取含 `proseLanguage` 的 config.yaml 时会忽略该字段（Zod `.optional()`），docLanguage 回退到 undefined，相当于默认英文行为。不造成崩溃或阻塞。
