## Context

当前问题的根因不是 “Codex 没有生成 skills”，而是 OpenSpec 仍把 `/opsx:*` 当成默认的用户入口写进了两个层面：

- 终端成功输出层：`openspec init` / `openspec update`
- 生成文案层：写入 `.codex/skills/*/SKILL.md` 的模板内容

Codex 实际是 skills-only，真实入口来自 `.codex/skills/<skillDirName>/SKILL.md` 对应的 `$<skillDirName>` 调用形式。这里最容易出错的点是：Codex 的用户可见名称不是 workflow slug 本身，例如 `apply` 对应 `openspec-apply-change`。如果继续用字符串拼接或对 `/opsx:` 做表层替换，只会把错误换一种形式传播下去。

这次改动是一个小范围但跨模块的收口：需要让模板转换与 init/update 输出都走同一套清单驱动的引用渲染规则，同时保持 command-backed 工具现有行为不回退。

## Goals / Non-Goals

**目标：**

- 为 workflow 引用提供共享的工具级渲染逻辑
- 让 Codex 的用户可见引用使用精确的 `$openspec-*` skill 名称
- 让 `init` / `update` 的 getting-started 与 restart 文案按实际 surface 输出
- 保持 command-backed 工具的 slash command 语法不回退
- 通过显式 lookup 消除对字符串猜测和散落硬编码的依赖

**非目标：**

- 不改变 workflow ID、skill 目录名或 command slug 的既有命名
- 不修改 Codex 自身的补全 UI 或 `$openspece` 列表行为
- 不重写所有 workflow 模板为每个工具分别维护一份文案
- 不引入新的配置项来控制 Codex 的调用语法

## Decisions

### 1. 用 workflow surface manifest 作为唯一命名真源

**决策：**
新增共享辅助函数，以 `toolId + workflowId` 为输入，从 workflow surface manifest 中取出：

- Codex 需要的 `skillDirName`
- command-backed 工具需要的 `commandSlug`

然后渲染出用户可见引用。

**理由：**

- manifest 已经同时持有 `workflowId`、`skillDirName`、`commandSlug`
- `skillDirName` 才是 Codex 的真实用户入口
- 继续从 workflow slug 推导 `openspec-apply` 这类名字会直接产生错误

**备选方案：**

- **直接把 `/opsx:` 替换成 `$openspec-`**：拒绝。会把 `apply` 误渲染成 `$openspec-apply`，忽略 `-change` / `-specs` 这类后缀。
- **在每个模板里单独写 Codex 文案**：拒绝。重复且易漂移，后续新增 workflow 时还会再漏。

### 2. 让 skill 文案转换走显式 workflow lookup，而不是正则猜测

**决策：**
把模板中对 workflow 的引用转换为基于显式 workflow surface lookup 的替换逻辑；只转换已注册 workflow 的引用，不对任意字符串做猜测式替换。

**理由：**

- 项目规则已明确要求显式列表查找优先，避免模式匹配
- 这能同时满足 Codex 精确命名和 OpenCode 连字符语法
- 只转换已知 workflow，可以避免误伤普通文本

**备选方案：**

- **保留现有 OpenCode 专用替换，再加一个 Codex 专用正则**：拒绝。会把转换规则继续散落在多个分支里，后续维护只会更乱。

### 3. 让 init/update 的 getting-started 与 restart 文案复用同一渲染器

**决策：**
`init` / `update` 不再硬编码 `/opsx:propose`、`/opsx:new` 等固定字符串，而是复用同一套工具级 invocation renderer 输出首个入口命令。同时，restart 文案按 surface 类型区分：

- command-backed：继续使用 slash command 文案
- skills-only：改为 skills / workflow files 生效

**理由：**

- 当前用户实际首先看到的是 init/update 输出
- 只修 SKILL.md 不修成功提示，用户仍会被第一条信息误导
- 统一 renderer 才能避免终端输出和生成文案再次分叉

## Risks / Trade-offs

- **[Risk] 模板里存在多种 `/opsx:*` 写法，转换遗漏会留下局部错误** → **Mitigation:** 用共享 helper 覆盖常见 workflow surface，并补充针对 `propose/apply/archive/new/continue` 的回归测试。
- **[Risk] Codex 的 core 模式并不总安装所有 workflow，但文案里仍可能提到某个概念性 surface** → **Mitigation:** 仍按已注册 workflow 的精确名字渲染，避免出现不存在但“看起来像存在”的伪 skill 名。
- **[Risk] 混合工具场景下成功输出过于偏向 Codex** → **Mitigation:** `init` / `update` 仅在 skills-only 输出路径使用 Codex skill 语法，command-backed 工具继续保持 slash command 叙事。
- **[Risk] 后续新增 workflow 时忘记纳入引用渲染** → **Mitigation:** 让 renderer 从 manifest 读取，而不是维护第二套命名表。

## Migration Plan

1. 增加共享 invocation renderer，输入工具 ID 与 workflow ID，输出用户可见引用。
2. 把 skill 文案生成改为走共享 renderer，覆盖 Codex 与 OpenCode 的已知转换需求。
3. 更新 `openspec init` 与 `openspec update` 的 getting-started / restart 输出。
4. 补充回归测试，覆盖 Codex 精确 skill 名称、skills-only 输出与 command-backed 输出。
5. 运行变更校验，确认 proposal / specs / design / tasks / opsx-delta 契约一致。

## Open Questions

- 混合工具场景下，成功输出是否需要同时列出多种调用语法，还是继续保留单条最小提示即可？
- 是否还需要同步更新面向用户的静态文档示例，使其明确区分 Codex skills 与 slash commands？
