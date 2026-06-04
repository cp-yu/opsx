---
capabilities:
  - cap.cli.spec
---

# cli-spec Specification

## Purpose

此规约记录变更 unify-cli-query-interface 对 `openspec spec` 命令的修改（移除 list 子命令）。

## REMOVED Requirements

### Requirement: Spec Command

**Reason**: 移除了 `openspec spec list` 子命令及其相关场景，功能已迁移到 `openspec list --specs`

**Migration**: 使用 `openspec list --specs --json` 替代。新命令提供相同的 `capabilities` 字段输出，输出格式保持兼容。

**Removed Scenarios**:
- "spec list --json 输出包含 capabilities 字段"
- "spec list 向后兼容"
