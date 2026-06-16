# Issue: snack spec 推断不准确导致归档验证失败

## 问题描述

`/openspec-snack` 在从已实现代码反向生成 delta spec 时，推断逻辑存在以下问题：

1. **MODIFIED vs ADDED 判断不准确**：对于修改现有能力行为的代码，snack 使用 `## MODIFIED Requirements`，但生成的 requirement 标题在主 spec 中不存在，导致归档验证失败
2. **Spec 目录命名不匹配**：根据代码变更推断的 spec 目录名与实际主 spec 目录名不一致，导致引用路径错误
3. **需要手动修正**：用户必须手动将 MODIFIED 改为 ADDED、重命名目录、修改引用路径，才能通过归档验证

## 复现步骤

**环境：**
- OpenSpec v1.2.0-cpyu.9
- 已有主 spec: `openspec/specs/verify-freshness-engine/spec.md`

**操作序列：**
```bash
# 1. 修改代码（bug 修复：新增两行同步更新逻辑）
# src/commands/verify.ts:332-333
current.verificationContext.gitHeadCommit = await getGitHead(projectRoot);
current.verificationContext.timestamp = new Date().toISOString();

# src/core/verify/types.ts:75
timestamp?: string;

# 2. 创建 change 并运行 snack
openspec new change "fix-verify-phase2-timestamp-sync"
/openspec-snack fix-verify-phase2-timestamp-sync

# 3. snack 生成的 delta spec 路径和内容
# openspec/changes/fix-verify-phase2-timestamp-sync/specs/verify-phase2-consistency/spec.md
# ❌ 目录名错误：应该是 verify-freshness-engine
```

**生成的 delta spec 片段（有问题）：**
```markdown
# Spec: verify-phase2-consistency

## Capability
cap.verify.freshness-engine

## MODIFIED Requirements

### Requirement: Phase 2 验证通过后同步更新顶层快照
**ID:** `req.verify.phase2-sync-context`
...
```

**归档验证错误：**
```
Validation errors in change delta specs:
  ✗ MODIFIED "Phase 2 验证通过后同步更新顶层快照" references non-existent main spec.
  ✗ MODIFIED "Phase 2 验证通过后同步更新顶层快照" not found in main spec. Consider using "## ADDED Requirements" instead.
```

**需要的手动修正：**
1. 将 `## MODIFIED Requirements` 改为 `## ADDED Requirements`
2. 将 spec 目录从 `specs/verify-phase2-consistency/` 重命名为 `specs/verify-freshness-engine/`
3. 将 spec 标题从 `# Spec: verify-phase2-consistency` 改为 `# Spec: verify-freshness-engine`

## 根本原因

**snack skill 的 spec 生成逻辑（`.claude/skills/openspec-snack/SKILL.md` 第 7 步）：**
```
7. Generate delta specs in `specs/<capability>/spec.md` using mid-level inference:
   - New code-map capability → `## ADDED Requirements` with BDD scenarios inferred from function signatures + conversation context.
   - Modified existing capability → `## MODIFIED Requirements` inferring behavior change.
```

**问题分析：**
1. **MODIFIED 判断标准不明确**：
   - 当前逻辑：检查 code-map 中是否已有该 capability → 有则 MODIFIED
   - 实际需要：检查主 spec 中是否已有相关 requirement → 没有则 ADDED
   - **Bug 修复场景混淆**：新增代码逻辑修复 bug，capability 已存在（verify-freshness-engine），但新行为约束在主 spec 中不存在 → 应该是 ADDED，但推断为 MODIFIED

2. **Spec 目录命名推断错误**：
   - 当前逻辑：从代码变更语义推断新目录名（如 `verify-phase2-consistency`）
   - 实际需要：查询 code-map 找到文件对应的 capability ID，使用该 ID 对应的主 spec 目录名
   - 例如：`src/commands/verify.ts` 在 code-map 中无直接映射，但行为影响 `cap.verify.freshness-engine`，应使用其主 spec 目录 `verify-freshness-engine`

3. **主 spec 存在性检查缺失**：
   - snack 未在生成前运行 `openspec list --specs --json` 检查主 spec 是否存在
   - 未读取主 spec 检查是否已有相关 requirement

## 预期行为

**snack 应该：**

1. **在生成 delta spec 前**：
   ```bash
   # 查询主 spec 列表
   openspec list --specs --json
   
   # 如果目标 capability 的主 spec 存在，读取它
   # 检查是否已有匹配的 requirement 标题
   ```

2. **ADDED vs MODIFIED 判断逻辑**：
   ```
   IF 主 spec 不存在:
       使用 ADDED（首次为该 capability 创建 spec）
   ELSE IF 主 spec 存在 AND 新 requirement 标题在主 spec 中找不到:
       使用 ADDED（新增行为约束）
   ELSE IF 主 spec 存在 AND 新 requirement 标题在主 spec 中找到:
       使用 MODIFIED（修改现有行为约束）
   ```

3. **Spec 目录命名逻辑**：
   ```
   # 方法 1：通过 code-map 反向查找
   grep -E "src/commands/verify.ts" openspec/project.opsx.code-map.yaml
   # 找到 capability ID: cap.verify.freshness-engine
   
   # 方法 2：通过 CLI 查询
   openspec list --specs --json | jq -r '.[] | select(.capabilities[] == "cap.verify.freshness-engine") | .id'
   # 找到主 spec 目录名: verify-freshness-engine
   
   使用主 spec 目录名，而不是推断新名称
   ```

## 建议修复方案

**修改 `.claude/skills/openspec-snack/SKILL.md` 第 4-7 步：**

```markdown
4. Reverse-map files to capabilities via code-map.
   - Read `openspec/project.opsx.code-map.yaml` and map each modified path to its capability/domain node IDs.
   - Files without a code-map entry are [REVIEW NEEDED] candidates for new capabilities.
   - **[NEW]** For each identified capability, run `openspec list --specs --json` to find the corresponding main spec directory name.

5. Use CLI-backed OPSX navigation after code-map reverse lookup.
   - Run `openspec list --specs --json` to get specs and their `capabilities` string arrays.
   - **[NEW]** Store mapping: capability ID → main spec directory name (e.g., `cap.verify.freshness-engine` → `verify-freshness-engine`).
   - For known or affected OPSX node IDs, run `openspec opsx query <node-id...> --json`.

7. Generate delta specs in `specs/<main-spec-dir-name>/spec.md` using mid-level inference:
   - **[CHANGED]** Use main spec directory name from step 4, not inferred name.
   - **[NEW]** If main spec exists, read it to check for existing requirement titles.
   - **[CHANGED]** ADDED vs MODIFIED logic:
     * If main spec does not exist → use `## ADDED Requirements`
     * If main spec exists AND new requirement title not found in main spec → use `## ADDED Requirements`
     * If main spec exists AND new requirement title found in main spec → use `## MODIFIED Requirements`
   - Mark uncertain inferences with `[REVIEW NEEDED]`.
```

## 影响范围

**受影响场景：**
- Bug 修复：修改现有 capability 的实现，但新增行为约束在主 spec 中不存在
- 增强现有功能：扩展现有 capability，新增 scenario 或 requirement
- 重构：改变内部实现但不改变对外行为（这种应该跳过 delta spec 生成）

**不受影响场景：**
- 全新 capability：code-map 中无映射，snack 正确使用 ADDED
- 纯文档变更：无代码改动，不触发 snack

## 测试建议

**单元测试用例：**
```typescript
describe('snack spec inference', () => {
  it('should use ADDED when main spec does not exist', () => {
    // 新 capability，无主 spec
  });
  
  it('should use ADDED when main spec exists but requirement title not found', () => {
    // Bug 修复场景：capability 已存在，但新行为约束不存在
  });
  
  it('should use MODIFIED when requirement title found in main spec', () => {
    // 修改现有 requirement
  });
  
  it('should use main spec directory name from code-map', () => {
    // 验证目录命名逻辑
  });
});
```

**集成测试场景：**
```bash
# 场景 1：Bug 修复（本次实际遇到的）
# 修改 src/commands/verify.ts（映射到 cap.verify.freshness-engine）
# 期望：specs/verify-freshness-engine/spec.md + ADDED Requirements

# 场景 2：新增 capability
# 新增 src/commands/new-feature.ts（code-map 中无映射）
# 期望：specs/new-feature/spec.md + ADDED Requirements

# 场景 3：修改已有 requirement
# 修改行为，且 requirement 标题在主 spec 中已存在
# 期望：specs/<existing>/spec.md + MODIFIED Requirements
```

## 相关文件

- `.claude/skills/openspec-snack/SKILL.md` - snack skill 定义
- `src/core/templates/workflows/.codex/snack.ts` - snack workflow 实现（如果存在）
- `openspec/project.opsx.code-map.yaml` - code-map 数据源
- 本次修复的实际案例：`openspec/changes/archive/2026-06-16-fix-verify-phase2-timestamp-sync/`

## 优先级

**中等**（影响用户体验但有手动修正路径）

**理由：**
- 不阻塞功能使用（可通过手动修正继续归档）
- 影响 snack 的核心价值主张（快速从代码生成规范）
- 增加用户认知负担（需要理解 ADDED vs MODIFIED 语义）
- 可能导致用户放弃使用 snack，回退到手动编写 spec
