# Design: fix-todo-workflow-gaps

## 架构决策

### D1: Sync CLI 作为薄包装层

`openspec sync` 不引入新的同步逻辑。它是 `src/core/change-sync.ts` 三函数契约的直接调用者：

```
CLI layer (src/cli/index.ts)
  └─ assessChangeSyncState(projectRoot, changeName)
  └─ prepareChangeSync(projectRoot, state)
  └─ applyPreparedChangeSync(projectRoot, prepared)
```

与 `archive` 的区别仅在于：sync 不执行归档（不移动 change 目录）。

交互选择复用 `ArchiveCommand.selectChange()` 的模式：列出 `openspec/changes/` 下的目录，排除 `archive/`，用 inquirer 提示选择。为避免 archive 与 sync 重复实现，将 change 选择逻辑提取为共享函数 `selectActiveChange(changesDir)` 放在 `src/core/change-utils.ts`（若该文件已存在则追加，否则新建）。

### D2: `--skip-specs` 语义对齐策略

不改 flag 名称，不新增别名。仅对齐以下位置的描述文案：

| 位置 | 当前描述 | 目标描述 |
|---|---|---|
| `src/cli/index.ts:284` | `Skip all archive-time sync writes, including main specs and OPSX updates` | 保持（已正确） |
| `src/core/archive.ts:196` | `Skipping archive-time sync writes (--skip-specs flag provided).` | 保持（已正确） |
| `openspec/specs/cli-archive/spec.md:138` | `skips all archive-time sync writes` | 保持（已正确） |
| `src/core/templates/workflows/archive-change.ts` | 检查模板中是否有不一致描述 | 对齐 |

经审查，当前主要位置已统一。需检查 `archive-change.ts` 模板文本中是否仍有旧描述残留。

### D3: Bootstrap domain-map 三态模型

当前 `BootstrapState.domainMaps` 类型为 `Map<string, DomainMapFile>`，解析失败的文件被静默丢弃。

改为：

```typescript
// 新增类型
export interface InvalidDomainMap {
  file: string;      // 文件名，如 "dom.auth.yaml"
  domainId: string;  // 从文件名推断的 domain ID
  error: string;     // Zod 或 YAML 解析错误摘要
}

// BootstrapState 新增字段
export interface BootstrapState {
  metadata: BootstrapMetadata;
  scope: ScopeConfig | null;
  evidence: EvidenceFile | null;
  domainMaps: Map<string, DomainMapFile>;        // 仅包含 valid
  invalidDomainMaps: Map<string, InvalidDomainMap>; // 新增：invalid 文件
  reviewExists: boolean;
}
```

`readBootstrapState()` 修改：

```typescript
// 当前：catch { /* skip invalid */ }
// 改为：
catch (err) {
  const domainId = entry.replace(/\.yaml$/, '');
  invalidDomainMaps.set(domainId, {
    file: entry,
    domainId,
    error: err instanceof Error ? err.message : String(err),
  });
}
```

### D4: Gate 与 derived artifact 一致性

`validateGate('map_to_review')` 修改：

```typescript
// 新增：对 invalid domain-map 报错
for (const [domainId, invalid] of state.invalidDomainMaps) {
  errors.push(`Domain '${domainId}' has invalid domain-map: ${invalid.file} — ${invalid.error}`);
}
```

`deriveBootstrapArtifacts()` 修改：

- 当 `state.invalidDomainMaps.size > 0` 时，`candidateState` 和 `reviewState` 不得为 `current`
- 若之前为 `current`，降级为 `stale`
- 具体实现：在 fingerprint 比对之前，先检查 `invalidDomainMaps` 是否非空；若非空，直接返回 `stale`

### D5: DomainStatus 扩展

`DomainStatus` 新增 `mapState` 字段：

```typescript
export interface DomainStatus {
  id: string;
  confidence: 'high' | 'medium' | 'low';
  mapped: boolean;           // 保持向后兼容
  mapState: 'valid' | 'missing' | 'invalid';  // 新增
  mapError?: string;         // 仅 invalid 时存在
  capabilityCount: number;
  reviewed: boolean;
}
```

`getBootstrapStatus()` 中构建 `DomainStatus` 时：

```typescript
const mapFile = state.domainMaps.get(dom.id);
const invalidMap = state.invalidDomainMaps.get(dom.id);
domains.push({
  id: dom.id,
  confidence: dom.confidence,
  mapped: !!mapFile,
  mapState: mapFile ? 'valid' : invalidMap ? 'invalid' : 'missing',
  ...(invalidMap ? { mapError: invalidMap.error } : {}),
  capabilityCount: mapFile?.capabilities.length ?? 0,
  reviewed: derived.reviewState === 'current' && derived.checkedDomains.has(dom.id),
});
```

### D6: Bootstrap init TTY 检测

在 `src/commands/bootstrap.ts` 的 `bootstrapInitCommand()` 中：

```typescript
export async function bootstrapInitCommand(options: BootstrapInitOptions): Promise<void> {
  // ... existing baseline detection ...

  let mode: BootstrapMode;
  if (options.mode) {
    mode = options.mode as BootstrapMode;
  } else if (process.stdout.isTTY) {
    // 交互式：提问
    const allowedModes = getAllowedBootstrapModes(baselineType);
    const { selectedMode } = await inquirer.prompt([{
      type: 'list',
      name: 'selectedMode',
      message: 'Select bootstrap mode:',
      choices: allowedModes,
    }]);
    mode = selectedMode;
  } else {
    // 非交互式：fail fast
    throw new Error(
      'Bootstrap mode is required in non-interactive environments. Use --mode <full|opsx-first>.'
    );
  }

  await initBootstrap(projectRoot, { mode, scope: options.scope ? [options.scope] : undefined });
}
```

### D7: Bootstrap 命令面动态暴露

当前 `bootstrap-opsx` 的 `modeMembership: []`，不属于任何 preset。

策略：不修改 `modeMembership`（保持静态 preset 不变），而是在 install planning 阶段动态追加。

在 `src/core/workflow-installation.ts`（或等效的 install planning 入口）中：

```typescript
function resolveEffectiveWorkflows(projectRoot: string, profile: Profile, customWorkflows?: string[]): WorkflowId[] {
  const base = getProfileWorkflows(profile, customWorkflows);
  const effective = [...base];

  // 动态追加：bootstrap 目录存在时暴露 bootstrap-opsx
  if (bootstrapDirExists(projectRoot)) {
    if (!effective.includes('bootstrap-opsx')) {
      effective.push('bootstrap-opsx');
    }
  }

  return effective;
}
```

`bootstrapDirExists()` 使用同步检测（`fs.existsSync`），因为 install planning 已在同步上下文中。

### D8: OPSX 共享上下文 fragment

新增 `OPSX_SHARED_CONTEXT` fragment：

```typescript
export const OPSX_SHARED_CONTEXT = `
**OPSX Shared Context** (load at workflow start):
If \`openspec/project.opsx.yaml\` exists at project root:
1. Read \`project.opsx.yaml\` for domains → capabilities structure and system boundaries
2. Read \`project.opsx.relations.yaml\` for cross-domain dependencies and constraints
3. Read \`project.opsx.code-map.yaml\` for code location references
4. Read \`openspec/specs/\` for behavior documentation
5. Use this as navigation context and structural constraint — not as a replacement for change artifacts
If OPSX files do not exist, proceed without them — do not error.
`.trim();
```

替换策略：

| 模板 | 当前 | 目标 |
|---|---|---|
| `explore.ts` | `OPSX_READ_CONTEXT` + `OPSX_NAVIGATION_GUIDANCE` | `OPSX_SHARED_CONTEXT` + `OPSX_NAVIGATION_GUIDANCE` |
| `propose.ts` | 仅在 opsx-delta 阶段读 OPSX | 在 artifact 循环前插入 `OPSX_SHARED_CONTEXT` |
| `apply-change.ts` | `OPSX_READ_CONTEXT` | `OPSX_SHARED_CONTEXT` |

`OPSX_READ_CONTEXT` 保留不删除（可能有其他消费者），但三个核心模板统一使用 `OPSX_SHARED_CONTEXT`。

## 平台考量

- `process.stdout.isTTY` 在 Windows/Linux/macOS 上行为一致
- change 选择使用 `path.join()` 构建路径
- bootstrap 目录检测使用 `path.join(projectRoot, 'openspec', 'bootstrap')`
- 所有新增文件路径操作遵循 `openspec/config.yaml` 中的跨平台规则

## 不引入的复杂度

- 不新增 `--skip-sync` 别名
- 不修改 `CORE_WORKFLOWS` / `EXPANDED_WORKFLOWS` 静态常量
- 不重构 instruction-loader
- 不新增 sync skill（已存在）
- 不修改 `BootstrapMetadata` 磁盘 schema（`invalidDomainMaps` 仅存在于内存状态）
