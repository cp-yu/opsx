## MODIFIED Requirements

### Requirement: Correctness Verification

The agent SHALL 通过将 change 意图与仓库最终状态做对照来验证实现是否符合规格，并将 git 证据仅用作发现线索而非事实来源。判定模式按 Check 锚点类型分派：`Verifies`（普通 requirement）执行存在性判定，`Verifies ... REMOVED Requirement` 执行缺失性判定，`Preserves` 执行等价性判定。

#### Scenario: Git evidence 作为调查线索

- **WHEN** 验证一个带有本地修改或最近提交的 change
- **THEN** the agent SHALL 使用 git status / diff / log 定位候选文件、声称实现的区域与可疑遗漏
- **AND** SHALL 将 git evidence 视为调查线索，NOT sufficient proof of requirement satisfaction
- **AND** SHALL 遵循证据优先级顺序：change artifacts → git evidence (guide) → final file contents (judge) → tests
- **AND** 具体协议见 reviewer.ts Self-Read Protocol 步骤 3-5（git status/diff 仅作为导航线索，最终文件内容为权威证据）

#### Scenario: Step-by-step objective verification

- **WHEN** 验证任何 requirement
- **THEN** the agent SHALL 遵循以下步骤：
  1. **Locate**: 搜索代码库中与 requirement 相关的关键词，识别候选文件
  2. **Read**: 读取实际文件内容（不仅是搜索结果或 git diffs）
  3. **Analyze**: 将文件内容与 requirement intent 和 scenario conditions 对比
  4. **Cite**: 记录具体文件路径和行号作为证据
  5. **Judge**: 基于证据做出 PASS/WARNING/CRITICAL 判断
  6. **Explain**: 对于非 PASS 判断，解释缺失或偏离之处
- **AND** 具体判定标准见 reviewer.ts Correctness 节（Presence/Absence/Equivalence 三段分派，Locate→Read→Analyze→Cite→Judge→Explain 六步验证循环）
