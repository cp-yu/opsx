# Bootstrap Review

在提升为正式 OPSX 文件之前，先审阅当前映射出的架构。

该文件由 evidence.yaml 和 domain-map/*.yaml 派生；任一内容变化后，都需要重新运行 `openspec bootstrap validate` 生成新的 review。

## Refresh Scope

- 策略：full-scan-fallback
- 锚点提交：58b785e2af1fd7982228fd5d9928f7e8ec724ba2
- 原因：变更路径无法可信映射到现有 code-map：temp
- 受影响 domains：（空）
- 保留的基线节点数：99

## Delta Summary

- ADDED：0 个节点，0 条关系
- MODIFIED：0 个节点，0 条关系
- REMOVED：0 个节点，0 条关系
- 保留的基线节点：cap.ai.agent-docs, cap.ai.agent-prompt-guidance, cap.ai.command-generation, cap.ai.command-slugs, cap.ai.explore-brainstorming, cap.ai.impact-sweeper, cap.ai.internal-skill-installation, cap.ai.optimizer-skill, cap.ai.propose-smart-routing, cap.ai.reviewer-cleanliness-dimension, cap.ai.reviewer-skill, cap.ai.skill-generation, cap.ai.subagent-self-read, cap.ai.template-artifact-pipeline, cap.ai.tool-adapters, cap.ai.tool-invocation-references, cap.ai.verify-writeback, cap.ai.workflow-templates, cap.apply.branch-isolation, cap.apply.subagent-orchestration, cap.apply.task-decomposition, cap.apply.verify-integration, cap.archive.branch-merge, cap.artifact-graph.instruction-loader, cap.artifact-graph.parse, cap.artifact-graph.schema-resolution, cap.artifact-graph.state-tracking, cap.change.archive, cap.change.create, cap.change.discovery, cap.change.metadata, cap.change.specs-sync, cap.cli.archive, cap.cli.change, cap.cli.command-reference-consistency, cap.cli.completion, cap.cli.config, cap.cli.feedback, cap.cli.init, cap.cli.init-opsx-skeleton, cap.cli.instructions, cap.cli.list, cap.cli.new-change, cap.cli.opsx-query, cap.cli.schema, cap.cli.schemas, cap.cli.show, cap.cli.spec, cap.cli.status, cap.cli.sync, cap.cli.templates, cap.cli.update, cap.cli.validate, cap.cli.verify-aware-instructions, cap.cli.view, cap.config.apply-default-isolation, cap.config.global, cap.config.migration, cap.config.project, cap.config.schema-validation, cap.opsx.atomic-write, cap.opsx.bootstrap, cap.opsx.bootstrap-backfill-specs, cap.opsx.bootstrap-refresh, cap.opsx.delta-merge, cap.opsx.read-transparent, cap.opsx.referential-integrity, cap.opsx.sharding, cap.opsx.spec-refs-validation, cap.opsx.yaml-operations, cap.schema.fork, cap.schema.init, cap.schema.opsx-delta-artifact, cap.schema.parse, cap.schema.validate, cap.spec.frontmatter, cap.spec.registry, cap.sync.evidence-refresh, cap.validation.change, cap.validation.opsx, cap.validation.opsx-dry-run, cap.validation.spec, cap.validation.spec-section-type-cross-check, cap.verify.cli-gate, cap.verify.enforce-optimizer-invocation, cap.verify.execution-model-selection, cap.verify.freshness-engine, cap.verify.optimize, cap.verify.prompt-orchestration, dom.ai-integration, dom.apply, dom.artifact-graph, dom.change-workflow, dom.cli, dom.config, dom.opsx, dom.schema, dom.validation, dom.verify

## Domain Checklist


## Candidate Specs

- 当前不会写入 candidate spec
- 除非新增 capability 缺少 formal spec，否则现有 formal specs 继续作为唯一真相来源。

## Validation

- [x] Review 内容与当前 candidate 输出一致
- [x] 引用完整性校验通过
- [x] Code-map 中的路径都存在于磁盘上
- [x] Candidate spec 集合符合当前 bootstrap 模式约束
- [x] Refresh delta 与当前 formal OPSX 基线一致
- [x] Candidate spec 通过 OpenSpec 校验
- [x] Domain 边界与预期心智模型一致
