## Context

当前系统已经有三层相关能力：

- `ProjectConfigSchema` 和 `readProjectConfig()` 能解析 `apply.defaultIsolation`。
- apply workflow template 已经说明 `apply.defaultIsolation` 的四个取值：`ask`、`branch`、`worktree`、`none`。
- `materializeProjectConfigDefaults()` 和 `migrateProjectConfigDefaults()` 是 `init`/`update` 共用的磁盘默认值入口。

缺口只在最后一层：功能性默认值当前只物化 `optimization` 和 `git`，没有把已被运行时消费的 `apply.defaultIsolation` 写入 `openspec/config.yaml`。

## Goals / Non-Goals

**Goals:**

- 在新项目 `openspec init` 的配置文件中显式写出：

```yaml
apply:
  defaultIsolation: ask  # ask / branch / worktree / none
```

- 在 `openspec update` 中对旧配置 missing-only 补齐同一字段。
- 保留已有用户值，不覆盖 `branch`、`worktree`、`none` 或已有 `ask`。
- 更新规约和测试，使 `apply.defaultIsolation` 成为确认的功能性磁盘默认值。

**Non-Goals:**

- 不改变 apply 隔离执行语义。
- 不新增配置键名或别名。
- 不把 `propose` 纳入功能性磁盘默认值。
- 不实现 CLI 内部 apply 隔离执行器；当前行为仍由 workflow guidance 驱动。

## Decisions

### Decision 1: 使用既有 `apply.defaultIsolation`

选择复用已有配置键，而不是新增 `git.applyIsolation` 或 `workflow.applyIsolation`。

理由：`ProjectConfigSchema`、`readProjectConfig()`、`normalizeProjectConfig()` 和 apply template 已经围绕 `apply.defaultIsolation` 建模。新增键会制造迁移和优先级问题，没有收益。

替代方案：新增更具体的键名。缺点是需要兼容旧键，并让用户面对两个表达同一行为的配置入口。

### Decision 2: 默认值保持 `ask`

磁盘默认值写为 `ask`，只提高可发现性，不改变现有行为。

理由：`ask` 是当前缺省语义。把默认值改成 `branch` 或 `worktree` 会改变新项目在 main/master 上的行为，并可能在用户未理解隔离策略前创建分支或 worktree。

替代方案：默认 `worktree`。这能减少交互，但会改变行为且对不熟悉 worktree 的用户更重。

### Decision 3: 通过 shared default materialization 写入

只扩展 `PROJECT_CONFIG_FUNCTIONAL_DEFAULTS`、`materializeProjectConfigDefaults()`、`serializeConfig()` 和 `migrateProjectConfigDefaults()` 的缺失路径，不在 `init` 或 `update` 中各写一份逻辑。

理由：`init` 和 `update` 已经共享该入口。分散写入会造成默认值漂移。

替代方案：在 `InitCommand` 和 `UpdateCommand` 中分别补写。缺点是重复逻辑，后续默认值变更更容易漏改。

### Decision 4: 注释只保留在生成配置中

`serializeConfig()` 生成的 `config.yaml` 带行内注释 `# ask / branch / worktree / none`。`migrateProjectConfigDefaults()` 对已有 YAML 只补值，不承诺向已有字段追加注释。

理由：missing-only migration 应避免改写用户已有布局和注释。新生成配置需要可发现性，旧配置只需要功能性默认值。

替代方案：迁移时强行注入注释。缺点是增加 YAML AST 操作复杂度，并可能扰动用户文件。

## Risks / Trade-offs

- Existing tests assert `apply` is not materialized → 更新测试和规约，使它成为确认的运行时默认值。
- YAML comment preservation differs between creation and migration → 只要求 init 生成文件包含行内枚举注释；update 只要求补齐值。
- Config path behavior must stay cross-platform → 保持现有 `path.join()` / `.yaml` 优先、`.yml` fallback 路径，不新增字符串路径拼接。

## Migration Plan

1. 扩展项目配置功能性默认值，包含 `apply.defaultIsolation: ask`。
2. 调整生成配置渲染，使 init 输出 `defaultIsolation: ask  # ask / branch / worktree / none`。
3. 调整 missing-only migration，缺失时补 `apply.defaultIsolation`。
4. 更新现有规约和测试期望。

Rollback 策略：移除 `apply` 默认物化路径和相关测试/规约变更即可；已存在的用户配置仍可被现有 parser 读取。

## Open Questions

无。
