# Implementation Tasks

### Task 1: 新增 OpsxCommand 查询命令

**Goal**: 实现 `openspec opsx query <node-id>` 命令，提供 OPSX 节点信息、关系和 code-map 查询接口。

**Files**:
- Create: `src/commands/opsx.ts`
- Modify: `src/cli/index.ts`
- Test: `test/commands/opsx.test.ts`

**Requirements**:
- 创建 `OpsxCommand` 类，实现 `query()` 方法
- 复用 `readProjectOpsx()` 获取 OPSX bundle
- 支持 `--relations` 和 `--code-map` 过滤参数
- 严格错误处理：OPSX 文件缺失或 node 不存在时报错
- 在 `src/cli/index.ts` 注册 `opsx` 命令组和 `query` 子命令

#### Checks

- [x] C1 验证查询存在节点返回完整信息
  - Verifies: `specs/cli-opsx-query/spec.md` / Requirement "OPSX query 命令基本结构" / Scenario "查询存在的节点返回完整信息"
  - Command: `pnpm test test/commands/opsx.test.ts -t "query存在节点"`
  - Expect: 测试通过，返回包含 node、relations、codeMap 三个字段的 JSON

- [x] C2 验证查询不存在节点报错
  - Verifies: `specs/cli-opsx-query/spec.md` / Requirement "OPSX query 命令基本结构" / Scenario "查询不存在的节点报错"
  - Command: `pnpm test test/commands/opsx.test.ts -t "不存在节点"`
  - Expect: 测试通过，非零退出码，错误信息包含节点未找到提示

- [x] C3 验证 OPSX 文件不存在时报错
  - Verifies: `specs/cli-opsx-query/spec.md` / Requirement "OPSX query 命令基本结构" / Scenario "OPSX 文件不存在时报错"
  - Command: `pnpm test test/commands/opsx.test.ts -t "OPSX文件不存在"`
  - Expect: 测试通过，错误信息包含 bootstrap 引导

- [x] C4 验证过滤参数支持
  - Verifies: `specs/cli-opsx-query/spec.md` / Requirement "过滤参数支持" / Scenario "使用 --relations 过滤", "使用 --code-map 过滤"
  - Command: `pnpm test test/commands/opsx.test.ts -t "过滤参数"`
  - Expect: 测试通过，过滤参数按预期工作

- [x] C5 验证数据访问层复用
  - Verifies: `specs/cli-opsx-query/spec.md` / Requirement "数据访问层复用" / Scenario "调用 readProjectOpsx 获取数据"
  - Evidence: `src/commands/opsx.ts` 源码
  - Expect: 代码中调用 `readProjectOpsx(projectRoot)`，无重复解析逻辑

### Task 2: 扩展 ListCommand 输出 capabilities

**Goal**: 增强 `openspec list --specs --json` 输出，添加 `capabilities` 字段。

**Files**:
- Modify: `src/core/list.ts`
- Test: `test/core/list.test.ts`

**Requirements**:
- 在 specs 模式 JSON 输出中调用 `parseSpecFrontmatter()` 提取 capabilities
- 保持字段名 `requirementCount` 不变（兼容性）
- 无 frontmatter 时返回空数组

#### Checks

- [x] C6 验证 JSON 输出包含 capabilities 字段
  - Verifies: `specs/cli-list/spec.md` / Requirement "JSON output format for specs" / Scenario "JSON output includes capabilities field"
  - Command: `pnpm test test/core/list.test.ts -t "capabilities字段"`
  - Expect: 测试通过，JSON 输出包含 capabilities 数组字段

- [x] C7 验证无 frontmatter 返回空数组
  - Verifies: `specs/cli-list/spec.md` / Requirement "JSON output format for specs" / Scenario "Capabilities field is empty array when frontmatter missing"
  - Command: `pnpm test test/core/list.test.ts -t "空数组"`
  - Expect: 测试通过，无 frontmatter 的 spec 返回 `capabilities: []`

### Task 3: 删除 spec list 命令

**Goal**: 移除 deprecated 的 `openspec spec list` 命令及相关实现。

**Files**:
- Modify: `src/commands/spec.ts`
- Delete: `test/cli-e2e/spec-list.test.ts`

**Requirements**:
- 从 `src/commands/spec.ts` 中移除 `.command('list')` 注册和实现
- 删除 `test/cli-e2e/spec-list.test.ts` 整个测试文件
- 保留 `spec show` 和 `spec validate` 子命令

#### Checks

- [x] C8 验证 spec list 命令已移除
  - Verifies: `specs/cli-spec/spec.md` / Requirement "spec list --json 输出包含 capabilities 字段" / REMOVED
  - Command: `openspec spec list --help 2>&1 || true`
  - Expect: 命令不存在或报错，help 输出不包含 list 子命令

- [x] C9 验证 spec show 和 validate 保留
  - Verifies: 确保其他 spec 子命令未受影响
  - Command: `openspec spec show --help && openspec spec validate --help`
  - Expect: 两个子命令 help 正常输出

### Task 4: 更新 AI 模板使用 CLI 查询

**Goal**: 更新 impact-sweeper、propose、apply-change 模板从直接读取文件迁移到 CLI 查询。

**Files**:
- Modify: `src/core/templates/workflows/impact-sweeper.ts`
- Modify: `src/core/templates/workflows/propose.ts`
- Modify: `src/core/templates/workflows/apply-change.ts`

**Requirements**:
- impact-sweeper 使用 `openspec opsx query` 和 `openspec list --specs --json`
- propose 和 apply-change 替换 `openspec spec list` 为 `openspec list --specs`
- 移除所有直接读取 YAML 文件的指令

#### Checks

- [x] C10 验证 impact-sweeper 模板使用 CLI
  - Verifies: `specs/ai-impact-sweeper/spec.md` / Requirement "Evidence Protocol 使用 CLI 查询接口" / Scenario "查询 OPSX 节点信息", "查询 cap→spec 映射"
  - Evidence: `src/core/templates/workflows/impact-sweeper.ts` 源码
  - Expect: 模板包含 `openspec opsx query` 和 `openspec list --specs --json`，无直接文件读取

- [x] C11 验证 propose 模板使用正确命令
  - Verifies: `specs/ai-workflow-templates/spec.md` / Requirement "Propose 模板使用统一 CLI 查询接口" / Scenario "Propose 模板包含正确的 spec 发现指令"
  - Evidence: `src/core/templates/workflows/propose.ts` 源码
  - Expect: 模板包含 `openspec list --specs --json`，不包含 `openspec spec list`

- [x] C12 验证 apply-change 模板使用正确命令
  - Verifies: `specs/ai-workflow-templates/spec.md` / Requirement "Apply 模板使用统一 CLI 查询接口" / Scenario "Apply 模板包含正确的 spec 交叉检查指令"
  - Evidence: `src/core/templates/workflows/apply-change.ts` 源码
  - Expect: 模板包含 `openspec list --specs --json`，不包含 `openspec spec list`

### Task 5: 更新 shell completion registry

**Goal**: 在 completion registry 中注册 opsx 命令及其子命令。

**Files**:
- Modify: `src/core/completions/command-registry.ts`

**Requirements**:
- 添加 `opsx` 命令定义
- 添加 `query` 子命令，支持 node-id 位置参数
- 添加 `--relations`、`--code-map`、`--json` flag 定义

#### Checks

- [x] C13 验证 completion registry 包含 opsx
  - Verifies: 确保 shell completion 可用
  - Evidence: `src/core/completions/command-registry.ts` 源码
  - Expect: COMMAND_REGISTRY 包含 opsx 命令和 query 子命令定义

### Task 6: E2E 集成测试

**Goal**: 添加端到端测试验证新 CLI 命令在真实项目中的行为。

**Files**:
- Create: `test/cli-e2e/opsx-query.test.ts`
- Modify: `test/core/list.test.ts`

**Requirements**:
- 测试 `openspec opsx query` 的 golden path 和错误场景
- 测试 `openspec list --specs --json` 的 capabilities 输出
- 使用真实的 OPSX 文件和 spec 结构

#### Checks

- [x] C14 验证 E2E 测试覆盖 opsx query
  - Verifies: 集成测试验证
  - Command: `pnpm test test/cli-e2e/opsx-query.test.ts`
  - Expect: 所有 E2E 测试通过

- [x] C15 验证 list specs E2E 测试
  - Verifies: 集成测试验证
  - Command: `pnpm test test/core/list.test.ts`
  - Expect: list specs 相关测试通过

## Remediation

- [x] [code_fix] 移除 propose/apply 模板中通过 `OPSX_SHARED_CONTEXT` 注入的直接 OPSX YAML 读取指令，改用 `OPSX_CLI_QUERY_CONTEXT`，并用模板测试防止回归。
