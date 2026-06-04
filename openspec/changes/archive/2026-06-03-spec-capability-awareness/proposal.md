<!-- propose-routing: Design Summary found in explore conversation. Proceeding with artifact generation. -->

## Why

Spec 与 capability 之间没有结构化映射。当前 87 个 specs 全部累积在 `openspec/specs/` 下，workflow 模板（propose/apply/sweep）只能靠 LLM 猜测哪些 specs 与当前 capability 相关，导致 apply 漏改 specs、propose 创建冗余 specs、sweep 检测存在盲区。需要建立从 spec 到 capability 的确定性关联，作为后续冗余检测、spec 重构和归档机制的基础设施。

## What Changes

- 在 spec.md 头部引入 YAML frontmatter，声明 `capabilities: [cap.x.y]` 关联
- 新增 Spec Frontmatter Parser，从 spec.md 提取 frontmatter
- 新增 Spec Registry，运行时扫描构建 cap↔spec 双向映射
- 扩展 Validator，新增 frontmatter 校验规则（cap 存在性、frontmatter 缺失 warning）
- 扩展 `openspec spec list --json` 输出，增加 `capabilities` 字段
- 增强 impact-sweeper / propose / apply-change workflow 模板，新增 spec 发现指令

## Capabilities

### New Capabilities
- `spec-frontmatter`: Spec 文件 YAML frontmatter 解析，提取 capabilities 关联声明
- `spec-registry`: 运行时 cap↔spec 双向映射注册表，提供 `getSpecsForCap`、`getCapsForSpec`、`getOrphanedSpecs`、`getUncoveredCaps` 查询 API

### Modified Capabilities
- `cli-spec`: `spec list --json` 输出增加 `capabilities` 字段
- `validate-spec-section-type-cross-check`: 新增 frontmatter cap 存在性校验和 frontmatter 缺失 warning
- `internal-skill-installation`: impact-sweeper skill 指令增加 spec frontmatter 扫描步骤
- `ai-workflow-templates`: propose / apply-change 模板增加 spec 发现指令

## Impact

- **新文件**: `src/core/parsers/spec-frontmatter.ts`、`src/core/spec-registry.ts`
- **修改文件**: `src/core/validation/validator.ts`、`src/commands/spec.ts`、`src/core/templates/workflows/impact-sweeper.ts`、`src/core/templates/workflows/propose.ts`、`src/core/templates/workflows/apply-change.ts`
- **测试文件**: 新增 frontmatter parser 和 registry 单元测试，扩展 validation 和 CLI 集成测试
- **Spec 格式变更**: 非破坏性——无 frontmatter 的 spec 继续正常工作，validation 仅产生 warning
- **依赖**: 无新依赖，使用已有 `yaml` 库
