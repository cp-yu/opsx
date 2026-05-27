## Why

当前 reviewer/optimizer subagent 采用"纯函数"模型：master agent 必须将所有文件内容打包为 evidence bundle 传入。这导致三个问题：
1. **双重 context 浪费** — master 读一遍文件，再把全文作为 prompt 传给 subagent，同样内容在系统中存在两份
2. **打包逻辑脆弱** — master 需要猜测候选文件并读取完整内容，遗漏或传摘要即被 reviewer 拒绝
3. **职责错位** — "读什么文件"的判断权本应属于审查者自身，而非编排者

## What Changes

- Reviewer/Optimizer subagent 获得 Read + Bash（只读用途）工具能力，自主读取文件和执行测试
- Master agent 的 handoff 从"完整 evidence bundle"简化为三个字符串：`changeName`、`changeDir`、`projectRoot`
- `.verify-result.json` 的 `evidenceFiles` 成为 subagent 的导航 manifest
- Subagent 可自主跑 `git diff`/`git status`/`git log` 获取 git evidence
- Reviewer 可按需跑测试子集进行抽查验证（L1 策略：默认静态判断，可疑时 Bash 抽查）
- Bash 安全边界通过 prompt hard constraint 约束（不改文件、不删文件、不创建文件）
- **BREAKING**: Input Contract 从 5 字段 bundle 变为 3 字段定位信息，现有 verify workflow 模板需同步更新

## Capabilities

### New Capabilities
- `subagent-self-read`: Reviewer/Optimizer subagent 自主文件读取与测试执行能力定义

### Modified Capabilities
- `openspec-reviewer-skill`: Input Contract 从 bundle 模型改为 manifest-driven 自读模型；新增 Read/Bash 工具约束
- `openspec-optimizer-skill`: 同上，Input Contract 改为自读模型
- `verify-prompt-orchestration`: Master 的 Evidence 收集和 Delegate Review 步骤简化为轻量 handoff

## Impact

- **Skill 文件**: `.claude/skills/openspec-reviewer/SKILL.md`、`.claude/skills/openspec-optimizer/SKILL.md` 及 `.codex/` 对应文件
- **模板源码**: `src/core/templates/workflows/reviewer.ts`、`optimizer.ts`、`verify-change.ts`
- **向后兼容**: 现有 `.verify-result.json` schema 不变；`evidenceFiles` 字段语义从"master 传给 reviewer 的列表"变为"reviewer 自己读取的导航依据"
