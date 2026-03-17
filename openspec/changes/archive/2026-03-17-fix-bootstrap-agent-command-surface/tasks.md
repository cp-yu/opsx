## 1. 命令 slug 模型

- [x] 1.1 为生成的 agent commands 添加共享的 workflow→command slug 映射，保留 `bootstrap-opsx` 作为内部 workflow ID，并将 `bootstrap` 作为外部 command slug
- [x] 1.2 更新命令模板聚合逻辑，使命令元数据同时携带内部 workflow 标识和外部 command slug
- [x] 1.3 更新 command-generation 的类型与生成流程，使输出路径基于外部 command slug 推导，而不是假设 workflow ID 等于文件 basename

## 2. 生成、检测与同步链路

- [x] 2.1 更新 command adapters 与共享生成调用方，使其消费外部 command slug，同时不改变各工具现有的路径约定
- [x] 2.2 刷新 tool detection、migration scanning 和 profile drift checks，使其通过共享 slug 映射识别 bootstrap 命令制品
- [x] 2.3 更新 command cleanup / removal 逻辑，使取消选择的 workflow 能按显式映射后的文件名删除 bootstrap 命令制品，而不是依赖模式推断

## 3. Bootstrap 文档与模板

- [x] 3.1 更新 bootstrap workflow/template 与命令文档，将 `/opsx:bootstrap` 表述为基于 `openspec bootstrap status|init|instructions|validate|promote` 的 CLI-backed workflow
- [x] 3.2 删除陈旧的 bootstrap 文档示例，包括 `--focus`、`--extend --capabilities`、`--extend --relations` 和 `--refresh` 等不受支持的伪参数
- [x] 3.3 在主命令参考文档中加入 `/opsx:bootstrap`，确保 expanded workflow command 可被发现

## 4. 验证覆盖

- [x] 4.1 补充或调整 command generation 单测，验证 bootstrap 产出映射后的外部命令文件名，同时保留内部 workflow 标识
- [x] 4.2 补充或调整 migration、drift-detection 与 cleanup 测试，验证 bootstrap 命令制品可通过显式映射路径被识别和删除
- [x] 4.3 补充或调整 init/update 与跨平台路径测试，包含 Windows 安全路径断言，以及命令制品路径相关的 CI 验证
