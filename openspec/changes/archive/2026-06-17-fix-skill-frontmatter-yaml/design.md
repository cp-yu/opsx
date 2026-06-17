## Context

`generateSkillContent()` 负责为所有 skill 模板生成 `SKILL.md` frontmatter。当前实现直接拼接字符串字段，`openspec-snack` 的 description 中包含 `sync:`，会被 YAML plain scalar 规则解析为映射分隔符并导致 skill 加载失败。

## Goals / Non-Goals

**Goals:**
- 保证所有由 `generateSkillContent()` 输出的字符串 frontmatter 字段都是合法 YAML。
- 保持 skill body、workflow 模板内容和安装管线语义不变。
- 让测试校验 YAML 语义，而不是锁死未加引号的序列化格式。

**Non-Goals:**
- 不引入新的 YAML 生成库或重写 skill 生成流程。
- 不修改各 workflow skill instructions 的正文。
- 不处理现有 explore template 断言与模板文案不一致的问题。

## Decisions

- 在 `generateSkillContent()` 所在模块内增加最小 `escapeYamlString()` helper，对反斜杠、双引号、LF、CR 做双引号 YAML 字符串转义。
- 所有 frontmatter 字符串字段统一输出为双引号字符串。这样比按字符条件选择是否加引号更简单，输出也更可预测。
- init/update/snack 相关测试改为解析 frontmatter 后断言字段值，减少对 YAML 表面格式的耦合。
- parity 测试只更新 `generateSkillContent()` 输出 hash；不更新 workflow template payload hash，因为本次改动不改变模板函数 payload。

## Risks / Trade-offs

- [Risk] 生成的 `SKILL.md` frontmatter 外观从 plain scalar 变为双引号字符串 → Mitigation: YAML 语义不变，并通过 init/update/snack 测试覆盖。
- [Risk] 手写转义逻辑遗漏 YAML 字符串边界 → Mitigation: 覆盖冒号、双引号和换行场景；字段范围限制为单行 frontmatter string values。
- [Risk] 全量测试仍受无关 explore template 断言失败影响 → Mitigation: 保持该问题不在本 change 中修改，并在验证结果中单独报告。
