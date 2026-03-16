## 1. 配置 schema 与加载

- [x] 1.1 扩展项目配置解析与类型定义，支持顶层 `docLanguage` 字段
- [x] 1.2 为有效、缺失和无效的 `docLanguage` 值补充校验与回退测试覆盖
- [x] 1.3 更新配置相关文档或 schema 描述，明确 `docLanguage` 表示 OpenSpec 文档自然语言正文的语言

## 2. Init 流程与配置生成

- [x] 2.1 为 `openspec init` 增加交互式文档语言输入
- [x] 2.2 在首次初始化和 extend mode 更新时，将采集到的值写入 `openspec/config.yaml`
- [x] 2.3 增加或更新 `docLanguage` 相关的交互式配置生成测试

## 3. Workflow 指令与模板使用

- [x] 3.1 更新共享 OpenSpec workflow / agent instructions，要求在生成或更新 artifact 前读取 `openspec/config.yaml`
- [x] 3.2 确保指令文档明确说明：AI 必须按现有模板结构填写内容，并仅将 `docLanguage` 应用于自然语言正文
- [x] 3.3 保持 IDs、schema keys、协议性关键词和模板标题等结构化 token 的 canonical 形式不变

## 4. 验证

- [x] 4.1 增加覆盖 `docLanguage` 行为的 agent-instruction guidance 或生成文档测试
- [x] 4.2 运行相关 config、init 和 workflow 测试集，验证新契约端到端成立
- [x] 4.3 验证配置和 init 更新后，跨平台路径相关行为保持不变
