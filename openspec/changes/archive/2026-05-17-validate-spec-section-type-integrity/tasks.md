## 1. Actions

- [x] A1 在 `src/core/validation/validator.ts` 的 `validateChangeDeltaSpecs()` 中增加主 spec 交叉验证逻辑：对每个 change spec，通过 `path.resolve(changeDir, '../../specs')` 定位主 spec 目录，读取对应主 spec 并用 `extractRequirementsSection()` 提取 header 列表，对 MODIFIED/REMOVED 检查 header 存在、对 ADDED 检查 header 不存在、对 RENAMED 检查 FROM header 存在，使用 `normalizeRequirementName()` 做匹配
- [x] A2 在 `test/core/validation/` 中增加测试用例，覆盖：MODIFIED header 不存在报 ERROR、ADDED header 已存在报 ERROR、REMOVED header 不存在报 ERROR、RENAMED FROM 不存在报 ERROR、主 spec 不存在时 MODIFIED 报 ERROR、主 spec 不存在时 ADDED 通过、header 大小写不敏感匹配

## 2. Checks

- [x] C1 验证 MODIFIED header 不存在于主 spec 时报 ERROR
  - Covers: A1, A2
  - Command: `pnpm test -- --grep "MODIFIED.*not found|cross.*check"`
  - Expect: 测试通过，验证 MODIFIED 引用不存在的 header 时产生 ERROR 级别 issue

- [x] C2 验证 ADDED header 已存在于主 spec 时报 ERROR
  - Covers: A1, A2
  - Command: `pnpm test -- --grep "ADDED.*already exists|cross.*check"`
  - Expect: 测试通过，验证 ADDED 引用已存在的 header 时产生 ERROR 级别 issue

- [x] C3 验证 REMOVED/RENAMED header 不存在于主 spec 时报 ERROR
  - Covers: A1, A2
  - Command: `pnpm test -- --grep "REMOVED.*not found|RENAMED.*not found|cross.*check"`
  - Expect: 测试通过

- [x] C4 验证主 spec 不存在时 ADDED 合法、MODIFIED 报 ERROR
  - Covers: A1, A2
  - Command: `pnpm test -- --grep "main spec.*not exist|cross.*check"`
  - Expect: 测试通过，ADDED 无 ERROR，MODIFIED 有 ERROR

- [x] C5 验证 normalizeRequirementName 大小写不敏感匹配
  - Covers: A1, A2
  - Command: `pnpm test -- --grep "case.insensitive|normalize|cross.*check"`
  - Expect: 测试通过，大小写不同的 header 视为匹配

- [x] C6 验证现有测试套件无回归
  - Covers: A1
  - Command: `pnpm test`
  - Expect: 所有测试通过

- [x] C7 验证 `openspec validate --type change` 集成行为
  - Covers: A1
  - Command: 构造一个包含 MODIFIED 引用不存在 header 的 change spec，运行 `npx openspec validate "test-change" --type change --json`
  - Expect: JSON 输出包含 ERROR 级别 issue，message 包含 requirement 名称和修复建议
