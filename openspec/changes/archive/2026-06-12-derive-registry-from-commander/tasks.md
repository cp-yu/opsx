### Task 1: 创建 positional-types 注解映射

**Goal**: 建立集中式 `POSITIONAL_TYPE_MAP`，为 Commander.js 无法表达的补全类型提供语义标注。

**Files**:
- Create: `src/core/completions/positional-types.ts`
- Test: `test/core/completions/positional-types.test.ts`

**Requirements**:
- 导出 `POSITIONAL_TYPE_MAP` 常量，类型为 `Record<string, PositionalType>`
- 使用 dot-notation 路径键（如 `change.show`、`spec.validate`）标识子命令
- 覆盖当前 `command-registry.ts` 中所有声明了 `positionalType` 的命令
- 复用 `types.ts` 中已有的 `positionalType` 联合类型

#### Checks

- [x] C1 验证 MAP 导出正确
  - Verifies: `specs/cli-completion-introspect/spec.md` / Requirement "positionalType 集中式注解映射" / Scenario "MAP 条目格式"
  - Command: `pnpm test -- --testPathPattern positional-types`
  - Expect: 测试通过，MAP 中每个条目的值为合法 PositionalType

- [x] C2 验证所有已知 positional 命令均有条目
  - Verifies: `specs/cli-completion-introspect/spec.md` / Requirement "positionalType 集中式注解映射" / Scenario "防漏守护"
  - Command: `pnpm test -- --testPathPattern positional-types`
  - Expect: 测试断言当前 COMMAND_REGISTRY 中所有 positionalType 条目在 MAP 中均存在

### Task 2: 实现 introspect 反射函数

**Goal**: 从 Commander.js 命令树运行时提取 `CommandDefinition[]`，替代静态 registry。

**Files**:
- Create: `src/core/completions/introspect.ts`
- Test: `test/core/completions/introspect.test.ts`

**Requirements**:
- 导出 `introspectCommands(program: Command): CommandDefinition[]`
- 递归遍历 `cmd.commands`，跳过 hidden commands
- 从 `Option` 对象提取 flags（跳过 negate 和 hidden options，跳过 `--version`/`--help`）
- 通过 `registeredArguments` 判断 `acceptsPositional`
- 合并 `POSITIONAL_TYPE_MAP` 到对应命令路径

#### Checks

- [x] C1 验证顶层命令提取
  - Verifies: `specs/cli-completion-introspect/spec.md` / Requirement "Commander.js 命令树运行时反射" / Scenario "提取顶层命令"
  - Command: `pnpm test -- --testPathPattern introspect`
  - Expect: 测试通过，输出包含所有非 hidden 顶层命令

- [x] C2 验证子命令递归提取
  - Verifies: `specs/cli-completion-introspect/spec.md` / Requirement "Commander.js 命令树运行时反射" / Scenario "递归提取子命令"
  - Command: `pnpm test -- --testPathPattern introspect`
  - Expect: 测试通过，嵌套子命令正确递归

- [x] C3 验证 flags 提取
  - Verifies: `specs/cli-completion-introspect/spec.md` / Requirement "Commander.js 命令树运行时反射" / Scenario "提取 flag 定义"
  - Command: `pnpm test -- --testPathPattern introspect`
  - Expect: 测试通过，flags 的 name/short/description/takesValue/values 正确

- [x] C4 验证 hidden 命令过滤
  - Verifies: `specs/cli-completion-introspect/spec.md` / Requirement "Commander.js 命令树运行时反射" / Scenario "过滤 hidden 命令"
  - Command: `pnpm test -- --testPathPattern introspect`
  - Expect: hidden 命令（`experimental`、`__complete`）不出现在输出中

### Task 3: 集成 introspect 到 CompletionCommand

**Goal**: 将 `CompletionCommand` 从静态 `COMMAND_REGISTRY` 切换到运行时反射。

**Files**:
- Modify: `src/commands/completion.ts`
- Modify: `src/cli/index.ts`
- Test: `test/commands/completion.test.ts`

**Requirements**:
- `CompletionCommand` 构造函数接收 `Command` 实例（program 引用）
- `generate` 方法调用 `introspectCommands(program)` 获取命令定义
- `src/cli/index.ts` 构造 `CompletionCommand` 时传入 `program`
- 移除 `import { COMMAND_REGISTRY }` 引用

#### Checks

- [x] C1 验证补全脚本生成功能保持正常
  - Preserves: `openspec/specs/cli-completion/spec.md` / Requirement "Completion Generation" / Scenario "Generating Zsh completion"
  - Command: `pnpm test -- --testPathPattern completion`
  - Expect: 现有补全测试全部通过

- [x] C2 验证 program 注入无循环依赖
  - Verifies: `specs/cli-completion-introspect/spec.md` / Requirement "Commander.js 命令树运行时反射" / Scenario "提取顶层命令"
  - Command: `pnpm build`
  - Expect: TypeScript 编译成功，无循环依赖错误

### Task 4: 删除静态 command-registry.ts

**Goal**: 移除已被运行时反射替代的静态注册表文件。

**Files**:
- Delete: `src/core/completions/command-registry.ts`
- Modify: `test/commands/completion.test.ts`

**Requirements**:
- 删除 `src/core/completions/command-registry.ts`
- 确认项目中无其他文件引用 `COMMAND_REGISTRY` 或 `command-registry`
- 更新测试文件中任何对静态 registry 的引用

#### Checks

- [x] C1 验证静态 registry 已删除
  - Verifies: `specs/cli-completion-registry/spec.md` / REMOVED Requirement "所有 CLI 命令必须注册到 COMMAND_REGISTRY"
  - Command: `test ! -f src/core/completions/command-registry.ts && echo "DELETED"`
  - Expect: 输出 DELETED

- [x] C2 验证无残余引用
  - Verifies: `specs/cli-completion-registry/spec.md` / REMOVED Requirement "COMMAND_REGISTRY 与 CLI 命令树保持一致"
  - Command: `grep -r "command-registry" src/ test/ --include="*.ts" | grep -v node_modules | grep -v ".d.ts"`
  - Expect: 无匹配输出

- [x] C3 验证项目编译通过
  - Preserves: `openspec/specs/cli-completion/spec.md` / Requirement "Command Structure" / Scenario "Available subcommands"
  - Command: `pnpm build`
  - Expect: 编译成功，无错误

### Task 5: 补全输出回归 snapshot 测试

**Goal**: 确保重构后生成的补全脚本与之前语义等价。

**Files**:
- Create: `test/core/completions/introspect-regression.test.ts`

**Requirements**:
- 构建真实 program 实例，调用 `introspectCommands` 生成 `CommandDefinition[]`
- 使用 Zsh 和 Bash generator 生成补全脚本
- Snapshot 对比确保所有命令和 flags 被覆盖
- 验证 positionalType 合并后动态补全函数引用正确

#### Checks

- [x] C1 验证 Zsh 补全脚本覆盖率
  - Verifies: `specs/cli-completion-introspect/spec.md` / Requirement "补全输出等价性" / Scenario "Zsh 输出回归"
  - Command: `pnpm test -- --testPathPattern introspect-regression`
  - Expect: snapshot 测试通过

- [x] C2 验证 Bash 补全脚本覆盖率
  - Verifies: `specs/cli-completion-introspect/spec.md` / Requirement "补全输出等价性" / Scenario "Bash 输出回归"
  - Command: `pnpm test -- --testPathPattern introspect-regression`
  - Expect: snapshot 测试通过
