## 1. Projection 核心模型

- [x] 1.1 在项目配置层定义 normalized config 与 prompt/runtime projection 的类型结构
- [x] 1.2 为 `docLanguage`、`context`、`rules` 实现白名单 projection 规则，不允许原始 config 全量透传
- [x] 1.3 为 projection 规则增加 surface / artifact / runtime consumer 作用域参数
- [x] 1.4 为 invalid config、缺失字段和默认行为增加单元测试

## 2. Instruction 与 workflow surface 接入

- [x] 2.1 改造 instruction-loader，使 artifact instructions 暴露编译后的 projection bundle，同时保持现有 JSON 输出兼容
- [x] 2.2 将现有 context/rules 注入迁移到 projection pipeline，保留原有格式语义与校验告警
- [x] 2.3 将 docLanguage prompt contract 从分散模板中收敛为 projection-rendered fragment
- [x] 2.4 更新 bootstrap、sync、archive、verify、onboard、explore 等 workflow templates / skills，使会生成或回写 artifact 的 surface 统一消费 prompt projection

## 3. Runtime writer 接入

- [x] 3.1 让 bootstrap candidate spec、review.md、starter README 生成路径消费 runtime projection
- [x] 3.2 将 projection-affecting config fields 纳入 bootstrap fingerprint / stale 判定
- [x] 3.3 让 sync/archive 新 formal spec skeleton 创建路径消费 runtime projection，移除硬编码英文 boilerplate 后门
- [x] 3.4 让 verify remediation write-back 消费 runtime projection，保持 tasks.md 结构 token 不变

## 4. 文档、OPSX 与回归验证

- [x] 4.1 更新用户文档与 agent instructions，说明 config.yaml 是简洁 source of truth，prompt 使用 projection 后的高密度指令
- [x] 4.2 更新 OPSX 相关文件，使 config projection、instruction-loader、workflow templates、bootstrap、sync/archive、verify 的 intent 与实现边界一致
- [x] 4.3 增加 bootstrap、sync/archive、verify、onboard 的 projection 回归测试，覆盖 `docLanguage: 中文` 且保留 `SHALL/MUST` 的场景
- [x] 4.4 增加跨平台路径相关测试，确保新增 projection 与 artifact 写入路径不引入硬编码路径分隔符
