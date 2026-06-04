### Task 1: Spec Frontmatter Parser

**Goal**: 实现从 spec.md 提取 YAML frontmatter 并返回 capabilities 列表的解析器。

**Files**:
- Create: `src/core/parsers/spec-frontmatter.ts`
- Test: `test/core/parsers/spec-frontmatter.test.ts`

**Requirements**:
- 提取 `---` 之间的 YAML 内容，使用 `yaml.parse()` 解析
- 返回 `{ capabilities: string[] }`，无 frontmatter 或解析失败时返回空数组
- 不修改 `requirement-blocks.ts`，保持独立

#### Checks

- [x] C1 正常 frontmatter 解析
  - Verifies: `specs/spec-frontmatter/spec.md` / Requirement "解析 spec 文件的 YAML frontmatter" / Scenario "正常 frontmatter 解析"
  - Command: `pnpm test spec-frontmatter`
  - Expect: 输入含 `capabilities: [cap.cli.archive]` 的 frontmatter 返回对应数组

- [x] C2 无 frontmatter 和畸形 YAML 处理
  - Verifies: `specs/spec-frontmatter/spec.md` / Requirement "解析 spec 文件的 YAML frontmatter" / Scenario "无 frontmatter", Scenario "畸形 YAML frontmatter"
  - Command: `pnpm test spec-frontmatter`
  - Expect: 无 frontmatter 返回空数组，畸形 YAML 返回空数组且不抛异常

- [x] C3 frontmatter 后 markdown 不受影响
  - Verifies: `specs/spec-frontmatter/spec.md` / Requirement "解析 spec 文件的 YAML frontmatter" / Scenario "frontmatter 后的 markdown 内容不受影响"
  - Command: `pnpm test spec-frontmatter`
  - Expect: 仅解析 frontmatter 区域，不触及后续 markdown

### Task 2: Spec Registry

**Goal**: 实现运行时 cap↔spec 双向映射注册表及查询 API。

**Files**:
- Create: `src/core/spec-registry.ts`
- Test: `test/core/spec-registry.test.ts`

**Requirements**:
- 扫描 `openspec/specs/*/spec.md` frontmatter 构建 `capToSpecs` 和 `specToCaps` 双向 Map
- 提供 `getSpecsForCap`、`getCapsForSpec`、`getOrphanedSpecs`、`getUncoveredCaps` 四个查询方法
- 使用 `path.join()` 构建路径，跨平台兼容

#### Checks

- [x] C4 双向映射构建
  - Verifies: `specs/spec-registry/spec.md` / Requirement "运行时构建 cap↔spec 双向映射" / Scenario "构建双向映射", Scenario "多个 spec 关联同一 cap"
  - Command: `pnpm test spec-registry`
  - Expect: capToSpecs 和 specToCaps 正确反映 frontmatter 声明

- [x] C5 无 frontmatter 的 spec 跳过
  - Verifies: `specs/spec-registry/spec.md` / Requirement "运行时构建 cap↔spec 双向映射" / Scenario "无 frontmatter 的 spec 被跳过"
  - Command: `pnpm test spec-registry`
  - Expect: 无 frontmatter 的 spec 不出现在映射中

- [x] C6 查询 API
  - Verifies: `specs/spec-registry/spec.md` / Requirement "提供查询 API" / Scenario "getSpecsForCap 查询", Scenario "getCapsForSpec 查询", Scenario "getOrphanedSpecs 查询", Scenario "getUncoveredCaps 查询"
  - Command: `pnpm test spec-registry`
  - Expect: 四个查询方法返回正确结果，未知 ID 返回空数组

- [x] C7 跨平台路径
  - Verifies: `specs/spec-registry/spec.md` / Requirement "Registry 扫描使用跨平台路径" / Scenario "Windows 路径处理"
  - Command: `pnpm test spec-registry`
  - Expect: 测试中路径使用 `path.join()` 构建

### Task 3: Validation 扩展

**Goal**: 在验证系统中新增 frontmatter 校验规则（warning 级别）。

**Files**:
- Modify: `src/core/validation/validator.ts`
- Test: `test/core/validation.cross-check.test.ts`

**Requirements**:
- Frontmatter cap 不在 OPSX 中 → warning
- Spec 无 frontmatter 或 capabilities 为空 → warning
- OPSX 文件不存在时跳过 cap 存在性校验

#### Checks

- [x] C8 Frontmatter cap 存在性校验
  - Verifies: `specs/validate-spec-section-type-cross-check/spec.md` / Requirement "Frontmatter capabilities 存在性校验" / Scenario "Frontmatter cap 存在于 OPSX", Scenario "Frontmatter cap 不存在于 OPSX"
  - Command: `pnpm test validation.cross-check`
  - Expect: 存在的 cap 通过，不存在的 cap 产生 warning

- [x] C9 缺失 frontmatter warning
  - Verifies: `specs/validate-spec-section-type-cross-check/spec.md` / Requirement "缺失 frontmatter 的 warning" / Scenario "spec 无 frontmatter", Scenario "spec 有 frontmatter 但 capabilities 为空"
  - Command: `pnpm test validation.cross-check`
  - Expect: 无 frontmatter 和空 capabilities 均产生 warning

- [x] C10 OPSX 不存在时跳过
  - Verifies: `specs/validate-spec-section-type-cross-check/spec.md` / Requirement "缺失 frontmatter 的 warning" / Scenario "OPSX 文件不存在时跳过 cap 存在性校验"
  - Command: `pnpm test validation.cross-check`
  - Expect: 无 OPSX 时跳过 cap 校验，仍产生缺失 frontmatter warning

### Task 4: CLI spec list 扩展

**Goal**: `openspec spec list --json` 输出增加 capabilities 字段。

**Files**:
- Modify: `src/commands/spec.ts`
- Test: `test/cli-e2e/spec-list.test.ts`

**Requirements**:
- 每个 spec 条目新增 `capabilities` 字段（string[]）
- 有 frontmatter 时输出 cap ID 列表，无 frontmatter 时输出空数组
- 不删改现有 JSON 字段，向后兼容

#### Checks

- [x] C11 spec list --json 输出含 capabilities
  - Verifies: `specs/cli-spec/spec.md` / Requirement "Spec Command" / Scenario "spec list --json 输出包含 capabilities 字段"
  - Command: `pnpm test spec-list`
  - Expect: JSON 输出每个 spec 含 capabilities 字段

- [x] C12 向后兼容
  - Verifies: `specs/cli-spec/spec.md` / Requirement "Spec Command" / Scenario "spec list 向后兼容"
  - Command: `pnpm test spec-list`
  - Expect: 现有 JSON 字段不变，capabilities 为新增字段

### Task 5: Workflow 模板增强

**Goal**: 在 impact-sweeper、propose、apply-change 模板中新增 spec 发现指令。

**Files**:
- Modify: `src/core/templates/workflows/impact-sweeper.ts`
- Modify: `src/core/templates/workflows/propose.ts`
- Modify: `src/core/templates/workflows/apply-change.ts`

**Requirements**:
- Impact sweeper Evidence Protocol 新增 spec frontmatter 扫描步骤
- Propose 新增 `openspec spec list --json` 查询和冗余交叉对比指令
- Apply-change 新增实现前查询 cap 关联 specs 的指令

#### Checks

- [x] C13 Impact sweeper 模板包含 frontmatter 扫描指令
  - Verifies: `specs/internal-skill-installation/spec.md` / Requirement "内部 skill 模板注册" / Scenario "Impact sweeper skill 指令包含 spec frontmatter 扫描"
  - Evidence: 读取 `src/core/templates/workflows/impact-sweeper.ts` 模板内容
  - Expect: 模板字符串包含 frontmatter 扫描和 cap→spec 映射的指令文本

- [x] C14 Propose 模板包含 spec 发现指令
  - Verifies: `specs/ai-workflow-templates/spec.md` / Requirement "内部 subagent skill 引用替换内联 fragment" / Scenario "Propose 模板包含 spec 发现指令"
  - Evidence: 读取 `src/core/templates/workflows/propose.ts` 模板内容
  - Expect: 模板字符串包含 `openspec spec list --json` 查询和冗余检查指令

- [x] C15 Apply-change 模板包含 spec 交叉检查指令
  - Verifies: `specs/ai-workflow-templates/spec.md` / Requirement "内部 subagent skill 引用替换内联 fragment" / Scenario "Apply 模板包含 spec 交叉检查指令"
  - Evidence: 读取 `src/core/templates/workflows/apply-change.ts` 模板内容
  - Expect: 模板字符串包含查询 cap 关联 specs 和确认 delta spec 更新的指令
