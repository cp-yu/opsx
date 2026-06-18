## MODIFIED Requirements

### Requirement: 幂等性

`openspec sync` SHALL 保持幂等性，重复执行不得引入额外差异。对于只包含 `## REMOVED Requirements` 的 delta，当该 delta 声明的所有 requirement headers 都已从主 spec 缺失时，系统 SHALL 将该 spec delta 视为已经同步；主 spec 中仍存在的无关 requirements SHALL NOT 使该 removal-only delta 重新变为 pending。

#### Scenario: 重复执行产生相同结果
- **GIVEN** 已对某 change 执行过一次 sync
- **WHEN** 再次对同一 change 执行 sync
- **THEN** 主 specs 和 OPSX 文件内容与首次同步后完全一致

#### Scenario: removal-only delta 的目标 headers 已缺失
- **GIVEN** change spec 只包含 `## REMOVED Requirements`
- **AND** 主 spec 文件仍存在
- **AND** delta 声明的所有 requirement headers 都已从主 spec 缺失
- **AND** 主 spec 仍包含无关 requirements
- **WHEN** 用户再次执行 `openspec sync <change-name>`
- **THEN** sync SHALL treat that spec delta as already synced
- **AND** SHALL NOT attempt to remove those headers again
- **AND** SHALL NOT throw `REMOVED failed`

#### Scenario: removal-only delta 清空 spec 后重复执行
- **GIVEN** change spec 只包含 `## REMOVED Requirements`
- **AND** 首次 sync 删除了主 spec 中最后一个 requirement
- **AND** 主 spec 文件已被删除
- **WHEN** 用户再次执行 `openspec sync <change-name>`
- **THEN** sync SHALL treat that spec delta as already synced
- **AND** SHALL NOT recreate an empty main spec file
