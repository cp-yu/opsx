# Design: fix-bootstrap-and-completion-gaps

## Overview

修复 bootstrap baseline 误判、命名重构、specs starter 条件加固、CLI 补全注册表补齐。

## Phase 1: Baseline 语义修复 + 命名重构

### 1.1 新增 helper: `hasRealSpecContent`

```ts
// src/utils/bootstrap-utils.ts
async function hasRealSpecContent(projectRoot: string): Promise<boolean> {
  const specsDir = FileSystemUtils.joinPath(projectRoot, 'openspec/specs');
  if (!await FileSystemUtils.directoryExists(specsDir)) return false;
  const entries = await fs.readdir(specsDir);
  for (const entry of entries) {
    const specMd = FileSystemUtils.joinPath(specsDir, entry, 'spec.md');
    if (await FileSystemUtils.fileExists(specMd)) return true;
  }
  return false;
}
```

判定标准：`openspec/specs/*/spec.md` 至少存在一个。空目录、仅 README.md → false。

### 1.2 修改 `detectBootstrapBaseline`

```diff
- const specsDir = FileSystemUtils.joinPath(projectRoot, 'openspec/specs');
- if (await FileSystemUtils.directoryExists(specsDir)) {
-   return 'specs-only';
- }
- return 'no-spec';
+ if (await hasRealSpecContent(projectRoot)) {
+   return 'specs-based';
+ }
+ return 'raw';
```

### 1.3 修改 `inferLegacyBaselineType`

```diff
- return await FileSystemUtils.directoryExists(specsDir) ? 'specs-only' : 'no-spec';
+ return await hasRealSpecContent(projectRoot) ? 'specs-based' : 'raw';
```

### 1.4 枚举重命名

```ts
export const BOOTSTRAP_BASELINE_TYPES = [
  'raw',           // was 'no-spec'
  'specs-based',   // was 'specs-only'
  'formal-opsx',
  'invalid-partial-opsx',
] as const;
```

### 1.5 磁盘兼容映射

在 `BootstrapMetadataDiskSchema` 中接受旧值：

```ts
const BaselineTypeDiskSchema = z.enum([
  'raw', 'specs-based', 'formal-opsx', 'invalid-partial-opsx',
  'no-spec', 'specs-only',  // legacy compat
]).transform(v => {
  if (v === 'no-spec') return 'raw' as const;
  if (v === 'specs-only') return 'specs-based' as const;
  return v;
});
```

替换 `BootstrapMetadataDiskSchema` 中的 `z.enum(BOOTSTRAP_BASELINE_TYPES).optional()` 为 `BaselineTypeDiskSchema.optional()`。

### 1.6 全量文案更新

所有 `'no-spec'` → `'raw'`，`'specs-only'` → `'specs-based'` 的字符串替换：

**源码** (`src/`):
- `bootstrap-utils.ts`: 枚举、`getAllowedBootstrapModes`、`getBootstrapBaselineReason`、`buildBootstrapPreInitStatus`、`writeBootstrapSpecStarter`
- `bootstrap.ts`: `getPreInitInstructions`、`getPhaseInstructions`、`printBootstrapStatus`
- `bootstrap-opsx.ts`: workflow template 文案

**Schema/Templates** (`schemas/`):
- `schemas/bootstrap/schema.yaml`
- `schemas/bootstrap/templates/init.md`
- `schemas/bootstrap/templates/promote.md`

**Docs**:
- `docs/opsx-bootstrap.md`

**Specs** (仅更新活跃 spec，不改 archive):
- `openspec/specs/bootstrap-init-ux/spec.md`

## Phase 2: Specs Starter 条件加固

```diff
- if (state.metadata.mode !== 'full' || state.metadata.baseline_type !== 'no-spec') {
-   return;
- }
+ if (state.metadata.mode !== 'full') return;
+ if (await hasRealSpecContent(projectRoot)) return;
```

不再依赖 `baseline_type` 字符串，直接检查当前仓库状态。

## Phase 3: 补全注册表补齐

在 `COMMAND_REGISTRY` 末尾追加 7 个命令定义：

| Command | Type | Positional | Key Flags |
|---------|------|-----------|-----------|
| `sync` | top-level | `change-name` (change-id) | `--no-validate` |
| `status` | top-level | — | `--change`, `--schema`, `--json` |
| `instructions` | top-level | `artifact` | `--change`, `--schema`, `--json` |
| `templates` | top-level | — | `--schema`, `--json` |
| `schemas` | top-level | — | `--json` |
| `new` | parent | — | — |
| `new change` | subcommand | `name` | `--description`, `--schema` |
| `bootstrap` | parent | — | — |
| `bootstrap init` | subcommand | — | `--mode` (values), `--scope` |
| `bootstrap status` | subcommand | — | `--json` |
| `bootstrap instructions` | subcommand | `phase` | `--json` |
| `bootstrap validate` | subcommand | — | `--json` |
| `bootstrap promote` | subcommand | — | `-y, --yes` |

## Phase 4: 测试更新

所有 baseline 断言从 `no-spec`/`specs-only` 更新为 `raw`/`specs-based`。

受影响测试文件：
- `test/commands/bootstrap.test.ts`
- `test/cli-e2e/bootstrap-phase1.test.ts`
- `test/cli-e2e/bootstrap-lifecycle.test.ts`
- `test/utils/bootstrap-utils.pbt.contract.test.ts`
