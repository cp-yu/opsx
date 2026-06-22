---
capabilities:
  - cap.apply.preflight-scan
---

# apply-preflight-scan Specification

## Purpose
定义 apply 执行前对 tasks.md 的一致性预检行为，在 TDD 循环启动前暴露 task 间矛盾和依赖顺序问题。

## ADDED Requirements

### Requirement: Task 间矛盾检测

apply-change skill SHALL 在完成 OPSX 导航（Step 5）之后、Branch Isolation 之前，扫描 tasks.md 全部 task 的 Goal、Files、Requirements 和 Checks，检测不同 task 对同一文件或接口的互斥声明，以及 task 声明与 change-local specs 或 design.md 的冲突。

#### Scenario: 检测到 task 间文件声明互斥

- **WHEN** Task A 的 Files 声明对某文件执行 Create，而 Task B（非 A 的后继）的 Files 也声明对同一文件执行 Create
- **THEN** 系统 SHALL 将此标记为矛盾 finding
- **AND** 系统 SHALL 在扫描完成后一次性呈现所有 findings 给用户

#### Scenario: 检测到 task 需求与 spec 冲突

- **WHEN** Task 的 Requirements 或 Check 的 Verifies 描述的行为与对应 change-local spec 的 requirement 矛盾
- **THEN** 系统 SHALL 将此标记为矛盾 finding

#### Scenario: 扫描干净时无声继续

- **WHEN** pre-flight scan 未检测到任何矛盾或依赖顺序问题
- **THEN** 系统 SHALL 无声继续进入 Branch Isolation 步骤
- **AND** 系统 SHALL NOT 向用户报告"扫描通过"

### Requirement: Task 依赖顺序检测

apply-change skill SHALL 检测 task 间的隐式依赖顺序问题：当 Task N 的 Files 中包含 Modify 或 Delete 某文件，而该文件由执行顺序在后的 Task M（M > N）的 Files Create 声明产生时，标记为依赖顺序问题。

#### Scenario: 检测到前序 task 依赖后序 task 的产出

- **WHEN** Task N（N < M）的 Files 声明 Modify 或 Delete 某路径，该路径由 Task M 的 Files 声明 Create
- **THEN** 系统 SHALL 将此标记为依赖顺序 finding
- **AND** finding SHALL 包含涉及的两个 task 编号和文件路径

#### Scenario: 用户决策后继续执行

- **WHEN** pre-flight scan 呈现 findings 给用户
- **THEN** 系统 SHALL 等待用户决策（修改 tasks.md 或确认忽略）
- **AND** 用户确认后系统 SHALL 继续进入 Branch Isolation
