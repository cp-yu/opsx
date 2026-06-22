### Task 1: 提取独立 gate 方法

**Goal**: 将 `execute()` 中平铺的 verify/sync/validation/task 逻辑提取为 4 个独立 gate 方法，重建为 pipeline 结构。

**Files**:
- Modify: `src/core/archive.ts`

**Requirements**:
- `runVerifyGate(changeDir, targetPath, options)` — 封装 freshness + archive compatibility 检查，`--no-verify` 跳过
- `runSyncGate(targetPath, changeName, options)` — 封装 `getPendingChangeSync` 检查，`--no-sync` 跳过，存在未合并 delta 时 throw
- `runValidationGate(changeDir, options)` — 封装 `Validator.validateChange` + `validateChangeDeltaSpecs`，`--no-validate` 跳过
- `runTaskGate(changesDir, changeName, options)` — 封装 `getTaskProgressForChange`，未完成任务确认
- `execute()` 变为顺序调用 pipeline：verifyGate → syncGate → validationGate → taskGate → moveToArchive

#### Checks

- [x] C1 验证 gate pipeline 顺序正确
  - Verifies: `specs/cli-archive/spec.md` / Requirement "Sync Gate" / Scenario "存在未合并 delta 时阻止归档"
  - Command: `pnpm test -- src/core/archive.test.ts`
  - Expect: 所有已有 archive 基础测试通过

- [x] C2 验证 sync gate 独立于 verify gate
  - Verifies: `specs/cli-archive/spec.md` / Requirement "Sync Gate" / Scenario "--no-sync 跳过 sync gate"
  - Command: `pnpm test -- src/core/archive.test.ts`
  - Expect: `--no-verify` 不跳过 sync gate，`--no-sync` 只跳过 sync gate

### Task 2: 删除 archive-time sync 写入路径

**Goal**: 删除 `execute()` 中 `prepareChangeSync` + `applyPreparedChangeSync` 调用及 `--skip-specs` 分支。

**Files**:
- Modify: `src/core/archive.ts`

**Requirements**:
- 删除 `import { applyPreparedChangeSync, prepareChangeSync }` 行
- 删除 archive-time sync 代码块（约 25 行）
- 删除 `--skip-specs` 分支逻辑
- 保持 `getPendingChangeSync` / `assessChangeSyncState` import（sync gate 需要）
- `options` 类型不再包含 `skipSpecs`

#### Checks

- [x] C3 验证 archive-time sync 代码已删除
  - Verifies: `specs/cli-archive/spec.md` / REMOVED Requirement "Spec Update Process"
  - Command: `grep -n 'prepareChangeSync\|applyPreparedChangeSync\|skipSpecs' src/core/archive.ts`
  - Expect: 无匹配结果

- [x] C4 验证 archive 不写入 main spec
  - Verifies: `specs/cli-archive/spec.md` / Requirement "Archive Process" / Scenario "直接归档"
  - Command: `pnpm test -- src/core/archive.test.ts`
  - Expect: archive 流程不修改 `openspec/specs/` 下文件

### Task 3: CLI flag 更新

**Goal**: 将 `--skip-specs` 替换为 `--no-sync`，更新 options 类型。

**Files**:
- Modify: `src/cli/index.ts`

**Requirements**:
- `.option('--skip-specs', ...)` 改为 `.option('--no-sync', '跳过 sync gate（pending delta 检查）')`
- `action` handler options 类型新增 `noSync?: boolean; sync?: boolean`
- 不影响其他 archive 选项（`--yes`, `--no-verify`, `--no-validate`）

#### Checks

- [x] C5 验证 --no-sync flag 可用
  - Verifies: `specs/cli-archive/spec.md` / Requirement "Sync Gate" / Scenario "--no-sync 跳过 sync gate"
  - Command: `openspec archive --help`
  - Expect: 输出包含 `--no-sync` 选项描述，不包含 `--skip-specs`

- [x] C6 验证 --skip-specs 已移除
  - Verifies: `specs/cli-archive/spec.md` / REMOVED Requirement "Skip Specs Option"
  - Command: `! openspec archive --skip-specs 2>&1 | grep -q 'unknown option'`
  - Expect: `--skip-specs` 报 unknown option

### Task 4: 更新测试

**Goal**: 删除 archive-time sync 相关测试，新增 sync gate 测试。

**Files**:
- Modify: `test/core/archive.test.ts`

**Requirements**:
- 删除 6 个测试：sync/opsx archive-time 写入、embedded sync 行为、freshness refresh after sync
- 新增 sync gate 测试：阻塞未合并 delta、跳过 `--no-sync`、确认交互、`--yes --no-sync` 静默
- 将 `skipSpecs: true` 调用改为 `noSync: true`
- 已有基础 archive 测试（change selection、task check、validation、duplicate）保持不变

#### Checks

- [x] C7 验证同步写入测试已删除
  - Verifies: `specs/cli-archive/spec.md` / REMOVED Requirement "Spec Update Process"
  - Command: `grep -n 'should sync delta specs during archive\|should apply opsx-delta during archive' test/core/archive.test.ts`
  - Expect: 无匹配结果

- [x] C8 验证新增 sync gate 测试全部通过
  - Verifies: `specs/cli-archive/spec.md` / Requirement "Sync Gate" / Scenario "存在未合并 delta 时阻止归档"
  - Command: `pnpm test -- src/core/archive.test.ts`
  - Expect: 全部测试通过（含新增 sync gate 测试）

### Task 5: 更新 workflow 模板文字

**Goal**: 更新 archive-change 模板，移除 "archive-time sync writes" 相关描述。

**Files**:
- Modify: `src/core/templates/workflows/archive-change.ts`

**Requirements**:
- 将 "Skipped all archive-time sync writes" 替换为 sync gate 状态描述
- 模板 prose 与当前 archive 行为一致（不再提及 embedded sync）

#### Checks

- [x] C9 验证模板无 stale 引用
  - Verifies: `specs/cli-archive/spec.md` / Requirement "Display Output" / Scenario "显示 gate 状态"
  - Command: `grep -n 'archive-time sync\|Skipped all archive-time' src/core/templates/workflows/archive-change.ts`
  - Expect: 无匹配结果
