## Why

当前 OpenSpec 对 `openspec/config.yaml` 的使用还是分散字段注入：`context` 直接包进 `<context>`，`rules` 直接包进 `<rules>`，`docLanguage` 只在部分 workflow surface 里以局部合同存在。这种做法能解决单点需求，但一旦需要让更多配置字段稳定影响 LLM 行为或程序化 artifact 生成，就会迅速演变成 scattered conditionals、重复 prompt 片段和不一致的运行时语义。

这次不再做 `docLanguage` 局部修补，而是重构为一条统一的配置投影管线：让 `config.yaml` 作为简洁 source of truth，经由投影接口编译成高密度 prompt 指令和运行时策略，再由 instruction loader、workflow templates 与程序化 artifact 生成器共同消费。这样后续新增配置字段时，系统只需要增加投影规则，而不是继续把字段判断散落到每个 workflow 和每个写入点里。

## What Changes

- 引入统一的 config projection pipeline，将 `openspec/config.yaml` 解析为面向 prompt 和 runtime 的结构化投影，而不是把原始 YAML 直接注入提示词。
- 为 `docLanguage` 建立正式的投影语义：投影结果明确要求自然语言正文使用目标语言，同时保留 `SHALL`、`MUST`、标题、BDD keyword、IDs、schema keys、路径和命令等 canonical token。
- 将现有 `context`、`rules` 注入逻辑收敛到同一投影接口下，使 instruction loader 和 workflow templates 使用统一的配置编译结果。
- 让 bootstrap、sync、archive、verify、onboard 等会生成或回写 OpenSpec artifact 的流程改为消费 config projection，而不是依赖局部 prompt 文案或硬编码英文正文。
- 为程序化 artifact 生成器建立 runtime projection 语义，避免 bootstrap candidate spec / review、starter README、sync/archive skeleton、verify remediation write-back 等路径继续绕过配置合同。
- 补充主 specs、workflow docs 与测试覆盖，确保未来新增 `config.yaml` 字段时可以通过投影接口扩展，而不是复制注入逻辑。

## Capabilities

### New Capabilities
<!-- Capabilities being introduced. Replace <name> with kebab-case identifier (e.g., user-auth, data-export, api-rate-limiting). Each creates specs/<name>/spec.md -->

### Modified Capabilities
<!-- Existing capabilities whose REQUIREMENTS are changing (not just implementation).
     Only list here if spec-level behavior changes. Each needs a delta spec file.
     Use existing spec names from openspec/specs/. Leave empty if no requirement changes. -->
- `config-loading`: 项目配置需要暴露统一的投影输入，而不只是字段级读取结果。
- `context-injection`: 现有 `<context>` 注入需要纳入配置投影管线。
- `rules-injection`: 现有 `<rules>` 注入需要纳入配置投影管线。
- `instruction-loader`: 指令加载需要输出按 surface / artifact 编译后的配置投影结果，而不是只拼接原始片段。
- `docs-agent-instructions`: 所有会生成或回写 artifact 的 workflow/skill surface 都需要继承统一的配置投影合同。
- `bootstrap`: bootstrap candidate spec、review、starter 与 stale/fingerprint 需要消费 runtime projection，不能继续写死英文正文。
- `bootstrap-init-ux`: bootstrap guidance 需要明确说明配置投影如何约束 prose 与 canonical token。
- `cli-sync`: standalone sync 首次创建或重建 formal spec 时需要消费 runtime projection。
- `specs-sync-skill`: `/opsx:sync` skill guidance 需要消费 prompt projection，并与 CLI sync 语义保持一致。
- `cli-archive`: archive-time embedded sync 需要消费同一投影结果。
- `opsx-archive-skill`: `/opsx:archive` skill guidance 与 remediation 说明需要继承配置投影合同。
- `verify-writeback`: verify 自动回写 `tasks.md` remediation 时需要消费 runtime projection。
- `opsx-onboard-skill`: onboarding 过程中生成 proposal/specs/design/tasks 时需要消费同一 prompt projection。

## Impact

- 影响 `src/core/project-config.ts`、instruction loader、workflow templates、skills 生成与相关 docs。
- 影响 bootstrap、sync/archive、verify 等程序化 artifact 生成与写回路径。
- 影响未来 `config.yaml` 新字段的扩展方式：新增字段将通过 projection rule 扩展，而不是到处增加特殊判断。
- 不改变 `config.yaml` 作为简洁 source of truth 的定位，也不引入原始 YAML 全量注入或通用翻译器。
