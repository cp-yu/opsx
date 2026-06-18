### Task 1: 修复 removal-only delta 已应用判定

**Goal**: 让共享 sync 判定在所有 `REMOVED` headers 已缺失时把 removal-only delta 视为已同步，同时保留空 spec 删除和真实冲突报错。

**Files**:
- Modify: `src/core/specs-apply.ts`
- Modify: `src/core/change-sync.ts`
- Test: `test/commands/sync.test.ts`
- Test: `test/core/archive.test.ts`

**Requirements**:
- `isDeltaSpecAlreadyApplied()` SHALL treat a removal-only delta as already applied when every listed removed header is absent from the current main spec.
- 首次应用 removal-only delta 清空 spec 时，主 spec 文件仍 SHALL 被删除。
- 未同步状态下仍存在的 REMOVED headers SHALL 继续进入正常应用路径。
- 测试路径 SHALL 使用 `path.join()` 构造，避免平台分隔符假设。

#### Checks

- [x] C1 验证 sync 对已缺失 headers 的 removal-only delta no-op
  - Verifies: `specs/cli-sync/spec.md` / Requirement "幂等性" / Scenario "removal-only delta 的目标 headers 已缺失"
  - Command: `npm test -- test/commands/sync.test.ts`
  - Expect: 重复 `openspec sync` 在主 spec 仍有无关 requirements 时输出 no-op，不抛出 `REMOVED failed`

- [x] C2 验证 sync 清空 spec 后重复执行 no-op
  - Verifies: `specs/cli-sync/spec.md` / Requirement "幂等性" / Scenario "removal-only delta 清空 spec 后重复执行"
  - Command: `npm test -- test/commands/sync.test.ts`
  - Expect: 首次 sync 删除空 spec 文件，重复 sync 不重新创建空 spec 文件

- [x] C3 验证 archive-time sync 对已缺失 headers 的 removal-only delta no-op
  - Verifies: `specs/cli-archive/spec.md` / Requirement "Archive Process" / Scenario "Removal-only delta target headers already absent"
  - Command: `npm test -- test/core/archive.test.ts`
  - Expect: archive 在主 spec 仍有无关 requirements 时通过 sync gate 并归档，不抛出 `REMOVED failed`

### Task 2: 验证共享 reconciliation 合同

**Goal**: 确认共享 sync 语义覆盖 standalone sync 与 archive-time sync，且未放宽 `buildUpdatedSpec()` 的冲突检测。

**Files**:
- Test: `test/commands/sync.test.ts`
- Test: `test/core/archive.test.ts`
- Test: `test/core/archive.test.ts`

**Requirements**:
- removal-only delta 的完成状态 SHALL 由明确 requirement header lookup 决定。
- 主 spec 中无关 requirements SHALL NOT 让已完成的 removal-only delta 重新 pending。
- `buildUpdatedSpec()` SHALL continue to throw for missing REMOVED headers when the delta is not already applied.

#### Checks

- [x] C4 验证共享 REMOVED reconciliation no-op
  - Verifies: `specs/specs-sync-skill/spec.md` / Requirement "Delta Reconciliation Logic" / Scenario "REMOVED requirements already absent"
  - Command: `npm test -- test/commands/sync.test.ts test/core/archive.test.ts`
  - Expect: standalone sync 与 archive-time sync 都把已缺失 headers 的 removal-only delta 视为已应用

- [x] C5 保持 REMOVED 冲突检测
  - Preserves: `openspec/specs/openspec-conventions/spec.md` / Requirement "Archive Process Enhancement" / Scenario "Handling conflicts during archive"
  - Command: `npm test -- test/core/archive.test.ts`
  - Expect: 现有 MODIFIED/REMOVED reference non-existent requirement 失败用例继续通过
