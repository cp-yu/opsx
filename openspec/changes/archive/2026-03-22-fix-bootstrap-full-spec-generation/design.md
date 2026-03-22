## 背景

当前 bootstrap 语义在仓库内部是一致的，但与目标产品合同不一致。

目前，`raw + full` 只会写入正式 OPSX 三文件以及一个 starter `openspec/specs/README.md`，而 `opsx-first` 只写正式 OPSX，并把 specs 完全留到后续再补。这一行为已经被运行时、CLI 指令、文档、工作流模板和测试共同固化：

- `src/utils/bootstrap-utils.ts` 里的 `writeBootstrapSpecStarter()` 只会创建 README starter
- `src/commands/bootstrap.ts` 把 `raw` 基线下的 `full` 描述成 starter-spec 行为
- `docs/opsx-bootstrap.md` 与 `src/core/templates/workflows/bootstrap-opsx.ts` 也记录了相同合同

但本次需要的合同是这样：

- `raw + full` **必须** 生成正式 OPSX 和完整合法 specs
- `raw + opsx-first` **必须** 生成正式 OPSX，并且只生成一个 starter 文件：`openspec/specs/README.md`
- `specs-based + full` **必须** 保留现有 specs、仅补缺失 capability 的 spec，并在目标路径冲突时立即失败

## 目标 / 非目标

**目标：**

- 让 `full` 为每个 candidate capability 生成一个合法正式 `spec.md`
- 保持 `opsx-first` 作为 canonical 模式名
- 让 candidate specs 成为 bootstrap 的一等产物，并纳入 validate / review / fingerprint / stale 流程
- 在 `specs-based + full` 下保留现有 specs
- 保持所有合同面一致：CLI、文档、工作流模板、specs 与测试
- 保持生成 spec 路径的跨平台行为正确

**非目标：**

- 不把 `opsx-first` 重命名为 `opsx-only`
- 不引入一条脱离 bootstrap candidate/review 流程、只在 promote 时生成 spec 的旁路
- 不在 `specs-based` 仓库里自动 merge 或重写用户已有 spec
- 不把 bootstrap 扩展成一个泛化的 spec 编写助手；它只消费显式定义的 bootstrap source model

## 决策

### 1. Canonical 模式名保持为 `opsx-first`

CLI、元数据和状态输出继续使用 `opsx-first` 作为 canonical 模式名。

兼容性规则：

- 历史磁盘值 `seed` 继续归一化为 `opsx-first`
- 不引入新的公开 canonical 名称
- 更新后的文档与输出只描述 `full` 与 `opsx-first`

### 2. `opsx-first` 写入 OPSX + README-only starter

`opsx-first` 是面向 raw 仓库的窄路径：先得到正式 OPSX，行为 specs 留待后续补充。

promote 成功后的输出约束：

- 写入正式 OPSX 三文件
- 允许且仅允许创建 `openspec/specs/README.md` 作为 starter 指引
- 不写入任何 `openspec/specs/<capability>/spec.md`
- 不创建任何空 capability 目录

### 3. `full` 必须产出完整合法 specs

对于 `raw + full`，bootstrap 成功不再只是 OPSX 生成成功。

最低合同：

- 每个将被 promote 的 candidate capability 都必须映射到一个正式 spec 文件
- 每个生成 spec 都必须满足仓库现有 spec validator 合同
- candidate specs 必须在 promote 之前可见，并作为 bootstrap review 的一部分被审核

这直接排除了“只在 `promoteBootstrap()` 内最终生成 spec”这种实现方式。

### 4. Candidate specs 成为 bootstrap 的一等产物

当前 bootstrap 只把 OPSX 当成 candidate output。这对新的 `full` 合同是不够的。

设计上需要把 bootstrap derived artifacts 扩展为同时包含：

- candidate OPSX bundle
- candidate specs tree

建议的 workspace 结构：

```text
openspec/bootstrap/
  candidate/
    project.opsx.yaml
    project.opsx.relations.yaml
    project.opsx.code-map.yaml
    specs/
      <capability-folder>/
        spec.md
```

要求：

- `openspec bootstrap validate` 必须同时刷新 candidate OPSX 与 candidate specs
- 只要 candidate OPSX 或 candidate specs 任一变化，review state 就必须变 stale
- review 输出不仅要覆盖 domain review，也要覆盖 candidate spec 的完整性与合法性

### 5. Bootstrap source model 必须显式包含 spec-generation 数据

当前 domain-map 数据不足以合成合法 spec。它只有 capability ID 和 intent，没有 requirement / scenario 结构。

因此 bootstrap 必须新增一套显式、结构化的 spec-generation source model。实现上可以二选一：

- 扩展 `domain-map/*.yaml`
- 或新增专用 bootstrap artifact，例如 `spec-map/*.yaml`

但无论采用哪种表示，都必须足以确定性地生成合法 spec。

每个 capability 最少需要的 source 字段：

- 稳定的 capability ID
- 稳定的 spec folder mapping 输入
- purpose 文本
- 一个或多个 requirements
- 每个 requirement 下足以渲染合法 spec 的 scenario 定义

这些 source data 必须纳入 source fingerprint 计算。

### 6. `specs-based + full` 采用 preserve-only 语义

当仓库已经存在真实 specs 时：

- 现有 spec 文件保持不变
- bootstrap 只允许为尚未存在 spec 文件的 capability 生成正式 spec
- 如果 bootstrap 解析出的目标 spec 路径已存在，则必须 fail-fast，而不是 merge 或 overwrite

这样可以避免 bootstrap 静默改写用户手工维护的行为合同。

### 7. Promote 只写入经过审核的 candidate artifacts

`promoteBootstrap()` 不应在写入时临时发明新内容。

规则：

1. 在最终 gate 校验前刷新 derived artifacts
2. 在任何正式写入开始前校验 candidate OPSX 与 candidate specs
3. 正式输出只能来自已经审核过的 candidate artifacts
4. 只要任一 candidate spec 非法，promote 就必须在正式写入前失败

### 8. Fingerprint 与 stale detection 必须覆盖 specs

当前 stale detection 只反映 OPSX source/candidate 的变化。一旦 bootstrap 开始生成 specs，这就不正确了。

所需行为：

- 任何会改变 candidate spec 内容的 source 变动，都必须改变 candidate fingerprint
- 即使 candidate OPSX 不变，只要 candidate specs 变化，review 也必须变 stale
- 在 source state 不变时重复刷新 candidate，输出必须保持字节级稳定

### 9. 所有合同面必须一起更新

这次变更的合同面很广。以下内容必须保持语义一致：

- `src/commands/bootstrap.ts`
- `src/utils/bootstrap-utils.ts`
- completions / CLI command definitions
- `schemas/bootstrap/schema.yaml`
- `schemas/bootstrap/templates/*.md`
- `src/core/templates/workflows/bootstrap-opsx.ts`
- `docs/opsx-bootstrap.md`
- 与 bootstrap 相关的 OpenSpec specs
- unit / integration / e2e / PBT 覆盖

任何一个面都不能继续把 `raw + full` 描述成 README-only starter generation。

## 数据模型方向

实现需要引入一个确定性的 capability-to-spec-folder 映射规则。

约束：

- 映射在 refresh / validate / promote 之间必须稳定
- 映射必须跨平台安全，并复用现有 path utilities
- 在正式写入前必须能检测映射冲突
- candidate generation、formal write、stale check 与测试必须使用同一套映射规则

## 验证策略

### 单元验证

- mode normalization 与 allowed-mode 合同
- 基于 bootstrap source model 的 candidate spec 组装
- candidate fingerprint 稳定性与 stale 转换
- preserve-only 冲突检测
- POSIX 与 Windows 风格输入下的路径映射稳定性

### 集成验证

- `bootstrap validate` 同时重新生成 candidate OPSX 与 candidate specs
- 非法 candidate spec 会阻断 review / promote 流程
- review 重新生成时能正确反映 spec 变化并转 stale

### 端到端验证

- `raw -> full` 写入正式 OPSX 与合法行为 specs
- `raw -> opsx-first` 写入正式 OPSX 与 README-only starter
- `specs-based -> full` 保留现有 specs、仅补缺失，并在路径冲突时失败

### 性质测试验证

- `full` 下每个 candidate capability 恰好对应一个正式 spec
- `opsx-first` 下不存在行为级 spec
- 任何影响 spec 文本的 source 变化都会使 review stale
- source 不变时重复 refresh，输出字节级稳定
- 对已有 specs 存在重叠时，preserve-only 行为保持确定性

## 风险 / 权衡

**风险：bootstrap source model 扩张**
增加 requirement / scenario 等结构化输入，会提升 bootstrap workspace 复杂度。
→ 缓解：source schema 保持显式且最小，不依赖 promote 时的临场推断。

**风险：合同面爆炸半径大**
文档、模板、测试和 help text 当前都编码了旧语义。
→ 缓解：在同一个 change 中统一更新全部合同面，并通过文本/assertion 测试强约束。

**风险：promote 过程中出现部分写入**
如果先写入正式 OPSX，后续 spec 输出失败，仓库会进入不一致状态。
→ 缓解：在正式写入前先校验全部 candidate artifacts，并保持 promote 写入顺序确定。

**风险：生成 spec 的路径冲突**
多个 capability 可能映射到同一个 spec folder。
→ 缓解：映射规则必须确定，并在写入前 fail-fast。

## 落地顺序

1. 重定义 `full` 与 `opsx-first` 的 bootstrap 合同
2. 增加用于 spec generation 的结构化 bootstrap source data
3. 增加 candidate specs 的生成与校验
4. 扩展 fingerprint / review / stale 机制以覆盖 specs
5. 更新 promote，使其写入已审核 candidate specs
6. 实现 `specs-based + full` 的 preserve-only 冲突处理
7. 更新文档、工作流模板、completions 与 OpenSpec specs
8. 增加 unit、integration、e2e、PBT 与跨平台路径覆盖
