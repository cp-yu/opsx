## Context

当前 `checkFreshness` 在检测到 STALE 时生成的 `details` 数组仅包含概括性技术描述（如 `evidenceFingerprint does not match current evidence files`）。`formatVerifyGateFailure` 将这些 details 逐行拼接到错误消息末尾。结果是一段纯诊断文本，不包含：

- **具体哪些文件变更了** — 用户需要自行 git diff
- **git HEAD 变更** — 旧值 vs 新值不可见
- **补救操作** — 是重新 verify 还是 `--no-verify` 跳过，用户无从知晓

## Goals / Non-Goals

**Goals:**
- 错误输出中列出指纹不匹配的具体证据文件及其相对路径
- 错误输出中展示 git HEAD 的前后对比
- 错误输出末尾追加可操作的补救指引（`openspec verify phase1 <change> --json` 或 `openspec sync <change> --no-verify`）

**Non-Goals:**
- 不改变 verify gate 的逻辑判定条件
- 不新增 CLI 参数或子命令
- 不自动触发重新 verify

## Decisions

### D1: 在 `checkFreshness` 中生成增强的 details

`details` 从 `string[]` 扩展为结构化的对象，每条 detail 包含 `kind`（`fingerprint` | `head`）、`label`（人类可读描述）和 `diff`（字段级差异）。

实际实现上保持 `details: string[]` 的向后兼容性，但生成时包含更多信息：
- fingerprint 不匹配 → `"evidenceFingerprint mismatch — modified files: src/auth/login.ts, src/util/crypto.ts"`
- git HEAD 不匹配 → `"gitHeadCommit changed: 3fd6cd4 → 7a1b9f2"`

### D2: 重写 `formatVerifyGateFailure` 输出结构

新结构（从上到下）：
```
✗ Verify gate failed — 自上次验证以来以下内容已变更

  证据文件指纹不匹配:
    - src/auth/login.ts
    - src/util/crypto.ts

  Git HEAD:
    3fd6cd4 → 7a1b9f2

  建议操作:
    openspec verify phase1 <change-name>  # 重新验证
    openspec sync <change-name> --no-verify  # 跳过门禁 (风险自负)
```

### D3: 获取指纹差异信息的方式

在 `checkFreshness` 中当 `evidenceFingerprint` 不匹配时，对 `evidenceFiles` 逐个重算 hash，与 `.verify-result.json` 中记录的 `evidenceFingerprint.entries` 做对比，找出 hash 不同的文件。性能开销可接受（evidenceFiles 通常是个位数到十几个）。

## Risks / Trade-offs

- **指纹差异计算的额外 I/O**: 每个 evidence file 需要重新读取和 hash → 文件数量和大小受限，风险低
- **向后兼容**: `details: string[]` 类型不变，仅内容更丰富；`formatVerifyGateFailure` 签名不变，仅输出变长
- **国际化**: 错误输出为英文 + 中文混合（技术标识符英文，操作指引中文）— 与项目当前 convention 一致