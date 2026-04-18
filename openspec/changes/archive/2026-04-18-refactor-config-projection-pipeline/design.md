## Context

当前 `openspec/config.yaml` 的消费方式是字段散落读取，而不是统一编译。`readProjectConfig()` 返回原始字段后：`instruction-loader` 直接把 `context` 和 `rules` 原样暴露给上层，部分 workflow template 再自行拼接 `docLanguage` 合同；与此同时，bootstrap、sync/archive、verify 等程序化 artifact 写入器又各自绕过这套 prompt 约束，直接写正文文件。

这导致两个问题同时存在：
- 配置字段很难扩展。每新增一个字段，都要手工决定在哪些 workflow、哪些 artifact、哪些程序化写入器中读取和解释。
- 同一个字段无法同时稳定约束 LLM 和 runtime。`docLanguage` 就出现了“常规 artifact workflow 部分生效，但 bootstrap/sync/archive/verify 继续写死英文正文”的漂移。

这次变更的目标不是追加更多局部注入，而是把 `config.yaml` 重构成 source of truth，把字段解释逻辑集中到 projection pipeline 中，再由 prompt surface 与 runtime writers 共同消费。

## Goals / Non-Goals

**Goals:**
- 建立统一的 config projection pipeline，把项目配置编译成 prompt projection 和 runtime projection。
- 保持 `config.yaml` 简洁，只在投影层生成对 LLM 高密度、可执行的指导内容。
- 让 `context`、`rules`、`docLanguage` 走同一投影链路，而不是继续分别注入。
- 让 bootstrap、sync/archive、verify、onboard 等程序化或半程序化 artifact 生成面也消费同一份配置语义。
- 为未来新增配置字段提供稳定扩展点，避免 scattered conditionals。

**Non-Goals:**
- 不做任意 `docLanguage` 的机器翻译能力。
- 不把 `config.yaml` 全量原样注入 prompt。
- 不本地化 canonical token，例如 `SHALL`、`MUST`、标题、BDD keywords、IDs、schema keys、路径、命令。
- 不引入一个通用 DSL 或脚本引擎让配置动态执行任意 prompt 逻辑。

## Decisions

### 1. 用“配置投影”替代“原始字段注入”

运行时仍然从 `readProjectConfig(projectRoot)` 读取 `openspec/config.yaml`，但它不再是下游直接消费的最终形态。新增一层 projection，把配置编译成明确语义的中间结果。

建议的抽象：
- `normalizeProjectConfig(config)`：统一字段有效值与默认值。
- `projectConfigForPrompt(config, surface, artifactId?)`：生成 prompt projection。
- `projectConfigForRuntime(config, consumer, artifactId?)`：生成 runtime projection。

其中：
- `surface` 表示 workflow surface，例如 `propose`、`bootstrap`、`sync`、`archive`、`verify`、`onboard`。
- `artifactId` 表示具体 artifact，例如 `proposal`、`specs`、`tasks`。
- `consumer` 表示程序化生成器，例如 `bootstrap-review`、`spec-skeleton`、`verify-remediation`。

这样未来新增配置字段时，只需要补 projection rule，而不是在每个调用点写 `if (config.xxx)`。

### 2. Prompt projection 与 runtime projection 分层

同一配置字段需要同时服务 LLM 和程序化写入器，但两者的消费形式不同，因此必须拆成两层投影。

Prompt projection 负责高密度指令，例如：
- “文档自然语言正文使用中文撰写”
- “保留 `SHALL`、`MUST`、标题、BDD keyword 等 canonical token”
- “specs artifact 涉及路径时补充跨平台场景”

Runtime projection 负责程序行为，例如：
- bootstrap `review.md` 不得写死英文正文
- sync/archive 新 spec skeleton 不得注入英文占位 prose
- verify remediation write-back 的正文遵守 `docLanguage`
- 某配置字段是否影响 fingerprint/stale

两层共用同一 source config，但绝不能各自重新解释字段语义。

### 3. Projection 采用白名单规则，而不是全量透传

只有明确声明可投影的配置字段才能进入 projection 结果。初始范围只覆盖：
- `docLanguage`
- `context`
- `rules`

后续若新增字段，例如 `specStyle`、`reviewDepth`、`namingPreference`，必须显式声明：
- 是否进入 prompt projection
- 是否进入 runtime projection
- 作用于哪些 surfaces / artifacts / consumers
- 是否影响 derived artifact fingerprint

这样可以避免把 `config.yaml` 变成隐式 prompt dumping ground。

### 4. `docLanguage` 投影编译成高密度约束，而不是裸值

`docLanguage: 中文` 不应该被直接作为原始键值暴露给 LLM，而应投影成明确指导，例如：
- 新写的自然语言正文使用中文
- `SHALL`、`MUST`、标题、BDD keyword、IDs、schema keys、路径、命令保持 canonical
- 更新已有 artifact 时，只要求新增或修改的 prose 遵守中文，不要求整篇重写

这比简单传入 YAML 更稳定，也更适合作为共享 fragment。

同样，runtime projection 也要把 `docLanguage` 编译成明确策略，而不是程序里自己猜：
- `preserveCanonicalTokens = true`
- `forbidHardcodedEnglishBoilerplate = true`
- `affectsDerivedArtifactFingerprint = true`

### 5. 现有 `context` / `rules` 逻辑并入 projection pipeline

`context` 和 `rules` 仍然保留原有功能，但不再由 instruction-loader 单独拼装成特例字段。它们应该成为 projection 输出中的组成部分：
- `context` 作为 project background projection
- `rules[artifactId]` 作为 artifact-scoped authoring constraints projection

instruction-loader 的职责从“直接暴露 config 原始字段”转为“产出统一的 projection bundle”。这样 workflow template 无需关心字段来源，只关心拿到哪些约束。

### 6. 所有 artifact-writing surfaces 共享同一合同

消费 projection 的面要分两类：

1. Prompt-driven surfaces
- `instruction-loader`
- workflow templates / skills
- generated agent docs

2. Runtime writers
- bootstrap candidate spec / review / starter
- sync/archive new spec skeleton
- verify remediation write-back

其中第一类必须拿 prompt projection；第二类必须拿 runtime projection。任何会生成或回写 artifact 的面都不能再绕开这条管线。

### 7. bootstrap 把 projection 纳入 fingerprint / stale

由于 bootstrap 会生成 candidate spec、`review.md` 和 starter README，配置变化不能只影响 prompt，不影响派生产物状态。`docLanguage` 这类会改变生成文本的字段必须纳入 bootstrap source fingerprint。否则用户修改配置后，bootstrap 仍可能错误地认为 candidate/review 是 current。

## Risks / Trade-offs

- [风险] projection 层设计过重，变成另一套小型 DSL → 缓解：先只支持白名单字段与固定 renderer，不支持用户自定义投影脚本。
- [风险] prompt projection 与 runtime projection 语义漂移 → 缓解：两者必须来自同一字段规则注册表，而不是分别写模板字符串。
- [风险] 为了兼容多语言而引入翻译行为 → 缓解：明确只做配置约束编译，不做机器翻译。
- [风险] 改造 instruction-loader 后影响所有 workflow surface → 缓解：保持输出结构兼容，先在内部以 projection bundle 重构，再逐步让 templates 消费。

## Migration Plan

1. 在配置层引入 projection 结构和字段白名单。
2. 让 instruction-loader 先产出 projection bundle，同时保持现有 instructions JSON 兼容。
3. 把现有 `context`、`rules`、`docLanguage` 消费点迁移到 projection pipeline。
4. 逐步替换 bootstrap、sync/archive、verify 的程序化正文生成逻辑，使其消费 runtime projection。
5. 更新 workflow templates、skills、主 specs 和测试，确保所有 surface 统一接入。

## Open Questions

- projection bundle 是否需要显式区分 `globalFragments`、`surfaceFragments`、`artifactFragments`，还是先保持单层结构，等更多字段出现再拆？
- 对于没有现成 prose source 的程序化 skeleton，是否使用最小占位正文，还是彻底避免生成正文说明，留待后续人工补充？
