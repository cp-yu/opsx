## Apply Phase 2 Optimization Protocol

The checkpoint is a git commit, not a git stash entry or git tag. Do not create stash or tag checkpoints for apply optimization.

1. Skip Phase 2 only when the user requested `--skip-optimization` or `optimization.enabled: false`; record `SKIPPED` through `openspec verify phase2`.
2. Read `optimization.optRetries` from `openspec/config.yaml`; default to `2`.
3. Before the first optimization attempt, save the Phase 1 baseline:
   ```bash
   git add -A
   git commit -m "wip: opt-checkpoint-r0 (baseline)"
   ```
4. Spawn the optimizer subagent and instruct it to invoke the `openspec-optimizer` skill. The optimizer proposes Search/Replace blocks only; it MUST NOT edit files.
5. **Think before patching**: Read the ponytail tags (delete/stdlib/native/yagni/shrink) and Code Smell annotations on each proposed block. Understand the optimization rationale before proceeding.
6. For each proposed optimization, record pre-patch hashes before editing:
   ```bash
   openspec verify phase2 "<change-name>" --type=optimization --files "<affected-files>" --input '<json>' --json
   ```
7. Apply Search/Replace blocks atomically, then spawn the reviewer subagent for speculative Phase 1 re-verification.
8. On speculative PASS, record verification PASS and save the new successful state before deciding whether to continue:
   ```bash
   git add -A
   git commit -m "wip: opt-r${N} (${description})"
   ```
9. On speculative FAIL, restore the latest commit:
   ```bash
   git reset --hard HEAD
   git clean -fd
   ```
   Record the failed direction in `.verify-result.json`.
10. Each complete proposal + patch + reviewer re-verify loop consumes one `optRetries` budget, whether it passes or fails. Format or Search/Replace matching problems are handled by the main agent and do not consume retry budget.
11. When all attempts finish, keep all `wip: opt-*` commits as audit history.