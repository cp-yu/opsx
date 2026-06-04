### Task 1: Sweeper skill prompt 术语提取扩展

**Goal**: 在 `openspec-impact-sweeper` skill 模板的 prompt 中增加术语提取指令章节。

**Files**:
- Modify: `src/core/shared/skill-generation.ts`
- Test: `tests/core/shared/skill-generation.test.ts`

**Requirements**:
- 在 sweeper skill prompt 中增加 "Terminology Awareness" 章节
- 定义语义相近术语识别策略和示例
- 明确输出格式为 `terminologyObservations` 字段
- 强调事实陈述而非判断
- 提取失败时降级为省略该字段，不阻塞报告生成

#### Checks

- [x] C1 验证 prompt 包含术语提取章节
  - Verifies: `specs/sweeper-terminology-extraction/spec.md` / Requirement "Prompt 指令规范" / Scenario "Prompt 包含术语提取步骤"
  - Command: `pnpm test -- skill-generation`
  - Expect: 测试验证 sweeper skill prompt 包含 "Terminology Awareness" 章节和提取策略说明

- [x] C2 验证术语提取示例完整性
  - Verifies: `specs/sweeper-terminology-extraction/spec.md` / Requirement "Prompt 指令规范" / Scenario "Prompt 包含术语提取步骤"
  - Evidence: `src/core/shared/skill-generation.ts` 中 sweeper 模板函数
  - Expect: prompt 包含示例 "if concept is '流程', extract '工作流', 'workflow', '工作流程' etc."

- [x] C3 验证事实陈述约束
  - Verifies: `specs/sweeper-terminology-extraction/spec.md` / Requirement "Prompt 指令规范" / Scenario "Prompt 强调事实陈述而非判断"
  - Evidence: `src/core/shared/skill-generation.ts` 中 sweeper 模板函数
  - Expect: prompt 包含 "Report facts only, no judgment or recommendations"

### Task 2: TypeScript 接口扩展与 JSON Schema 更新

**Goal**: 扩展 sweeper 报告的 TypeScript 接口，新增 `terminologyObservations` 字段定义。

**Files**:
- Modify: `src/types/sweeper.ts` (或相关类型定义文件)
- Test: `tests/types/sweeper.test.ts`

**Requirements**:
- 定义 `terminologyObservations` 为可选字段
- 定义 `foundInSpecs` 数组结构 (term, specs, count)
- 添加 JSDoc 注释和示例
- 确保向后兼容性（旧代码忽略新字段）

#### Checks

- [x] C4 验证 TypeScript 接口定义
  - Verifies: `specs/sweeper-terminology-reporting/spec.md` / Requirement "terminologyObservations 字段结构" / Scenario "字段结构符合 TypeScript 接口定义"
  - Command: `pnpm test -- sweeper.test`
  - Expect: 类型检查通过，接口包含 terminologyObservations 可选字段

- [x] C5 验证 JSDoc 注释完整性
  - Verifies: `specs/sweeper-terminology-reporting/spec.md` / Requirement "JSON Schema 扩展文档" / Scenario "JSDoc 注释完整性"
  - Evidence: 类型定义文件中的 JSDoc 注释
  - Expect: 包含字段说明和示例 JSON 结构

### Task 3: Sweeper 子任务实现 - 术语统计与报告生成

**Goal**: 实现术语提取的核心逻辑，包括术语识别、统计、排序和报告生成。

**Files**:
- Create: `src/core/ai/terminology-extractor.ts`
- Modify: `src/core/shared/skill-generation.ts` (sweeper 模板函数)
- Test: `tests/core/ai/terminology-extractor.test.ts`

**Requirements**:
- 实现语义相近术语识别（通过 LLM 或简单字符串匹配）
- 统计术语出现次数和分布 specs
- 按 count 降序排列 `foundInSpecs` 数组
- Spec 名称去重并按字母顺序排列
- 提取失败时返回 undefined（省略字段）

#### Checks

- [x] C6 验证术语提取功能
  - Verifies: `specs/sweeper-terminology-extraction/spec.md` / Requirement "语义相近术语识别" / Scenario "用户输入'流程'时提取相关术语"
  - Command: `pnpm test -- terminology-extractor.test`
  - Expect: 给定 concept="流程"，提取"工作流"、"workflow"、"工作流程"，不提取"拓扑排序"

- [x] C7 验证术语统计准确性
  - Verifies: `specs/sweeper-terminology-extraction/spec.md` / Requirement "术语统计与分布追踪" / Scenario "统计术语出现次数"
  - Command: `pnpm test -- terminology-extractor.test`
  - Expect: 正确统计跨 spec 的术语出现次数和 specs 列表

- [x] C8 验证 foundInSpecs 排序
  - Verifies: `specs/sweeper-terminology-reporting/spec.md` / Requirement "foundInSpecs 数组排序规则" / Scenario "按 count 降序排列术语"
  - Command: `pnpm test -- terminology-extractor.test`
  - Expect: foundInSpecs 按 count 降序，count 相同时按 term 字母顺序

- [x] C9 验证提取失败降级行为
  - Verifies: `specs/sweeper-terminology-extraction/spec.md` / Requirement "术语提取失败时的降级行为" / Scenario "术语提取失败不阻塞报告生成"
  - Command: `pnpm test -- terminology-extractor.test`
  - Expect: 模拟 LLM 错误，返回 undefined，不抛出异常

### Task 4: Explore master agent 四态判断逻辑

**Goal**: 在 Explore workflow 的 master agent 中实现术语一致性判断和提问逻辑。

**Files**:
- Modify: `src/workflows/explore.ts` (或相关 workflow 文件)
- Modify: `src/core/shared/skill-generation.ts` (explore 模板函数)
- Test: `tests/workflows/explore.test.ts`

**Requirements**:
- 实现四态判断逻辑（用户输入 ≠ specs 术语、specs 内部不一致、完全一致、未发现术语）
- 生成用户友好的中文提问文本
- Spec 名称显示策略（最多 2 个 + "等"）
- 长术语列表截断（最多 5 个）
- 字段缺失时跳过判断逻辑

#### Checks

- [x] C10 验证情况 1 判断逻辑
  - Verifies: `specs/explore-terminology-decision/spec.md` / Requirement "四态判断逻辑" / Scenario "情况 1 - 用户输入与 specs 术语不匹配（必提）"
  - Command: `pnpm test -- explore.test`
  - Expect: 用户输入"流程"，specs 包含"工作流"和"workflow"，生成提问

- [x] C11 验证情况 2 判断逻辑
  - Verifies: `specs/explore-terminology-decision/spec.md` / Requirement "四态判断逻辑" / Scenario "情况 2 - Specs 内部术语不一致（提示）"
  - Command: `pnpm test -- explore.test`
  - Expect: foundInSpecs.length > 1，生成术语不一致提示

- [x] C12 验证情况 3 和 4 静默通过
  - Verifies: `specs/explore-terminology-decision/spec.md` / Requirement "四态判断逻辑" / Scenario "情况 3 - 完全一致（静默通过）" and Scenario "情况 4 - 未发现相关术语（静默通过）"
  - Command: `pnpm test -- explore.test`
  - Expect: 术语一致或未发现时不生成提问

- [x] C13 验证向后兼容性
  - Verifies: `specs/explore-terminology-decision/spec.md` / Requirement "字段缺失时的降级行为" / Scenario "旧版本 sweeper 报告无术语字段"
  - Command: `pnpm test -- explore.test`
  - Expect: 报告缺失 terminologyObservations 字段时跳过判断逻辑，不报错

- [x] C14 验证提问格式
  - Verifies: `specs/explore-terminology-decision/spec.md` / Requirement "提问格式规范" / Scenario "问题格式用户友好"
  - Evidence: 生成的提问文本示例
  - Expect: 不包含 JSON 键名或内部术语，使用自然中文格式

### Task 5: 集成测试与端到端验证

**Goal**: 验证从 explore 调用 sweeper 到术语检测提问的完整流程。

**Files**:
- Test: `tests/integration/explore-terminology.test.ts`

**Requirements**:
- 模拟完整的 explore → sweeper → 术语检测流程
- 验证 sweeper JSON 报告生成
- 验证 master agent 解读和提问
- 验证向后兼容性场景

#### Checks

- [x] C15 验证端到端术语检测流程
  - Verifies: `specs/sweeper-terminology-extraction/spec.md` / Requirement "术语提取触发条件" / Scenario "Explore 调用 sweeper 时自动提取术语"
  - Command: `pnpm test -- integration/explore-terminology.test`
  - Expect: 给定用户 concept，sweeper 返回 terminologyObservations，master agent 生成提问

- [x] C16 验证向后兼容性端到端
  - Verifies: `specs/sweeper-terminology-reporting/spec.md` / Requirement "向后兼容性保证" / Scenario "新版本 master agent 兼容旧 sweeper 报告"
  - Command: `pnpm test -- integration/explore-terminology.test`
  - Expect: 旧版本 sweeper 报告（无 terminologyObservations）在新 master agent 中正常工作

## Remediation

- [x] [code_fix] Explore terminology answer handling is not implemented. Add explicit user answer handling for same-concept confirmation, canonical term selection, rejection, continuation, and repeat-prompt suppression.
