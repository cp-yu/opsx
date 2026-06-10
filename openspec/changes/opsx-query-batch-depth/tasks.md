# Implementation Tasks

> 时序约束（design D6）：本变更的实现 MUST 在活跃变更 `restore-unified-opsx-read` 归档后启动，两者共同修改 `src/core/templates/fragments/opsx-fragments.ts` 及其测试。

### Task 1: CLI 批量与 depth 查询

**Goal**: 扩展 `openspec opsx query` 为变长 node-id + `--depth` 选项，实现双轨输出（单节点旧形态不变，批量/depth 输出去重子图）与部分失败语义。

**Files**:
- Modify: `src/commands/opsx.ts`
- Test: `test/commands/opsx.test.ts`
- Test: `test/cli-e2e/opsx-query.test.ts`

**Requirements**:
- commander 注册改为 `query <node-id...>`，新增 `--depth <n>`（默认 1，上限 5，非正整数报错）
- 单 ID 且未显式指定 `--depth` 时输出 `{node, relations, codeMap}`，与现状逐字节一致
- 多 ID 或显式 `--depth` 时输出 `{seeds, nodes, relations, codeMap, missing}` 子图：双向 BFS、全关系类型、节点与边去重、`codeMap` 为 id→refs 对象
- 部分 seed 缺失返回 `missing` 数组且退出码 0；全部缺失退出码 1 并保留前 5 个可用节点提示
- 复用 `readProjectOpsx()`，数据层零改动

#### Checks

- [x] C1 单节点向后兼容
  - Verifies: `specs/cli-opsx-query/spec.md` / Requirement "OPSX query 命令基本结构" / Scenario "单 node-id 且未指定 --depth 时输出形态保持不变"
  - Command: `pnpm test test/commands/opsx.test.ts`
  - Expect: 单 ID 输出形态断言通过，不含 `seeds`/`nodes`/`missing` 字段

- [x] C2 批量子图输出与部分失败
  - Verifies: `specs/cli-opsx-query/spec.md` / Requirement "批量节点子图输出" / Scenario "批量查询多个存在的节点"、Scenario "批量查询部分节点不存在"、Scenario "批量查询全部节点不存在"
  - Command: `pnpm test test/commands/opsx.test.ts`
  - Expect: 多 ID 返回去重子图；部分缺失退出码 0 且 `missing` 正确；全部缺失退出码 1

- [x] C3 depth 展开与去重
  - Verifies: `specs/cli-opsx-query/spec.md` / Requirement "depth 深度展开" / Scenario "depth 2 展开二跳邻居"、Scenario "展开结果去重"、Scenario "depth 超出上限报错"、Scenario "depth 为非法值报错"
  - Command: `pnpm test test/commands/opsx.test.ts`
  - Expect: `--depth 2` 覆盖双向二跳；重复节点/边只出现一次；`--depth 6`、`--depth 0`、非数字均以非零退出码报错

- [x] C4 子图过滤参数作用域
  - Verifies: `specs/cli-opsx-query/spec.md` / Requirement "子图输出的过滤参数作用域" / Scenario "子图输出使用 --relations 过滤"、Scenario "子图输出使用 --code-map 过滤"
  - Command: `pnpm test test/commands/opsx.test.ts`
  - Expect: `--relations` 省略 `codeMap`，`--code-map` 省略 `relations`，`seeds`/`nodes`/`missing` 恒在

- [x] C5 e2e 批量与 depth 调用
  - Verifies: `specs/cli-opsx-query/spec.md` / Requirement "批量节点子图输出" / Scenario "批量查询多个存在的节点"
  - Command: `pnpm test test/cli-e2e/opsx-query.test.ts`
  - Expect: 真实 CLI 进程多 ID + `--depth 2` 调用返回预期子图 JSON

### Task 2: 补全注册 --depth

**Goal**: 在 completion command-registry 中注册 `--depth` flag 并锁定断言。

**Files**:
- Modify: `src/core/completions/command-registry.ts`
- Test: `test/commands/completion.test.ts`

**Requirements**:
- `opsx query` 补全条目新增 `--depth` 值型 flag
- 扩展现有 arrayContaining 断言显式包含 `depth`，防止新增 flag 静默漏注册

#### Checks

- [x] C6 补全包含 depth flag
  - Verifies: `specs/cli-opsx-query/spec.md` / Requirement "depth 深度展开" / Scenario "depth 2 展开二跳邻居"
  - Command: `pnpm test test/commands/completion.test.ts`
  - Expect: opsx query 补全 flags 断言包含 `relations`、`code-map`、`json`、`depth`

### Task 3: 模板层批量+depth 收编

**Goal**: 将 `OPSX_CLI_QUERY_CONTEXT`、`OPSX_GENERATE_DELTA` 与 impact-sweeper 证据协议迁移到批量 + depth 调用指引，one-hop/second-hop 手工规则改写为 depth 判据。

**Files**:
- Modify: `src/core/templates/fragments/opsx-fragments.ts`
- Modify: `src/core/templates/workflows/impact-sweeper.ts`
- Modify: `src/core/templates/workflows/propose.ts`
- Modify: `src/core/templates/workflows/apply-change.ts`
- Test: `test/core/templates/opsx-fragments.test.ts`
- Test: `test/core/templates/impact-sweeper-template.test.ts`

**Requirements**:
- `OPSX_CLI_QUERY_CONTEXT` 与 `OPSX_GENERATE_DELTA` 改为 `openspec opsx query <node-id...> --json` 批量措辞，保留点查询互补定位
- 证据协议步骤 1 改为单次批量调用全部 plausible node IDs；步骤 3-4 改为默认 `--depth 1`、满足共享基础设施/跨域/外向运行时使用判据时改用 `--depth 2`
- propose/apply 内联单节点查询指引同步为批量措辞
- 模板测试断言翻转：移除逐节点措辞断言，新增批量 + depth 断言

#### Checks

- [x] C7 sweeper 协议批量+depth 措辞
  - Verifies: `specs/ai-impact-sweeper/spec.md` / Requirement "Evidence Protocol 使用 CLI 查询接口" / Scenario "批量查询 OPSX 节点信息"
  - Command: `pnpm test test/core/templates/impact-sweeper-template.test.ts`
  - Expect: 协议模板含 `<node-id...>` 批量调用与 `--depth 2` 判据，不再含 "For each plausible node ID" 循环措辞

- [x] C8 evidence collection 规则改写
  - Verifies: `specs/ai-workflow-templates/spec.md` / Requirement "Impact sweeper evidence collection" / Scenario "depth 展开判据"
  - Command: `pnpm test test/core/templates/impact-sweeper-template.test.ts`
  - Expect: one-hop/second-hop 手工展开断言被 depth 判据断言替代

- [x] C9 fragment 批量措辞
  - Verifies: `specs/ai-impact-sweeper/spec.md` / Requirement "Evidence Protocol 使用 CLI 查询接口" / Scenario "批量查询 OPSX 节点信息"
  - Command: `pnpm test test/core/templates/opsx-fragments.test.ts`
  - Expect: `OPSX_CLI_QUERY_CONTEXT` 与 `OPSX_GENERATE_DELTA` 断言匹配批量调用措辞

### Task 4: 生成物再生与全量验证

**Goal**: 经 `openspec update` 再生 `.claude/` 与 `.codex/` 生成物，全量测试通过。

**Files**:
- Modify: `.claude/skills/openspec-impact-sweeper/references/evidence-protocol.md`
- Modify: `.claude/commands/opsx/propose.md`
- Modify: `.claude/commands/opsx/apply.md`

**Requirements**:
- 运行 `openspec update` 再生全部模板生成物，不手工编辑生成文件
- 生成物中不残留逐节点单查询指引措辞
- 全量测试套件通过

#### Checks

- [x] C10 生成物再生一致
  - Verifies: `specs/ai-workflow-templates/spec.md` / Requirement "Impact sweeper evidence collection" / Scenario "OPSX first then reverse search"
  - Command: `openspec update && git diff --stat .claude .codex`
  - Evidence: 再生 diff 仅包含批量+depth 措辞变更
  - Expect: 生成物与模板源一致，无手工编辑痕迹

- [x] C11 全量回归
  - Verifies: `specs/cli-opsx-query/spec.md` / Requirement "OPSX query 命令基本结构" / Scenario "查询存在的节点返回完整信息"
  - Command: `pnpm test`
  - Expect: 全量测试通过，现有消费者行为零回归
