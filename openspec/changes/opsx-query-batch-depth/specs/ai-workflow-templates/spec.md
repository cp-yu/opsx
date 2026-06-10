# ai-workflow-templates Delta

## MODIFIED Requirements

### Requirement: Impact sweeper evidence collection
`openspec-impact-sweeper` SHALL ground impact discovery in OPSX before broad code search. It SHALL obtain OPSX node data through a single batch invocation of `openspec opsx query <node-id...> --json` covering all plausible node IDs, defaulting to `--depth 1` and using `--depth 2` only when a first-hop node is shared infrastructure, cross-domain, or code search shows outward runtime use. It SHALL NOT read `openspec/project.opsx.yaml`, `openspec/project.opsx.code-map.yaml`, or `openspec/project.opsx.relations.yaml` directly.

The sweeper SHALL use `git ls-files` as the repository search boundary when available and SHALL exclude `openspec/changes/archive/**`. It SHALL perform repo-wide reverse search for mapped project terms, exported symbols, workflow/skill names, command names, config keys, template fragment names, and path references. It SHALL not rely only on OPSX code-map paths.

#### Scenario: OPSX first then reverse search
- **WHEN** the concept maps to an OPSX capability
- **THEN** the sweeper SHALL read matching OPSX node intent, code-map refs, and direct relations from the batch query output
- **AND** SHALL perform repo-wide reverse search for key mapped project terms and symbols
- **AND** SHALL classify relevant targets into `mustChange`, `mustCheck`, `coverageGaps`, or `questions`

#### Scenario: depth 展开判据
- **WHEN** 批量查询返回的一跳邻居属于共享基础设施、跨域节点，或代码搜索显示存在外向运行时使用
- **THEN** the sweeper SHALL 改用 `--depth 2` 重新批量查询以覆盖二跳邻居
- **AND** MUST NOT 通过逐节点连环 `openspec opsx query` 调用模拟多跳展开

#### Scenario: Multiple term mappings are explored
- **WHEN** a user term maps plausibly to multiple project terms
- **THEN** the sweeper SHALL search all plausible mappings
- **AND** SHALL record mappings and evidence in `termMappings`
- **AND** SHALL put scope-changing ambiguity into `questions`

#### Scenario: Optional change artifacts are scoped
- **WHEN** `optionalChangeName` is provided
- **THEN** the sweeper SHALL read only that change's proposal, specs, design, tasks, and opsx-delta if they exist
- **AND** SHALL NOT inspect unrelated active changes
