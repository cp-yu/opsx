### Task 1: 命名匹配算法

**Goal**: 实现 spec 目录名与 OPSX cap ID 的命名匹配逻辑。

**Files**:
- Create: `src/core/backfill-specs.ts`
- Test: `test/core/backfill-specs.test.ts`

**Requirements**:
- Spec 名按 `-` 分段，cap ID 按 `.` 分段（去掉 `cap.` 前缀）
- 支持精确匹配、模糊匹配（子序列）、一对多匹配
- 无匹配时返回空数组

#### Checks

- [x] C1 精确匹配
  - Verifies: `specs/bootstrap-backfill-specs/spec.md` / Requirement "命名匹配算法" / Scenario "精确匹配"
  - Command: `pnpm test backfill-specs`
  - Expect: `cli-archive` 匹配 `cap.cli.archive`

- [x] C2 模糊匹配
  - Verifies: `specs/bootstrap-backfill-specs/spec.md` / Requirement "命名匹配算法" / Scenario "模糊匹配（子序列）"
  - Command: `pnpm test backfill-specs`
  - Expect: `change-creation` 匹配 `cap.change.create` 等语义对齐的 cap

- [x] C3 无匹配和一对多
  - Verifies: `specs/bootstrap-backfill-specs/spec.md` / Requirement "命名匹配算法" / Scenario "无匹配", Scenario "一个 spec 匹配多个 cap"
  - Command: `pnpm test backfill-specs`
  - Expect: 无匹配返回空数组，多匹配返回所有 cap ID

### Task 2: Frontmatter 写入

**Goal**: 实现向无 frontmatter 的 spec.md 头部插入 YAML frontmatter 的写入逻辑。

**Files**:
- Modify: `src/core/backfill-specs.ts`
- Test: `test/core/backfill-specs.test.ts`

**Requirements**:
- 无 frontmatter 时在文件头部插入 `---` 块
- 已有 frontmatter 时跳过
- 写入后文件其余 markdown 内容不变
- 使用 `path.join()` 构建路径

#### Checks

- [x] C4 无 frontmatter 写入
  - Verifies: `specs/bootstrap-backfill-specs/spec.md` / Requirement "Frontmatter 写入" / Scenario "无 frontmatter 的 spec 写入"
  - Command: `pnpm test backfill-specs`
  - Expect: 头部插入 frontmatter，原有内容不变

- [x] C5 已有 frontmatter 跳过
  - Verifies: `specs/bootstrap-backfill-specs/spec.md` / Requirement "Frontmatter 写入" / Scenario "已有 frontmatter 的 spec 跳过"
  - Command: `pnpm test backfill-specs`
  - Expect: 文件不被修改

### Task 3: Backfill Engine 完整流程

**Goal**: 实现 backfillSpecs 入口函数，串联 OPSX 读取、frontmatter 扫描、命名匹配和写入。

**Files**:
- Modify: `src/core/backfill-specs.ts`
- Test: `test/core/backfill-specs.test.ts`

**Requirements**:
- 读 OPSX cap 列表 + 扫描 specs frontmatter 状态
- 对无 frontmatter 的 specs 执行命名匹配并写入
- 返回 `{ written, unmatched }` 结构化结果
- 无 OPSX 文件时安全降级

#### Checks

- [x] C6 正常 backfill 流程
  - Verifies: `specs/bootstrap-backfill-specs/spec.md` / Requirement "Backfill Engine 完整流程" / Scenario "正常 backfill 流程"
  - Command: `pnpm test backfill-specs`
  - Expect: written 包含匹配成功的 specs，unmatched 包含无匹配的 specs

- [x] C7 无 OPSX 安全降级
  - Verifies: `specs/bootstrap-backfill-specs/spec.md` / Requirement "Backfill Engine 完整流程" / Scenario "无 OPSX 文件时"
  - Command: `pnpm test backfill-specs`
  - Expect: 返回空 written 和全部 specs 为 unmatched，不抛异常

### Task 4: CLI 子命令和 Promote 集成

**Goal**: 注册 `openspec bootstrap backfill-specs` 子命令，并在 promote 末尾集成调用。

**Files**:
- Modify: `src/commands/bootstrap.ts`
- Modify: `src/utils/bootstrap-utils.ts`
- Test: `test/cli-e2e/bootstrap-backfill.test.ts`

**Requirements**:
- 注册 `backfill-specs` 子命令，支持 `--json` 输出
- promote 末尾调用 Backfill Engine
- promote 输出包含 backfill 统计

#### Checks

- [x] C8 CLI 子命令正常执行
  - Verifies: `specs/bootstrap-backfill-specs/spec.md` / Requirement "CLI 子命令" / Scenario "正常执行"
  - Command: `pnpm test bootstrap-backfill`
  - Expect: 子命令调用 Backfill Engine 并输出统计

- [x] C9 CLI JSON 输出
  - Verifies: `specs/bootstrap-backfill-specs/spec.md` / Requirement "CLI 子命令" / Scenario "JSON 输出"
  - Command: `pnpm test bootstrap-backfill`
  - Expect: `--json` 输出 `{ written: [...], unmatched: [...] }` 格式

- [x] C10 Promote 末尾调用 backfill
  - Verifies: `specs/bootstrap/spec.md` / Requirement "Bootstrap docs and workflow templates SHALL describe only the CLI-backed five-phase flow" / Scenario "Promote 末尾自动调用 backfill"
  - Command: `pnpm test bootstrap`
  - Expect: promote 成功后输出包含 backfill 统计

### Task 5: Bootstrap Skill 指令增强

**Goal**: 在 bootstrap skill 模板中新增 promote 后 subagent 语义匹配指令。

**Files**:
- Modify: `src/core/templates/workflows/bootstrap-opsx.ts`

**Requirements**:
- 指令描述 promote 后调用 `backfill-specs` 命令
- 对 unmatched specs 启动 subagent 读内容 + cap intent 语义匹配
- 主 agent 按结果写入 frontmatter
- 最终报告仍无匹配的 specs

#### Checks

- [x] C11 Bootstrap skill 指令包含 backfill 和 subagent 语义匹配
  - Verifies: `specs/bootstrap/spec.md` / Requirement "Bootstrap docs and workflow templates SHALL describe only the CLI-backed five-phase flow" / Scenario "Bootstrap skill 指令包含 subagent 语义匹配"
  - Evidence: 读取 `src/core/templates/workflows/bootstrap-opsx.ts` 模板内容
  - Expect: 模板字符串包含 backfill-specs 调用指令和 subagent 语义匹配步骤描述
