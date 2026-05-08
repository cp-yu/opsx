## 1. OPSX Skeleton Generation

- [x] 1.1 在 `InitCommand` 中新增 `writeOpsxSkeleton(projectPath, openspecPath)` 私有方法
- [x] 1.2 在 `writeOpsxSkeleton` 中实现项目名推断逻辑（`package.json` name → 目录 basename 回退）
- [x] 1.3 生成 `project.opsx.yaml` 骨架文件（空 domains/capabilities，含 `project.id` 和 `project.name`）
- [x] 1.4 生成 `project.opsx.relations.yaml` 骨架文件（空 relations）
- [x] 1.5 生成 `project.opsx.code-map.yaml` 骨架文件（空 nodes，含 `generated_at` 时间戳）
- [x] 1.6 在 `execute()` 中 `createDirectoryStructure()` 之后调用 `writeOpsxSkeleton()`，仅在非 extend 模式时执行

## 2. Bootstrap Guidance in Success Output

- [x] 2.1 在 `displaySuccessMessage()` 中获取 active profile 信息，检测 `bootstrap-opsx` workflow 是否在 profile 中
- [x] 2.2 当 bootstrap-opsx 在 profile 中且为首次 init（非 extend 模式）时，在 getting started 区块后输出 `Next: run /opsx:bootstrap to map your architecture`

## 3. Testing

- [x] 3.1 新增测试：首次 init 生成三个 OPSX 骨架文件
- [x] 3.2 新增测试：extend 模式下不覆盖已有 OPSX 文件
- [x] 3.3 新增测试：bootstrap 引导文案在满足条件时显示
- [x] 3.4 新增测试：bootstrap 引导文案在不满足条件时不显示
- [x] 3.5 新增测试：OPSX 骨架文件路径使用 `path.join()` 构造，跨平台安全