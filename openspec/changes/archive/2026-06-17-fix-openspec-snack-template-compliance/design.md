## Context

`openspec-snack` 与 `openspec-propose` 都是 skill prompt，但 propose 第 7/10 步会跑 `openspec instructions <id>` 拿模板并在生成后 warning-only 自检，snack 都没做。结果 snack 制品版式全凭发挥：proposal 写成 `## 目标`/`## 范围`、spec 缺 SHALL/MUST 与 scenario、目录名与 ADDED/MODIFIED 判定靠语义瞎猜。这些判定与版式规则实际已存在于 `openspec instructions specs` 的 instruction 投影中（`schemas/spec-driven/schema.yaml` 第 47/53-55/72-80 行）：目录名复用 `openspec/specs/<capability>/` 已有名或 proposal capability 名；新增关注点用 ADDED，改已有行为用 MODIFIED 且标题逐字匹配主 spec。根因是 snack 不消费模板，而非缺判定逻辑。

## Goals / Non-Goals

**Goals:**
- snack 生成 proposal/specs/design 前读 artifact 模板，严格按 template+instruction 写，不自造章节。
- snack 生成后跑 validate 自检，有 ERROR 一轮修复再验。
- 让 ADDED/MODIFIED/目录名判定自动正确，消除归档验证失败链路。

**Non-Goals:**
- 不在 snack 正文重复实现判定逻辑（规则单一来源 = schema instruction）。
- 不补 `openspec/specs/*/spec.md` 的 capability 声明数据。
- 不改 sweeper、validator、schema、TS 代码。

## Decisions

- **对齐 propose 而非新建判定逻辑** `[INFERRED FROM CODE]`：A（spec 推断不准）是 B（不读模板）的下游症状。跑 `openspec instructions specs` 返回的 instruction 已含全部判定规则，snack 照做即可，无需自建"扫 specs 目录 + 读 requirement 标题"流程。
- **capability 短名来源**：code-map 优先，无映射文件靠推断并标 `[REVIEW NEEDED]`，写入 proposal `## Capabilities` 作为 proposal 与 specs 的共同输入。
- **生成顺序**：先定 capability 列表 → 写 proposal → 写 specs（用列表 + instruction 判定 ADDED/MODIFIED 与目录名）→ 写 design。capability 列表是 proposal 与 specs 的共同前置。
- **design 简化但保留骨架** `[INFERRED FROM CODE]`：跑 `openspec instructions design` 拿 template，Goals/Non-Goals/Decisions/Risks 填 `[INFERRED FROM CODE]`，不跳过骨架。
- **opsx-delta 不变**：snack 现有第 9 步已跑 `openspec instructions opsx-delta`，本就合规。
- **自检非阻塞但必跑**：snack 产物必须能过归档，故对 validate ERROR 也修（区别于 propose 的 warning-only）。

## Risks / Trade-offs

- **模型对 instruction 执行偏差** `[REVIEW NEEDED]`：ADDED/MODIFIED 标题匹配靠模型语义判断，可能误判。缓解：标 `[REVIEW NEEDED]` + validate 自检兜底（validator 精确匹配会拦错配）。
- **capability 短名推断可能错** `[REVIEW NEEDED]`：code-map 无映射时靠推断。缓解：`[REVIEW NEEDED]` 标记 + Output Hints 提示审查。
- 将来 spec 补 capability 声明后，当前"按 instruction 判定"仍正确，仅多一条可选反查路径，无破坏性。
