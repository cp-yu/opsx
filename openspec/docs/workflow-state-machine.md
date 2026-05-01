# OpenSpec 完整工作流状态转移：Propose → Apply → Verify → Sync → Archive

## 一、五大阶段顶层状态机

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                         OpenSpec Change 生命周期                             │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────┐      ┌──────────┐      ┌──────────┐      ┌──────────┐      ┌──────────┐
│  │ PROPOSE  │─────▶│  APPLY   │─────▶│ VERIFY   │─────▶│  SYNC    │─────▶│ ARCHIVE  │
│  │          │      │          │      │          │      │          │      │          │
│  │ 创建工件 │      │ 实现任务 │      │ 校验实现 │      │ 合并增量 │      │ 归入档案 │
│  └──────────┘      └──────────┘      └──────────┘      └──────────┘      └──────────┘
│       │                 │                 │                 │                 │
│       │          ┌──────┴──────┐    ┌─────┴──────┐    ┌─────┴──────┐          │
│       │          │ 任务不明确  │    │ FAIL_NEEDS │    │ 无delta   │          │
│       │          │ 设计问题    │    │ _REMEDIATION│   │ specs     │          │
│       │          │ 错误/阻塞   │    │            │    │ 无opsx    │          │
│       │          │ 用户中断    │    │ 回到APPLY  │    │ delta     │          │
│       │          └──────┬──────┘    └─────┬──────┘    └───────────┘          │
│       │                 │                 │                                   │
│       ▼                 ▼                 ▼                                   │
│   (暂停等待)        (暂停等待)        (暂停等待)                               │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 五大阶段之间的进入/退出条件

```
   PROPOSE                      APPLY                        VERIFY
   ────────                     ─────                        ──────

   进入条件:                    进入条件:                     进入条件:
   • 用户提供名称/描述           • PROPOSE 完成                • APPLY 完成 (所有任务 [x])
   • 无前置工件要求              • 存在 proposal.md            • tasks.md 存在且有 checkbox
                                • 存在 design.md             • 或存在 FAIL_NEEDS_REMEDIATION
                                • 存在 tasks.md              • 用户执行 /opsx:verify
                                • 存在 specs/ (spec-driven)
                                • 用户执行 /opsx:apply

   退出条件:                    退出条件:                     退出条件:
   • 所有 applyRequires 工件     • 所有 tasks.md checkbox     • result = PASS 或
     状态为 done                   标记为 [x]                    PASS_WITH_WARNINGS
   • 验证通过 (warning-only)     • 无暂停条件                  • optimization.status 终局
   • 输出: "准备实现"            • 输出: 建议运行 verify       • .verify-result.json 已写入
                                                             • seal 校验通过


   SYNC                         ARCHIVE
   ────                         ───────

   进入条件:                    进入条件:
   • VERIFY 通过 (PASS 或        • VERIFY 通过
     PASS_WITH_WARNINGS)        • sync 完成 (或无需 sync)
   • 存在 delta specs 或        • 用户执行 /opsx:archive
     opsx-delta.yaml            • .verify-result.json FRESH
   • 用户执行 /opsx:sync           + archive-compatible
     (或 archive 内嵌调用)

   退出条件:                    退出条件:
   • 所有 delta specs 合并      • change 目录移动到
     到主 specs                    archive/YYYY-MM-DD-<name>/
   • OPSX delta (如有) 合并     • 所有 specs/OPSX 已同步
     到三个 OPSX 文件            • 输出归档完成摘要
   • 验证通过 (引用完整性,
     代码映射完整性)
   • 变更目录保持活跃
```

---

## 二、PROPOSE — 详细内部状态转移

```
                          /opsx:propose "<name>" 或 /opsx:propose (交互式)
                                       │
                                       ▼
                    ┌──────────────────────────────────────┐
                    │  P1. INPUT_RESOLVE                   │
                    │  ─────────────────                   │
                    │  名称已提供 → 直接使用                │
                    │  从上下文推断 → 确认                  │
                    │  否则 → openspec list --json         │
                    │        → AskUserQuestion             │
                    │  ─────────────────                   │
                    │  输出: kebab-case change name        │
                    └──────────────────┬───────────────────┘
                                       │
                                       ▼
                    ┌──────────────────────────────────────┐
                    │  P2. SCAFFOLD                        │
                    │  ─────────────────                   │
                    │  openspec new change "<name>"        │
                    │  → 创建 openspec/changes/<name>/     │
                    │  → 生成 .openspec.yaml (schema元数据) │
                    └──────────────────┬───────────────────┘
                                       │
                                       ▼
                    ┌──────────────────────────────────────┐
                    │  P3. STATUS_CHECK                    │
                    │  ─────────────────                   │
                    │  openspec status --change "<name>"   │
                    │  --json                              │
                    │  → 解析 schemaName                   │
                    │  → 解析 applyRequires (必备工件列表)  │
                    │  → 解析 artifacts[] (含 status)      │
                    └──────────────────┬───────────────────┘
                                       │
                                       ▼
            ┌──────────────────────────────────────────────────┐
            │  P4. ARTIFACT_LOOP  (按依赖顺序循环)              │
            │  ─────────────────                                │
            │                                                   │
            │  ┌─────────────────────────────────────┐         │
            │  │ 4a. 找下一个 ready 且无未满足依赖的工件│◀────────┤
            │  └─────────────────┬───────────────────┘         │
            │                    │                              │
            │                    ▼                              │
            │  ┌─────────────────────────────────────┐         │
            │  │ 4b. openspec instructions            │         │
            │  │     <artifact-id>                    │         │
            │  │     --change "<name>" --json         │         │
            │  │  → 获取 template + context + rules   │         │
            │  └─────────────────┬───────────────────┘         │
            │                    │                              │
            │                    ▼                              │
            │  ┌─────────────────────────────────────┐         │
            │  │ 4c. 读取已完成的依赖工件作为上下文    │         │
            │  │  → 读取 proposal.md (如已存在)       │         │
            │  │  → 读取 design.md (如已存在)         │         │
            │  │  → 读取 specs/ (如已存在)            │         │
            │  └─────────────────┬───────────────────┘         │
            │                    │                              │
            │                    ▼                              │
            │  ┌─────────────────────────────────────┐         │
            │  │ 4d. 创建工件文件                     │         │
            │  │  → 应用 template，遵守 context/rules │         │
            │  │  → 写入 openspec/changes/<name>/     │         │
            │  │  → 标记工件 status = done            │         │
            │  └─────────────────┬───────────────────┘         │
            │                    │                              │
            │                    ▼                              │
            │  ┌─────────────────────────────────────┐         │
            │  │ 4e. openspec status --change --json  │         │
            │  │  → 重新加载工件状态                  │         │
            │  └─────────────────┬───────────────────┘         │
            │                    │                              │
            │      ┌─────────────┴─────────────┐                │
            │      │                           │                │
            │  applyRequires              还有未完成工件        │
            │  全部 done              (继续循环 → 4a)            │
            │      │                                            │
            └──────┼────────────────────────────────────────────┘
                   │
                   ▼
    ┌──────────────────────────────────────┐
    │  P4-SPECIAL. OPSX_DELTA_GENERATE     │
    │  ─────────────────                   │
    │  (仅 spec-driven schema,             │
    │   在 specs 工件完成后)               │
    │                                      │
    │  读取 proposal.md → 提取能力列表     │
    │  读取 delta specs → 提取需求         │
    │  读取 project.opsx.yaml → 当前系统   │
    │  生成 opsx-delta.yaml                │
    │  (ADDED / MODIFIED / REMOVED)        │
    └──────────────────┬───────────────────┘
                       │
                       ▼
    ┌──────────────────────────────────────┐
    │  P5. POST_VALIDATION (warning-only)  │
    │  ─────────────────                   │
    │  openspec validate "<name>"          │
    │    --type change --json              │
    │  → 验证 delta specs 结构            │
    │  → 验证 SHALL/MUST + Scenario 格式   │
    │                                      │
    │  Dry-run opsx-delta merge:           │
    │  → 引用完整性检查                    │
    │  → 代码映射完整性检查                │
    │                                      │
    │  结构检查: proposal.md / design.md   │
    │            / tasks.md                │
    │                                      │
    │  发现 warning → 修复一轮 → 再检查    │
    │  ⚠ 不阻塞! 即使有剩余 warning        │
    │    也可声明 READY                    │
    └──────────────────┬───────────────────┘
                       │
                       ▼
    ┌──────────────────────────────────────┐
    │  P6. FINAL_STATUS                    │
    │  ─────────────────                   │
    │  openspec status --change "<name>"   │
    │  → 显示所有工件状态                   │
    │  → "所有工件已创建！准备实现。"       │
    │  → "运行 /opsx:apply 开始。"         │
    └──────────────────────────────────────┘
                       │
                       ▼
              ┌────────────────┐
              │  进入 APPLY    │
              └────────────────┘
```

### PROPOSE 工件创建顺序 (spec-driven schema)

```
  proposal.md ──▶ design.md ──▶ specs/<cap>/spec.md ──▶ tasks.md
                                                            │
                                                            ▼
                                                    opsx-delta.yaml
                                                   (在 specs 完成后)
```

### PROPOSE → APPLY 转换条件

| 条件 | 必须? | 说明 |
|------|-------|------|
| `applyRequires` 全部工件 `done` | ✅ 是 | `openspec status --json` 返回 `isComplete` 或所有必备工件完成 |
| `proposal.md` 存在 | ✅ 是 | 变更的 What + Why |
| `design.md` 存在 | ✅ 是 | 变更的 How |
| `tasks.md` 存在且含 checkbox | ✅ 是 | 实现步骤清单 |
| `specs/` (spec-driven) | ✅ 是 | Delta 规格文件 |
| 验证通过 | ❌ 否 | Warning-only, 不阻塞 |

---

## 三、APPLY — 详细内部状态转移

```
                          /opsx:apply "<name>" 或 /opsx:apply (交互式)
                                       │
                                       ▼
                    ┌──────────────────────────────────────┐
                    │  A1. CHANGE_SELECT                   │
                    │  ─────────────────                   │
                    │  名称已提供 → 直接使用                │
                    │  从上下文推断 → 确认                  │
                    │  恰好1个活跃change → 自动选择          │
                    │  否则 → openspec list --json         │
                    │        → AskUserQuestion             │
                    │  ─────────────────                   │
                    │  输出: 已解析的 change name           │
                    │  宣布: "Using change: <name>"        │
                    └──────────────────┬───────────────────┘
                                       │
                                       ▼
                    ┌──────────────────────────────────────┐
                    │  A2. SCHEMA_CHECK                    │
                    │  ─────────────────                   │
                    │  openspec status --change "<name>"   │
                    │    --json                            │
                    │  → 解析 schemaName                   │
                    │  → 识别 tasks 工件                   │
                    └──────────────────┬───────────────────┘
                                       │
                                       ▼
                    ┌──────────────────────────────────────┐
                    │  A3. STATE_GATE                      │
                    │  ─────────────────                   │
                    │  openspec instructions apply         │
                    │    --change "<name>" --json          │
                    │  → 解析 contextFiles                 │
                    │  → 解析 progress (total/complete/    │
                    │     remaining)                       │
                    │  → 解析 dynamicInstruction           │
                    │                                      │
                    │  ┌─────────────────────────────┐     │
                    │  │ state: "blocked"             │     │
                    │  │ → 建议 /opsx:continue        │     │
                    │  │ → 终止 (不进入实现)          │     │
                    │  ├─────────────────────────────┤     │
                    │  │ state: "all_done"            │     │
                    │  │ → 恭喜 + 建议 archive        │     │
                    │  │ → 终止 (不进入实现)          │     │
                    │  ├─────────────────────────────┤     │
                    │  │ state: ready                 │     │
                    │  │ → 继续 → A4                  │     │
                    │  └─────────────────────────────┘     │
                    └──────────────────┬───────────────────┘
                                       │ (ready)
                                       ▼
                    ┌──────────────────────────────────────┐
                    │  A4. CONTEXT_LOAD                    │
                    │  ─────────────────                   │
                    │  读取 project.opsx.yaml (如有)       │
                    │  读取 project.opsx.code-map.yaml     │
                    │  读取 openspec/specs/                │
                    │  读取 contextFiles (proposal,        │
                    │    design, specs, tasks)             │
                    │  读取 openspec/config.yaml           │
                    │                                      │
                    │  ─── 验证反馈循环 ───                │
                    │  读取 .verify-result.json (如有)     │
                    │  ┌─────────────────────────────┐     │
                    │  │ result = FAIL_NEEDS_         │     │
                    │  │           REMEDIATION        │     │
                    │  │ → 加载 CRITICAL issues       │     │
                    │  │   作为强制修复上下文          │     │
                    │  ├─────────────────────────────┤     │
                    │  │ result = PASS /              │     │
                    │  │          PASS_WITH_WARNINGS  │     │
                    │  │ → 不注入额外上下文            │     │
                    │  ├─────────────────────────────┤     │
                    │  │ optimization 对象存在        │     │
                    │  │ → 仅记录 status/score        │     │
                    │  │   用于显示                   │     │
                    │  │ → 永不读取/重放              │     │
                    │  │   optimization.attempts      │     │
                    │  ├─────────────────────────────┤     │
                    │  │ tasks.md 有 ## Remediation   │     │
                    │  │ → 解析 [code_fix] /          │     │
                    │  │         [artifact_fix]       │     │
                    │  │ → 未检查条目 = 优先级工作    │     │
                    │  └─────────────────────────────┘     │
                    └──────────────────┬───────────────────┘
                                       │
                                       ▼
                    ┌──────────────────────────────────────┐
                    │  A5. PROGRESS_DISPLAY                │
                    │  ─────────────────                   │
                    │  显示: schema 名称                    │
                    │  显示: N/M 任务已完成                 │
                    │  显示: 剩余任务概览                   │
                    │                                      │
                    │  ─── 优化摘要行 (如有) ───            │
                    │  IMPROVED  →  "代码已优化 (分数:X)"  │
                    │  DEGRADED  →  "优化已回滚"           │
                    │  ABORTED_UNSAFE → "优化已中止"       │
                    │  SKIPPED   →  "优化被跳过"           │
                    │  NOT_NEEDED → "代码质量已高"          │
                    │  PENDING   →  "优化未完成"           │
                    │  NOT_APPLICABLE → "不适用"           │
                    │                                      │
                    │  ─── 修复摘要 (如有) ───              │
                    │  CRITICAL 问题列表                    │
                    │  [code_fix] 条目                     │
                    │  [artifact_fix] 条目                 │
                    └──────────────────┬───────────────────┘
                                       │
                                       ▼
            ┌──────────────────────────────────────────────────┐
            │  A6. IMPLEMENT_LOOP  (按任务顺序循环)             │
            │  ─────────────────                                │
            │                                                   │
            │  ┌─────────────────────────────────────┐         │
            │  │ 6a. 取下一个未完成任务               │◀────────┤
            │  │  → "正在处理任务 N/M: <描述>"       │         │
            │  └─────────────────┬───────────────────┘         │
            │                    │                              │
            │                    ▼                              │
            │  ┌─────────────────────────────────────┐         │
            │  │ 6b. 注入验证上下文 (如适用)          │         │
            │  │  → 若 task 被 verify 取消标记       │         │
            │  │    加载匹配的 CRITICAL issue         │         │
            │  │  → 优先处理 [code_fix] 条目          │         │
            │  └─────────────────┬───────────────────┘         │
            │                    │                              │
            │                    ▼                              │
            │  ┌─────────────────────────────────────┐         │
            │  │ 6c. 执行实现                         │         │
            │  │  → [code_fix]: 修改代码/测试         │         │
            │  │  → [artifact_fix]: 修改spec/design  │         │
            │  │  → 普通task: 按design实现            │         │
            │  └─────────────────┬───────────────────┘         │
            │                    │                              │
            │         ┌──────────┴──────────┐                   │
            │         │                     │                   │
            │    实现成功               遇到暂停条件             │
            │         │                     │                   │
            │         ▼                     ▼                   │
            │  ┌──────────────┐   ┌────────────────────┐       │
            │  │ 6d. 标记完成  │   │ 6e. 暂停处理        │       │
            │  │ - [ ] → - [x]│   │ ─────────────       │       │
            │  │ (tasks.md)   │   │ 任务不明确 → 请求澄清│       │
            │  │ - [ ] [fix]  │   │ 设计问题 → 建议更新  │       │
            │  │  → - [x] [fix]│  │ 错误/阻塞 → 报告等待 │       │
            │  │ (Remediation)│   │ 用户中断 → 停止处理  │       │
            │  └──────┬───────┘   └────────┬───────────┘       │
            │         │                     │                   │
            │   继续循环(6a)           进入 A7 (暂停)            │
            │                                                     │
            │  所有任务 [x] → 退出循环 → A7 (完成)               │
            └────────────────────────────────────────────────────┘
                                       │
                         ┌─────────────┴─────────────┐
                         │                           │
                    所有任务完成                   暂停退出
                         │                           │
                         ▼                           ▼
    ┌──────────────────────────────────┐ ┌──────────────────────┐
    │  A7-COMPLETE. FINAL_STATUS       │ │ A7-PAUSE. STATUS     │
    │  ─────────────────               │ │ ─────────────        │
    │  本次会话完成的任务               │ │ 本次会话完成的任务    │
    │  总进度: N/M 任务已完成           │ │ 总进度: N/M          │
    │  若有修复解决 → 建议重跑 verify   │ │ 暂停原因说明         │
    │  若全部完成 → 建议 archive        │ │ 后续: /opsx:continue │
    │                                  │ │   或 /opsx:apply     │
    │  输出: "建议运行 /opsx:verify"    │ │                      │
    └──────────────────┬───────────────┘ └──────────────────────┘
                       │
                       ▼
              ┌────────────────┐
              │  进入 VERIFY   │
              └────────────────┘
```

### APPLY 暂停条件与恢复路径

```
  暂停原因                    检测方式                      恢复方式
  ────────                    ────────                      ────────
  任务描述不明确              agent 判断无法确定            /opsx:apply (澄清后继续)
                             实现方向
  实现揭示设计缺陷            实现过程中发现 design.md      /opsx:continue (更新 design 后)
                             与实际代码架构冲突
  遇到技术错误/阻塞           编译错误、依赖缺失、           /opsx:apply (解决阻塞后)
                             不可预见的障碍
  用户主动中断                用户发送中断信号              /opsx:apply (随时继续)
```

### APPLY → VERIFY 转换条件

| 条件 | 必须? | 说明 |
|------|-------|------|
| 所有 `tasks.md` checkbox 为 `[x]` | ✅ 是 | 包括 Remediation 条目 |
| 无未解决的暂停条件 | ✅ 是 | 或因用户确认跳过 |

---

## 四、VERIFY — 详细内部状态转移

```
                          /opsx:verify "<name>" 或 /opsx:verify (交互式)
                                       │
                                       ▼
                    ┌──────────────────────────────────────┐
                    │  V0. CHANGE_SELECT                   │
                    │  ─────────────────                   │
                    │  openspec list --json                │
                    │  → 展示有 tasks 的 change            │
                    │  → AskUserQuestion                   │
                    │  → 永不自动选择                      │
                    └──────────────────┬───────────────────┘
                                       │
                                       ▼
                    ┌──────────────────────────────────────┐
                    │  V0.5. EARLY_STOP_CHECK              │
                    │  ─────────────────                   │
                    │  openspec instructions apply         │
                    │    --change "<name>" --json          │
                    │  → 加载 contextFiles                 │
                    │  → 检查 tasks.md                     │
                    │                                      │
                    │  ┌─────────────────────────────┐     │
                    │  │ tasks.md 缺失/无checkbox     │     │
                    │  │ → "没有可供 verify 的任务"   │     │
                    │  │ → 建议 /opsx:continue       │     │
                    │  │ → 终止 (不写入 .verify)     │     │
                    │  └─────────────────────────────┘     │
                    └──────────────────┬───────────────────┘
                                       │ (tasks.md 存在且有 checkbox)
                                       ▼
                    ┌──────────────────────────────────────┐
                    │  V1. EXECUTION_MODEL_SETUP           │
                    │  ─────────────────                   │
                    │  读取工具类型 (claude/codex/other)   │
                    │                                      │
                    │  ┌─────────────────────────────┐     │
                    │  │ claude / codex               │     │
                    │  │ → subagent-orchestrated      │     │
                    │  │ → V2-SUBAGENT                │     │
                    │  ├─────────────────────────────┤     │
                    │  │ 其他工具                      │     │
                    │  │ → current-agent-reread       │     │
                    │  │ → V2-REREAD                  │     │
                    │  └─────────────────────────────┘     │
                    └──────────────────┬───────────────────┘
                                       │
              ┌────────────────────────┴────────────────────────┐
              │                                                 │
              ▼                                                 ▼
┌──────────────────────────────────┐     ┌──────────────────────────────────┐
│  V2-SUBAGENT. 子代理编排模式      │     │  V2-REREAD. 重读协议模式          │
│  ─────────────────               │     │  ─────────────────               │
│                                   │     │                                   │
│  ┌──────────────────────────┐    │     │  ┌──────────────────────────┐    │
│  │ 收集证据包 (主agent)      │    │     │  │ 重新读取所有工件 (主agent)│    │
│  │ • 读取所有change artifacts│    │     │  │ • proposal.md            │    │
│  │ • 运行 git status/diff/  │    │     │  │ • design.md              │    │
│  │   log -5 --oneline       │    │     │  │ • specs/*/spec.md        │    │
│  │ • 读取候选实现文件        │    │     │  │ • tasks.md               │    │
│  │ • 读取 .verify-result    │    │     │  │ • 重新运行 git 命令       │    │
│  │   .json (如有)           │    │     │  │ • 重新读取最终文件内容    │    │
│  └────────────┬─────────────┘    │     │  │ • 忽略对话历史 (非权威)  │    │
│               │                   │     │  └────────────┬─────────────┘    │
│               ▼                   │     │               │                   │
│  ┌──────────────────────────┐    │     │               ▼                   │
│  │ 启动 Reviewer Subagent   │    │     │  ┌──────────────────────────┐    │
│  │ • 传入证据包              │    │     │  │ V3. PHASE1_JUDGMENT      │    │
│  │ • Subagent 拥有全部       │    │     │  │ (当前 agent 直接判断)    │    │
│  │   completeness/          │    │     │  │                          │    │
│  │   correctness/coherence  │    │     │  └────────────┬─────────────┘    │
│  │   判断权                  │    │     │               │                   │
│  │ • 主agent 不得越权判断    │    │     │               │                   │
│  └────────────┬─────────────┘    │     │               │                   │
│               │                   │     │               │                   │
│               ▼                   │     │               │                   │
│  ┌──────────────────────────┐    │     │               │                   │
│  │ 验证 Subagent 返回载荷    │    │     │               │                   │
│  │ • 检查 payload 结构完整性 │    │     │               │                   │
│  │ • 失败 → fail closed     │    │     │               │                   │
│  └────────────┬─────────────┘    │     │               │                   │
│               │                   │     │               │                   │
└───────────────┼───────────────────┘     └───────────────┼───────────────────┘
                │                                         │
                └──────────────────┬──────────────────────┘
                                   │
                                   ▼
                    ┌──────────────────────────────────────┐
                    │  V3. PHASE1_JUDGMENT                 │
                    │  (Completeness + Correctness          │
                    │   + Coherence)                       │
                    │  ─────────────────                   │
                    │                                      │
                    │  Completeness (完整性):               │
                    │  • 检查 tasks.md checkbox 覆盖        │
                    │  • 检查 spec 需求覆盖                 │
                    │                                      │
                    │  Correctness (正确性):                │
                    │  • 需求→实现映射                      │
                    │  • Scenario 覆盖                     │
                    │  • 引用文件路径 + 行号                │
                    │  • Git 证据仅作线索, 最终文件为权威   │
                    │                                      │
                    │  Coherence (一致性):                  │
                    │  • 设计遵守度                        │
                    │  • 代码模式一致性                    │
                    │                                      │
                    │  严重性判断:                          │
                    │  • CRITICAL: 需求完全缺失实现         │
                    │  • WARNING: 实现偏离 spec 但功能存在  │
                    │  • SUGGESTION: 可优化但不影响正确性   │
                    │                                      │
                    │  不确定时 → 降级处理                  │
                    │  SUGGESTION > WARNING > CRITICAL      │
                    └──────────────────┬───────────────────┘
                                       │
                         ┌─────────────┼─────────────┐
                         │             │             │
                    FAIL_NEEDS_    PASS_WITH_      PASS
                    REMEDIATION    WARNINGS
                         │             │             │
                         │             └──────┬──────┘
                         │                    │
                         ▼                    ▼
    ┌──────────────────────────┐  ┌──────────────────────────┐
    │  V4-FAIL. WRITEBACK      │  │  V4-PASS. CANONICAL      │
    │  ─────────────────       │  │  ─────────────────       │
    │  CRITICAL issues only:   │  │  准备 canonical Phase 1  │
    │  • [x] → [ ] 回退task    │  │  payload:                │
    │  • 追加/刷新              │  │  • timestamp             │
    │    ## Remediation        │  │  • result: PASS/         │
    │    - [ ] [code_fix] ...  │  │    PASS_WITH_WARNINGS    │
    │    - [ ] [artifact_fix]  │  │  • issues[]              │
    │                          │  │  • tasksFileHash         │
    │  ⚠ WARNING/SUGGESTION    │  │  • verificationContext:  │
    │   不触发 writeback       │  │    - contractVersion     │
    │                          │  │    - executionMode       │
    │  写入 .verify-result.json│  │    - evidenceFiles       │
    │  (仅 Phase 1 payload)    │  │    - evidenceFingerprint │
    │                          │  │    - gitHeadCommit       │
    │  终止 → 回到 APPLY       │  │    - gitDiffSummary      │
    └──────────────────────────┘  │                          │
                                  │  此 payload = 不可变的   │
                                  │  optimization.baseline   │
                                  └────────────┬─────────────┘
                                               │
                                               ▼
                                  ┌──────────────────────────┐
                                  │  V5. PHASE2_GATE         │
                                  │  ─────────────────       │
                                  │                          │
                                  │  Phase 1 result 是       │
                                  │  PASS / PASS_WITH_WARNINGS?│
                                  │  ┌───NO──▶ Phase 2 不适用│
                                  │  │         跳过 P2       │
                                  │  │                       │
                                  │  │  读取 config.yaml:     │
                                  │  │  optimization.enabled? │
                                  │  │  ┌───false──▶ SKIPPED │
                                  │  │  │                    │
                                  │  │  │  --skip-optimization?│
                                  │  │  │  ┌───YES──▶ SKIPPED│
                                  │  │  │  │                 │
                                  │  │  │  │  否则:          │
                                  │  │  │  │  → 进入 V6     │
                                  │  │  │  │                 │
                                  │  │  │  │  SKIPPED 仅当:  │
                                  │  │  │  │  config 禁用 OR │
                                  │  │  │  │  用户显式请求    │
                                  └──┴──┴──┴──┬──────────────┘
                                              │ (应执行 Phase 2)
                                              ▼
                                  ┌──────────────────────────┐
                                  │  V6. PHASE2_EXECUTE      │
                                  │  ─────────────────       │
                                  │                          │
                                  │  ┌────────────────────┐  │
                                  │  │ 6a. CHECKPOINT      │  │
                                  │  │ git stash push -u   │  │
                                  │  │ -m "verify-phase2-  │  │
                                  │  │ checkpoint"         │  │
                                  │  │ 记录 stash hash     │  │
                                  │  │ git stash apply     │  │
                                  │  │ <checkpointRef>     │  │
                                  │  │ 状态: CREATED       │  │
                                  │  └────────┬───────────┘  │
                                  │           │               │
                                  │           ▼               │
                                  │  ┌────────────────────┐  │
                                  │  │ 6b. OPTIMIZER       │  │
                                  │  │ SUBAGENT            │  │
                                  │  │ 第2个 clean-context │  │
                                  │  │ subagent            │  │
                                  │  │ 输入: 代码文件 +    │  │
                                  │  │ spec + design.md    │  │
                                  │  │ 输出:               │  │
                                  │  │ • NO_OPTIMIZATION   │  │
                                  │  │   _NEEDED           │  │
                                  │  │   → NOT_NEEDED      │  │
                                  │  │ • Search/Replace块  │  │
                                  │  │   + score footer    │  │
                                  │  │ • TIMEOUT           │  │
                                  │  │   → ABORTED_UNSAFE  │  │
                                  │  └────────┬───────────┘  │
                                  │           │ (有优化建议)  │
                                  │           ▼               │
                                  │  ┌────────────────────┐  │
                                  │  │ 6c. 应用 + 验证     │  │
                                  │  │ (主 agent)          │  │
                                  │  │                    │  │
                                  │  │ 预验证所有block     │  │
                                  │  │ 拒绝创建/删除/重命名│  │
                                  │  │ 精确匹配 first      │  │
                                  │  │ whitespace-         │  │
                                  │  │ normalized fallback │  │
                                  │  │ 匹配计数必须 = 1    │  │
                                  │  └────────┬───────────┘  │
                                  └───────────┼──────────────┘
                                              │
                                              ▼
                                  ┌──────────────────────────┐
                                  │  V7. P1_SPECULATIVE_FENCE│
                                  │  ─────────────────       │
                                  │                          │
                                  │  重新执行 Phase 1         │
                                  │  completeness/correctness│
                                  │  /coherence 检查         │
                                  │                          │
                                  │  ⚠ 约束:                  │
                                  │  • 不得写回 tasks.md      │
                                  │  • 不得重写 .verify-     │
                                  │    result.json           │
                                  │                          │
                                  │  Subagent 模式:          │
                                  │  → 重建 speculative      │
                                  │    evidence bundle       │
                                  │  → 启动 reviewer subagent│
                                  │  → 主 agent 不得替代判断  │
                                  │                          │
                                  │  Reread 模式:            │
                                  │  → 当前 agent 重读重验    │
                                  └────────────┬─────────────┘
                                               │
                         ┌─────────────────────┼─────────────────────┐
                         │                     │                     │
                    PASS /               FAIL_NEEDS_           FAIL_NEEDS_
                    PASS_WITH_WARNINGS   REMEDIATION           REMEDIATION
                         │               (x1, x2)              (x3)
                         │                     │                     │
                         ▼                     ▼                     ▼
              ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
              │ IMPROVED         │  │ RETRY             │  │ DEGRADED         │
              │                  │  │                   │  │                  │
              │ git stash drop   │  │ 丢弃 speculative  │  │ 丢弃 speculative │
              │ <checkpointRef>  │  │ edits             │  │ edits             │
              │                  │  │ git reset --hard  │  │ 恢复 baseline     │
              │ 状态:            │  │ HEAD              │  │ git stash pop     │
              │ TERMINAL_ACCEPTED│  │ git clean -fd     │  │ <checkpointRef>   │
              │                  │  │ git stash apply   │  │                   │
              │                  │  │ <checkpointRef>   │  │ 状态:             │
              │                  │  │                   │  │ TERMINAL_RESTORED │
              │                  │  │ behaviorRetry++   │  │                   │
              │                  │  │ 全新优化策略       │  │ result =          │
              │                  │  │ → 回到 V6-6b      │  │ PASS_WITH_WARNINGS│
              └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘
                       │                     │                     │
                       │              重试预算耗尽                  │
                       │              (format≥2 |                 │
                       │               match≥2)                    │
                       │                     │                     │
                       │                     ▼                     │
                       │              ┌──────────────────┐         │
                       │              │ TERMINAL_RESTORED │         │
                       │              │ (format/match     │         │
                       │              │  budget exhausted)│         │
                       │              │                   │         │
                       │              │ git stash pop     │         │
                       │              │ → 成功: 保留P1    │         │
                       │              │   结果或升级为    │         │
                       │              │   PASS_WARN       │         │
                       │              │ → 失败:           │         │
                       │              │   ABORTED_UNSAFE  │         │
                       │              └────────┬──────────┘         │
                       │                       │                     │
                       └───────────────────────┼─────────────────────┘
                                               │
                                ┌──────────────┴──────────────┐
                                │                             │
                          恢复成功                       恢复失败
                                │                             │
                                ▼                             ▼
                         DEGRADED                    ABORTED_UNSAFE
                       (安全回滚)                    (无法安全恢复)
                                │                             │
                                │                     保留 stash entry
                                │                     输出手动恢复步骤
                                │                     当前工作区不安全
                                │
                                └──────────────┬──────────────┘
                                               │
                                               ▼
                                  ┌──────────────────────────┐
                                  │  V8. PERSIST             │
                                  │  ─────────────────       │
                                  │  写入 .verify-result.json│
                                  │  • canonical Phase 1     │
                                  │    payload               │
                                  │  • 最终顶层 result       │
                                  │  • optimization 对象:    │
                                  │    - status              │
                                  │    - score               │
                                  │    - attempts[]          │
                                  │    - baseline            │
                                  │    - final               │
                                  │                          │
                                  │  即使失败也持久化         │
                                  │  (供 apply/archive 消费) │
                                  └────────────┬─────────────┘
                                               │
                                               ▼
                                  ┌──────────────────────────┐
                                  │  V9. SEAL                │
                                  │  ─────────────────       │
                                  │  openspec verify seal    │
                                  │  <change-name>           │
                                  │  → 校验结构完整性         │
                                  │  → 校验字段合法性         │
                                  │  → 生成 seal hash         │
                                  │  → SEAL_OK / SEAL_FAIL   │
                                  └────────────┬─────────────┘
                                               │
                                     ┌─────────┴─────────┐
                                     │                   │
                                 SEAL_OK            SEAL_FAIL
                                     │                   │
                                     ▼                   ▼
                              可用于 archive      要求 agent 修复
                              (进入 SYNC/ARCHIVE)  .verify-result.json
```

### VERIFY 重试预算

```
  预算类型          上限      消耗条件                    耗尽行为
  ────────          ────      ────────                    ────────
  formatRetry       2         Search/Replace 块格式错误   终端恢复,
                              (无法解析, 结构非法)        保留 P1 结果
  matchRetry        2         SEARCH 锚点匹配失败          终端恢复,
                              (0匹配 或 多匹配)           保留 P1 结果
  behaviorRetry     3         speculative re-verify       终端恢复,
                              失败 (FAIL_NEEDS_           DEGRADED,
                              REMEDIATION)                result =
                                                          PASS_WITH_WARNINGS
```

### optimization.status 终局状态转移

```
                          Phase 2 入口
                               │
            ┌──────────────────┼──────────────────┐
            │                  │                  │
       config 禁用        subagent 返回       subagent 返回
       或 --skip         NO_OPTIMIZATION     Search/Replace 块
            │                  │                  │
            ▼                  ▼                  ▼
         SKIPPED           NOT_NEEDED       ┌─────────────────┐
         (Phase 2          (无需优化)       │ 应用优化         │
          未执行)                           │ + speculative    │
                                            │ fence            │
                                            └────────┬────────┘
                                                     │
                              ┌──────────────────────┼──────────────────────┐
                              │                      │                      │
                         PASS/PASS_WARN        FAIL (x1, x2)          FAIL (x3)
                              │                      │                      │
                              ▼                      ▼                      ▼
                          IMPROVED           retry (新策略)              DEGRADED
                      (优化已接受)           behaviorRetry++        (3次尝试后
                              │              回到 V6-6b              安全回滚)
                              │                      │                      │
                              │              预算耗尽 (x3)                 │
                              │                      │                      │
                              │                      ▼                      │
                              │              ┌──────────────────┐           │
                              │              │ TERMINAL_RESTORED │           │
                              │              │ git stash pop     │           │
                              │              └────────┬─────────┘           │
                              │                       │                     │
                              │                恢复成功/失败                 │
                              │                       │                     │
                              └───────────────────────┼─────────────────────┘
                                                      │
                                        ┌─────────────┴─────────────┐
                                        │                           │
                                   恢复成功                     恢复失败
                                        │                           │
                                        ▼                           ▼
                                    DEGRADED                  ABORTED_UNSAFE
                                (result =                   (保留 stash entry,
                                 PASS_WITH_WARNINGS)         输出手动恢复步骤)
```

### VERIFY → SYNC/ARCHIVE 转换条件

| 条件 | 必须? | 说明 |
|------|-------|------|
| `.verify-result.json` 存在 | ✅ 是 | 持久化在 change 目录下 |
| `result` = `PASS` 或 `PASS_WITH_WARNINGS` | ✅ 是 | 顶层结果 |
| `optimization.status` 不为 `ABORTED_UNSAFE` | ✅ 是 | Archive compatibility |
| `optimization.status` 终局 | ✅ 是 | SKIPPED / NOT_NEEDED / IMPROVED / DEGRADED |
| seal 校验通过 | ✅ 是 | 结构完整性 |
| tasks.md 所有 checkbox `[x]` | ❌ 否 | 实际由 APPLY 保证，archive 做二次确认 |

---

## 五、SYNC — 详细内部状态转移

```
                          /opsx:sync "<name>" 或 archive 内嵌调用
                                       │
                                       ▼
                    ┌──────────────────────────────────────┐
                    │  S1. ASSESS                          │
                    │  ─────────────────                   │
                    │  assessChangeSyncState()             │
                    │                                      │
                    │  检查 openspec/changes/<name>/specs/ │
                    │  → findSpecUpdates()                 │
                    │  → 发现所有 delta spec → 主spec 映射 │
                    │  → 解析 ADDED/MODIFIED/REMOVED/      │
                    │    RENAMED 操作                      │
                    │                                      │
                    │  检查 openspec/changes/<name>/       │
                    │  opsx-delta.yaml                     │
                    │  → 存在? hasOpsxDelta = true         │
                    │                                      │
                    │  requiresSync =                      │
                    │    hasDeltaSpecs || hasOpsxDelta     │
                    └──────────────────┬───────────────────┘
                                       │
                         ┌─────────────┴─────────────┐
                         │                           │
                    requiresSync               !requiresSync
                         │                           │
                         ▼                           ▼
              ┌──────────────────┐        ┌──────────────────┐
              │  进入 S2         │        │  "No sync        │
              │                  │        │   required."     │
              │                  │        │  跳过 SYNC       │
              └──────────────────┘        └──────────────────┘
                                                  │
                                                  ▼
                                          进入 ARCHIVE
                                       │
                                       ▼
            ┌──────────────────────────────────────────────────┐
            │  S2. PREPARE  (prepareChangeSync)                │
            │  ─────────────────                                │
            │                                                   │
            │  ┌─────────────────────────────────────────┐     │
            │  │ S2a. SPEC_PREPARE (每个 delta spec)      │     │
            │  │                                          │     │
            │  │  对每个 SpecUpdate:                      │     │
            │  │  1. 读取 delta spec 内容 (源)            │     │
            │  │  2. 读取主 spec 内容 (目标, 可能不存在)  │     │
            │  │  3. isDeltaSpecAlreadyApplied()?         │     │
            │  │     → 已应用 → 跳过                      │     │
            │  │  4. parseDeltaSpec() → 获取操作计划      │     │
            │  │  5. 验证: 无同区重复                     │     │
            │  │  6. 验证: 无跨区冲突                     │     │
            │  │  7. buildUpdatedSpec():                  │     │
            │  │     RENAMED → REMOVED → MODIFIED         │     │
            │  │     → ADDED                              │     │
            │  │     保留原始需求顺序                      │     │
            │  │     末尾追加新增                          │     │
            │  │  8. Validator.validateSpecContent()      │     │
            │  │     → 验证重建后的 spec                  │     │
            │  │  9. 生成 PreparedSpecWrite               │     │
            │  └─────────────────────────────────────────┘     │
            │                                                   │
            │  ┌─────────────────────────────────────────┐     │
            │  │ S2b. OPSX_PREPARE (如有 opsx-delta)     │     │
            │  │                                          │     │
            │  │  1. readProjectOpsx() → 当前 OPSX       │     │
            │  │  2. readOpsxDelta() → delta 内容         │     │
            │  │  3. applyOpsxDelta() → 合并             │     │
            │  │  4. validateReferentialIntegrity()       │     │
            │  │  5. validateCodeMapIntegrity()           │     │
            │  │  6. 生成 PreparedOpsxWrite               │     │
            │  └─────────────────────────────────────────┘     │
            │                                                   │
            │  返回 PreparedChangeSync:                         │
            │  • specs: { writes[], totals }                    │
            │  • opsx: PreparedOpsxWrite | null                 │
            └──────────────────────┬───────────────────────────┘
                                   │
                         ┌─────────┴─────────┐
                         │                   │
                    验证通过             验证失败
                         │                   │
                         ▼                   ▼
              ┌──────────────────┐  ┌──────────────────┐
              │  进入 S3         │  │  中止            │
              │                  │  │  不修改任何文件  │
              │                  │  │  变更目录保持    │
              │                  │  │  活跃            │
              └──────────────────┘  └──────────────────┘
                         │
                         ▼
              ┌──────────────────────────────────────┐
              │  S3. APPLY  (applyPreparedChangeSync) │
              │  ─────────────────                   │
              │                                      │
              │  事务性写入 (带回滚):                 │
              │                                      │
              │  1. 先写 OPSX (如在 prepared 中)     │
              │     → writeProjectOpsx(bundle)        │
              │                                      │
              │  2. 再写 SPECS                        │
              │     对每个 PreparedSpecWrite:         │
              │     → 确保目标目录存在               │
              │     → 写入重建后的 spec               │
              │     → 写入失败 → 回滚:                │
              │       • 回滚 OPSX 到原始 bundle       │
              │       • 回滚已写的 spec               │
              │         (恢复或删除)                  │
              │                                      │
              │  返回 AppliedChangeSyncSummary:       │
              │  • specs: 'synced' | 'no-delta'      │
              │  • opsx: 'synced' | 'no-delta'       │
              └──────────────────┬───────────────────┘
                                 │
                                 ▼
                    ┌──────────────────────────────────────┐
                    │  S4. OUTPUT                          │
                    │  ─────────────────                   │
                    │  specs: synced / no-delta            │
                    │  opsx: synced / no-delta             │
                    │  N 个 spec 更新 (M ADDED, K MODIFIED)│
                    │  OPSX: X 节点, Y 关系               │
                    │                                      │
                    │  ⚠ 变更保持活跃 —                    │
                    │    实现完成后 archive                │
                    └──────────────────────────────────────┘
```

### SYNC 幂等性守卫 (`isDeltaSpecAlreadyApplied`)

```
  ADDED:    主 spec 中存在完全相同标准化内容的需求块 → 跳过
  MODIFIED: 主 spec 中存在完全相同标准化内容的需求块 → 跳过
  REMOVED:  需求在主 spec 中已不存在 → 跳过
  RENAMED:  旧名称不存在 且 新名称存在 → 跳过
```

### SYNC → ARCHIVE 转换

SYNC 可以是独立命令，也可以是 ARCHIVE 的内嵌步骤：

```
  扩展模式:  /opsx:sync → 独立执行 → /opsx:archive
  核心模式:  /opsx:archive → 内嵌 sync → 移动目录
```

| 条件 | 必须? | 说明 |
|------|-------|------|
| 所有 delta specs 合并到主 specs | ✅ (如有) | 无 delta 则跳过 |
| OPSX delta 合并到三个 OPSX 文件 | ✅ (如有) | 无 delta 则跳过 |
| 验证通过 (引用+代码映射完整性) | ✅ (如有) | 失败则中止 archive |
| 变更目录仍为活跃状态 | ✅ 是 | 不移动目录 |

---

## 六、ARCHIVE — 详细内部状态转移

```
                          /opsx:archive "<name>" 或 /opsx:archive (交互式)
                                       │
                                       ▼
                    ┌──────────────────────────────────────┐
                    │  AR1. CHANGE_SELECT                  │
                    │  ─────────────────                   │
                    │  名称已提供 → 直接使用                │
                    │  从上下文推断 → 确认                  │
                    │  否则 → openspec list --json         │
                    │        → AskUserQuestion             │
                    │  → 只展示活跃 change (非已归档)      │
                    └──────────────────┬───────────────────┘
                                       │
                                       ▼
                    ┌──────────────────────────────────────┐
                    │  AR2. UNIFIED_FULL_VERIFY_GATE       │
                    │  ─────────────────                   │
                    │                                      │
                    │  构建路径:                            │
                    │  path.join(changeDir,                 │
                    │    '.verify-result.json')            │
                    │                                      │
                    │  ┌─────────────────────────────┐     │
                    │  │ 文件不存在 (MISSING)         │     │
                    │  │ → "No verify result found.  │     │
                    │  │    Executing full verify..." │     │
                    │  │ → 执行完整 verify 合约       │     │
                    │  │   (Phase 1 + Phase 2)       │     │
                    │  │ → 回到 AR2 重新检查          │     │
                    │  └─────────────────────────────┘     │
                    │                                      │
                    │  ┌─────────────────────────────┐     │
                    │  │ 文件存在 → 检查 freshness    │     │
                    │  │                              │     │
                    │  │ FRESH 判定 (ALL 必须满足):   │     │
                    │  │ ☐ tasksFileHash = 当前值     │     │
                    │  │ ☐ evidenceFingerprint =      │     │
                    │  │   当前值                      │     │
                    │  │ ☐ contractVersion = "1.0"    │     │
                    │  │ ☐ gitHeadCommit = 当前HEAD   │     │
                    │  │ ☐ result = PASS 或           │     │
                    │  │   PASS_WITH_WARNINGS         │     │
                    │  │                              │     │
                    │  │ STALE 判定 (ANY 满足):       │     │
                    │  │ ☒ tasksFileHash 不匹配       │     │
                    │  │ ☒ evidenceFiles 缺失/变化    │     │
                    │  │ ☒ evidenceFingerprint 不匹配 │     │
                    │  │ ☒ gitHeadCommit 不匹配       │     │
                    │  │ ☒ contractVersion 缺失/≠1.0  │     │
                    │  │ ☒ result ≠ PASS/PASS_WARN   │     │
                    │  │                              │     │
                    │  │ → STALE: "Verify result is   │     │
                    │  │   stale. Re-executing..."    │     │
                    │  │ → 执行完整 verify 合约       │     │
                    │  │ → 回到 AR2 重新检查          │     │
                    │  └─────────────────────────────┘     │
                    │                                      │
                    │  ┌─────────────────────────────┐     │
                    │  │ FRESH → 检查 archive         │     │
                    │  │         compatibility        │     │
                    │  │                              │     │
                    │  │ optimization 缺失 (legacy):  │     │
                    │  │ → 接受 (向后兼容)            │     │
                    │  │                              │     │
                    │  │ optimization.status =        │     │
                    │  │ ABORTED_UNSAFE:              │     │
                    │  │ → "Verify result is fresh,   │     │
                    │  │    but optimization recovery  │     │
                    │  │    state is unsafe."          │     │
                    │  │ → 硬阻塞! 不得复用!           │     │
                    │  │ → 指示用户手动恢复或重跑     │     │
                    │  │   verify                     │     │
                    │  │ → STOP (保留 change 目录)    │     │
                    │  │                              │     │
                    │  │ optimization.status =        │     │
                    │  │ SKIPPED / NOT_NEEDED /       │     │
                    │  │ IMPROVED / DEGRADED:         │     │
                    │  │ → archive-compatible         │     │
                    │  │ → 复用 verify 结果            │     │
                    │  └─────────────────────────────┘     │
                    │                                      │
                    │  ┌─────────────────────────────┐     │
                    │  │ 复用 或 重跑后:              │     │
                    │  │                              │     │
                    │  │ result = FAIL_NEEDS_         │     │
                    │  │           REMEDIATION:       │     │
                    │  │ → HARD-BLOCK archive         │     │
                    │  │ → 展示 CRITICAL issues       │     │
                    │  │ → 指示用户修复 + 重跑        │     │
                    │  │   /opsx:apply 或 /opsx:verify│     │
                    │  │ → STOP (保留 change 目录)    │     │
                    │  │                              │     │
                    │  │ result = PASS 或             │     │
                    │  │ PASS_WITH_WARNINGS:          │     │
                    │  │ → "Fresh + archive-compatible│     │
                    │  │    verify result accepted"   │     │
                    │  │ → 继续 AR3                   │     │
                    │  └─────────────────────────────┘     │
                    └──────────────────┬───────────────────┘
                                       │ (PASS / PASS_WITH_WARNINGS)
                                       ▼
                    ┌──────────────────────────────────────┐
                    │  AR3. ARTIFACT_CHECK                 │
                    │  ─────────────────                   │
                    │  openspec status --change "<name>"   │
                    │    --json                            │
                    │  → 解析 artifacts[]                  │
                    │  → 检查每个 artifact.status          │
                    │                                      │
                    │  有 artifact 不为 done:              │
                    │  → 显示警告 + 未完成列表             │
                    │  → AskUserQuestion: 仍要继续?       │
                    │  → 用户确认 → 继续 AR4              │
                    │  → 用户拒绝 → STOP                  │
                    └──────────────────┬───────────────────┘
                                       │
                                       ▼
                    ┌──────────────────────────────────────┐
                    │  AR4. TASK_CHECK                     │
                    │  ─────────────────                   │
                    │  读取 tasks.md                       │
                    │  统计: [x] (完成) vs [ ] (未完成)    │
                    │                                      │
                    │  有未完成任务:                        │
                    │  → 显示警告 + 未完成计数             │
                    │  → AskUserQuestion: 仍要继续?       │
                    │  → 用户确认 → 继续 AR5              │
                    │  → 用户拒绝 → STOP                  │
                    │                                      │
                    │  无 tasks 文件 → 无警告继续          │
                    └──────────────────┬───────────────────┘
                                       │
                                       ▼
                    ┌──────────────────────────────────────┐
                    │  AR5. DELTA_SYNC_ASSESS              │
                    │  ─────────────────                   │
                    │                                      │
                    │  检查 delta specs:                   │
                    │  openspec/changes/<name>/specs/      │
                    │  → 存在? 与主 specs 比较             │
                    │                                      │
                    │  检查 OPSX delta:                    │
                    │  openspec/changes/<name>/            │
                    │  opsx-delta.yaml                     │
                    │  → 存在? 与三个 OPSX 文件比较        │
                    │                                      │
                    │  都不存在 → 跳过, 直接 AR6           │
                    │                                      │
                    │  存在 → 执行 sync:                    │
                    │  • 核心模式: 内嵌 reconcile          │
                    │    (assessChangeSyncState →          │
                    │     prepareChangeSync →              │
                    │     applyPreparedChangeSync)         │
                    │  • 扩展模式: 可调用 /opsx:sync       │
                    │    但语义必须一致                    │
                    │                                      │
                    │  sync 准备/验证失败 → 中止 archive   │
                    │  主 specs/OPSX/change 不变           │
                    └──────────────────┬───────────────────┘
                                       │
                                       ▼
                    ┌──────────────────────────────────────┐
                    │  AR6. MOVE_TO_ARCHIVE                │
                    │  ─────────────────                   │
                    │                                      │
                    │  mkdir -p openspec/changes/archive   │
                    │                                      │
                    │  生成目标名:                          │
                    │  YYYY-MM-DD-<change-name>            │
                    │                                      │
                    │  检查目标是否已存在:                  │
                    │  → 是: 报错, 建议重命名/删除         │
                    │  → 否: 继续                          │
                    │                                      │
                    │  mv openspec/changes/<name>          │
                    │     openspec/changes/archive/        │
                    │     YYYY-MM-DD-<name>/               │
                    │                                      │
                    │  (Windows: rename 失败时 fallback    │
                    │   为 copyDirRecursive + rm)          │
                    └──────────────────┬───────────────────┘
                                       │
                                       ▼
                    ┌──────────────────────────────────────┐
                    │  AR7. SUMMARY                        │
                    │  ─────────────────                   │
                    │                                      │
                    │  ## Archive Complete                 │
                    │                                      │
                    │  **Change:** <change-name>           │
                    │  **Schema:** <schema-name>           │
                    │  **Archived to:**                    │
                    │    openspec/changes/archive/         │
                    │    YYYY-MM-DD-<name>/                │
                    │  **Verify Gate:** Fresh PASS or      │
                    │    PASS_WITH_WARNINGS confirmed      │
                    │  **Specs / OPSX:**                   │
                    │    ✓ Synced / No deltas /            │
                    │    Skipped                           │
                    └──────────────────────────────────────┘
                                       │
                                       ▼
                              ┌────────────────┐
                              │   ARCHIVED     │
                              │   (终态)       │
                              └────────────────┘
```

### ARCHIVE 硬阻塞条件 (不可绕过)

```
  阻塞条件                              检测方式                  用户操作
  ────────                              ────────                  ────────
  .verify-result.json 不存在            AR2 文件检查              运行 /opsx:verify
  .verify-result.json STALE             AR2 freshness 判定        运行 /opsx:verify
  optimization.status =                 AR2 archive               手动恢复 checkpoint
    ABORTED_UNSAFE                      compatibility 检查         或重跑 /opsx:verify
  result = FAIL_NEEDS_REMEDIATION       AR2 result 检查            修复 CRITICAL issues
                                                                    + /opsx:apply
                                                                    + /opsx:verify
  归档目标已存在                         AR6 路径检查              重命名或删除已有归档
  sync 准备/验证失败                     AR5 prepareChangeSync     修复 delta specs
                                        失败                      或 OPSX delta
```

---

## 七、完整工作流路径图

```
                              /opsx:propose
                                   │
                                   ▼
                         ┌─────────────────┐
                         │    PROPOSE      │
                         │  (创建工件)      │
                         │  输出:           │
                         │  proposal.md    │
                         │  design.md      │
                         │  specs/*.md     │
                         │  tasks.md       │
                         │  opsx-delta.yaml│
                         └────────┬────────┘
                                  │ applyRequires 全部 done
                                  ▼
                         ┌─────────────────┐
               ┌─────────│     APPLY       │◀──────────────┐
               │         │  (实现任务)      │               │
               │         │  输出:           │               │
               │         │  代码变更        │               │
               │         │  tasks.md [x]   │               │
               │         └────────┬────────┘               │
               │                  │ 所有任务 [x]            │
               │                  ▼                         │
               │         ┌─────────────────┐               │
               │         │    VERIFY       │               │
               │         │  Phase 1: 一致性 │               │
               │         │  Phase 2: 最优性 │               │
               │         │  输出:           │               │
               │         │  .verify-result │               │
               │         │  .json          │               │
               │         └────────┬────────┘               │
               │                  │                         │
               │    ┌─────────────┼─────────────┐           │
               │    │             │             │           │
               │  PASS /    PASS_WITH_    FAIL_NEEDS_       │
               │  (PASS)    WARNINGS      REMEDIATION       │
               │    │             │             │           │
               │    │             │    CRITICAL issues      │
               │    │             │    → tasks.md 回退      │
               │    │             │    → Remediation 清单   │
               │    │             │             │           │
               │    │             │             └───────────┘
               │    │             │          (回到 APPLY 修复)
               │    │             │
               │    └──────┬──────┘
               │           │ optimization.status 终局
               │           │ + seal 通过
               │           ▼
               │  ┌─────────────────┐
               │  │     SYNC        │
               │  │  (合并增量)      │
               │  │  输出:           │
               │  │  specs/ 更新    │
               │  │  project.opsx.* │
               │  │  更新           │
               │  └────────┬────────┘
               │           │ synced / no-delta
               │           ▼
               │  ┌─────────────────┐
               │  │    ARCHIVE      │
               │  │  (归档变更)      │
               │  │  输出:           │
               │  │  archive/       │
               │  │  YYYY-MM-DD-    │
               │  │  <name>/        │
               │  └────────┬────────┘
               │           │
               │           ▼
               │  ┌─────────────────┐
               │  │   ARCHIVED      │
               │  │   (终态)        │
               │  └─────────────────┘
               │
               │  (可选路径: 跳过 sync, 直接 archive)
               │  ┌─────────────────────────────────────┐
               │  │ 无 delta specs + 无 opsx-delta.yaml │
               │  │ → VERIFY → ARCHIVE (sync 步骤跳过) │
               │  └─────────────────────────────────────┘
               │
               └──── 暂停条件 ────┐
                    任务不明确     │
                    设计问题       │
                    错误/阻塞      │
                    用户中断       │
                                  │
                    /opsx:continue 或 /opsx:apply
```

---

## 八、关键工件在各阶段的读写矩阵

```
  工件                   PROPOSE    APPLY     VERIFY    SYNC      ARCHIVE
  ────                   ───────    ─────     ──────    ────      ───────
  proposal.md             W         R         R         -         R
  design.md               W         R         R         -         R
  specs/<cap>/spec.md     W         R         R         R+W       R
  tasks.md                W         R+W       R+W       -         R
  opsx-delta.yaml         W         -         R         R         R
  .verify-result.json     -         R         W         R         R
  project.opsx.yaml       R         R         R         R+W       R
  project.opsx.relations  R         R         R         R+W       R
  project.opsx.code-map   R         R         R         R+W       R
  config.yaml             -         R         R         -         R
  源代码                   -         W         R         -         -

  R = 读取, W = 写入, R+W = 读写, - = 不涉及
```
