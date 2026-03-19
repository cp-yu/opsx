# Bootstrap Domain-Map Error Handling TODO

## 背景

在 `ace-tool-rs` 的 `6998380c` 状态中，`openspec bootstrap promote -y` 失败，报错为：

- `Domain 'dom.indexing' has no domain-map file`
- `Domain 'dom.enhancement' has no domain-map file`
- `Domain 'dom.mcp' has no domain-map file`
- `Domain 'dom.integration' has no domain-map file`

实际排查结果是：

- `openspec/bootstrap/domain-map/` 下四个文件都存在
- 问题不是“缺文件”，而是“文件格式不符合当前 bootstrap domain-map schema”
- `OpenSpec` 当前实现把解析失败静默吞掉，最终误报为“没有 domain-map 文件”

## 需要修改的点

### 1. 不要在读取 domain-map 时吞掉解析错误

位置：

- `src/utils/bootstrap-utils.ts`

问题：

- `readBootstrapState()` 在读取 `domain-map/*.yaml` 时，解析失败直接跳过
- 后续状态里只剩“这个 domain 没有 map”这一种假象

原因：

- 这会把“文件存在但 schema 非法”伪装成“文件不存在”
- 错误信息误导用户，排障成本高

### 2. 在 bootstrap state 中显式保留 invalid domain-map 信息

位置：

- `src/utils/bootstrap-utils.ts`

问题：

- 当前 `BootstrapState` 只记录成功解析的 `domainMaps`
- 没有保留失败文件名、失败原因、对应 domain

原因：

- 后续 `status`、`validate`、`review` 都拿不到真实错误上下文
- 没法给出准确错误，也没法区分 missing 和 invalid

### 3. `map_to_review` gate 要区分 missing 和 invalid

位置：

- `src/utils/bootstrap-utils.ts`

问题：

- 当前统一报 `Domain '<id>' has no domain-map file`

原因：

- 这和真实故障不一致
- 应该至少区分：
  - 缺少文件
  - 文件存在但 schema 非法

### 4. `status` 输出要体现 invalid，而不是一律当 unmapped

位置：

- `src/utils/bootstrap-utils.ts`

问题：

- 现在非法 map 和缺失 map 最终都会表现成 `mapped: false`

原因：

- 用户无法从 `status` 判断下一步是“补文件”还是“修格式”
- 状态表达能力太弱，直接影响 bootstrap 可用性

### 5. 上游 gate 不通过时，不应继续刷新 candidate/review

位置：

- `src/utils/bootstrap-utils.ts`

问题：

- `refreshBootstrapDerivedArtifacts()` / `generateReview()` 会在 map 实际无效时继续生成 candidate 和 `review.md`
- 当没有任何有效 map 时，甚至会生成空 candidate

原因：

- 这会制造“流程已接近 promote”的假象
- 用户会看到可勾选 review，但底层 gate 其实根本没过

### 6. `review` 的生成应与 gate 有一致的前提

位置：

- `src/utils/bootstrap-utils.ts`

问题：

- 现在 `review.md` 可以在 domain-map 非法时生成
- 结果出现 `unmapped` 也能被人工勾选通过

原因：

- review 变成了一个可误操作的假界面
- 人工勾选不该掩盖结构化校验失败

### 7. 补回归测试：domain-map 文件存在但 schema 非法

位置：

- `test/cli-e2e/bootstrap-lifecycle.test.ts`
- 可能还需要补 `test/commands/bootstrap.test.ts`

问题：

- 现有测试覆盖了“domain-map 文件被删除”
- 没覆盖“文件存在但内容非法”

原因：

- 这次真实故障路径没有测试保护
- 不补测试，这个问题以后还会回来

## 不该改的点

### 不要放宽 `promote` 的 gate

原因：

- `promote` 在写正式 OPSX 前重新校验 upstream completeness，这个方向是对的
- 真正的问题不是它太严格，而是前面的错误建模和用户反馈太差
- 不能为了“流程看起来顺”就把非法 bootstrap 数据写进正式 OPSX

## 建议的修复目标

修完后应满足：

- 如果 `domain-map` 文件存在但非法，错误消息直接指出“哪个文件非法，为什么非法”
- `status` 能区分 missing / invalid / valid
- `validate` 不再把 invalid 误报为 missing
- 在 map gate 未通过时，不生成误导性的 review/candidate
- 为该场景补 e2e 回归测试
