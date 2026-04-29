## verify-change.ts Step 10 修改 & Step 11 新增

### 现有 Step 10 的修改

在 Step 10 "Persist Verification Result" 的 JSON schema 中加入 `optimization` 初始占位对象：

```diff
  - Write a JSON object with:
    - `timestamp`: ISO 8601 completion time
    - `result`: `PASS` / `PASS_WITH_WARNINGS` / `FAIL_NEEDS_REMEDIATION`
    - `issues`: the full issue list with severity, requirement, task linkage, and recommendations
    - `tasksFileHash`: hash of the current `tasks.md` contents after any write-back
    - `verificationContext`:
      - `contractVersion`: `"1.0"`
      - `executionMode`: derived from Step 1.5
      - `evidenceFiles`: sorted list of examined files using relative POSIX paths
      - `evidenceFingerprint`: SHA-256 of sorted evidence file path + modification time + size tuples
      - `gitHeadCommit`: current HEAD commit SHA if available
+   - `optimization`: initial placeholder set at Phase 1 completion:
+     - `status`: `"PENDING"` (will be updated by Phase 2 below)
+     - `score`: `null`
+     - `attempts`: `[]`
+     - `baseline`: `null`
+     - `final`: `null`
```

### 新增 Step 11

There are two versions of this step depending on whether the tool supports subagents.

#### Step 11 for subagent-capable tools (Claude Code, Codex)

```
11. **Phase 2: Optimality Check (Optimization)**

   Phase 1 is the canonical conformance gate.
   - Step 8 decides the canonical verification result
   - Step 9 MAY write back CRITICAL remediation to `tasks.md`
   - Step 10 persists the Phase 1 baseline to `.verify-result.json`
   - Step 11 MAY attempt safe optimization, but MUST NOT overwrite the canonical judgment with speculative state

   **11.1 Entry Gate**

   - Run Phase 2 ONLY when the Phase 1 result is `PASS` or `PASS_WITH_WARNINGS`
   - Read `openspec/config.yaml` and treat `optimization.enabled` as `true` when the key is missing
   - If the user supplied `--skip-optimization` flag:
     - Set `optimization.status = "SKIPPED"` in `.verify-result.json`
     - Output: "Phase 2 skipped: optimization disabled by config or CLI flag"
     - Rewrite `.verify-result.json` with the `optimization` object
     - Skip directly to verification complete
   - If Phase 1 result is `FAIL_NEEDS_REMEDIATION`:
     - Output: "Phase 2 skipped: fix CRITICAL issues before optimization can run"
     - Set `optimization.status = "SKIPPED"` in `.verify-result.json`
     - Rewrite `.verify-result.json` with the `optimization` object
     - Skip directly to verification complete
   **11.2 Create Checkpoint**

   - Output: "Creating safety checkpoint for optimization..."
   - Create a checkpoint with:
     ```bash
     git stash push -u -m "verify-phase2-checkpoint"
     ```
   - Immediately capture:
     - `checkpointRef`: the newly created stash reference (normally `stash@{0}`)
     - `checkpointHash`: `git rev-parse --verify <checkpointRef>`
   - If `git stash push` succeeded but `git rev-parse` failed:
     - Run `git stash drop stash@{0}` to clean up the orphaned stash entry
     - Set `optimization.status = "ABORTED_UNSAFE"` in `.verify-result.json`
     - Rewrite `.verify-result.json`
     - Output: "Phase 2 aborted: checkpoint hash capture failed. Verify git repository state"
     - Output: "Checkpoint hash: <checkpointHash>"
     - Output: "Recovery: git reset --hard HEAD && git clean -fd && git stash apply <checkpointRef>"
     - STOP
   - Immediately restore the Phase 1 baseline back into the worktree while keeping the stash entry:
     ```bash
     git stash apply <checkpointRef>
     ```
   - If stash apply fails (e.g., due to merge conflicts):
     - Run `git stash drop <checkpointRef>` to remove the unusable stash
     - Set `optimization.status = "ABORTED_UNSAFE"` in `.verify-result.json`
     - Rewrite `.verify-result.json`
     - Output: "Phase 2 aborted: baseline restoration failed. Verify git repository state"
     - Output: "Checkpoint hash: <checkpointHash>"
     - Output: "Recovery: git reset --hard HEAD && git clean -fd && git stash apply <checkpointRef>"
     - STOP
   - Treat `checkpointHash` as the authoritative recovery token for unexpected exits
   - Output: "Checkpoint created: <checkpointHash>"

   **11.3 Initialize Optimization Tracking**

   - `behaviorRetryCounter = 0` (max 3)
   - `formatRetryCounter = 0` (max 2)
   - `matchRetryCounter = 0` (max 2)
   - `optimization.attempts = []` array to log each subagent invocation
   - `optimization.baseline` = `{ checkpointHash: <checkpointHash>, phase1Result: <Phase 1 top-level result>, timestamp: <ISO 8601> }`
   **11.4 Optimizer Protocol**

${OPTIMIZATION_PROTOCOL_SUBAGENT}

   **11.5 Attempt Loop**

   a) Spawn a clean-context optimizer subagent following the OPTIMIZATION_PROTOCOL_SUBAGENT contract
   b) Pass inputs:
      - Spec files from `specs/`
      - `design.md` if it exists
      - FULL content of all Phase 1 evidence files listed in `verificationContext.evidenceFiles`
      - A short Phase 1 baseline summary: result, warnings, and the rule "behavior MUST NOT change"
      - Do NOT pass the prior `.verify-result.json`
   c) Record this attempt in `optimization.attempts[]` with timestamp and attempt number
   d) Output: "Optimizing: analyzing code quality (attempt <N>/<max>)..."

   **If subagent returns `NO_OPTIMIZATION_NEEDED`:**
   - Set `optimization.status = "NOT_NEEDED"`
   - Set `optimization.score` to the reported quality score
   - Set `optimization.final` = `{ result: "unchanged", reason: "subagent found no optimization opportunities" }`
   - Run: `git stash drop <checkpointRef>` to discard the checkpoint
   - Preserve the Phase 1 top-level `result`
   - Rewrite `.verify-result.json` with the `optimization` object
   - Output: "Phase 2: no improvements found. Code quality is already high (score: <score>/100)"
   - STOP

   **If subagent times out** (no response within 120 seconds):
   - Set `optimization.status = "ABORTED_UNSAFE"`
   - Set `optimization.final` = `{ result: "timeout", reason: "optimizer subagent did not respond within timeout" }`
   - Run: `git stash drop <checkpointRef>` to discard the checkpoint
   - Output: "Phase 2 aborted: optimizer subagent timed out. Phase 1 canonical result preserved"
   - Preserve the Phase 1 top-level `result`
   - Rewrite `.verify-result.json` with the `optimization` object
   - Output: "Checkpoint hash: <checkpointHash>"
   - Output: "Recovery: git reset --hard HEAD && git clean -fd && git stash apply <checkpointRef>"
   - STOP

   **If subagent returns Search/Replace blocks:**

   e) **Format validation pass:**
      - Parse each block: FILE header present, SEARCH/REPLACE delimiters correct, no missing parts
      - Reject any block that proposes file creation, deletion, rename, or targets non-tracked files
      - If format is invalid for ANY block:
        - Increment `formatRetryCounter`
        - Record the failed attempt in `optimization.attempts[]`
        - If `formatRetryCounter < 2`:
          - Output: "Phase 2 attempt <N>: block format error. Requesting corrected blocks..."
          - Log the format error
          - Report back to subagent with explicit format correction instructions
          - Retry from step (a)
        - If `formatRetryCounter >= 2`:
          - Set `optimization.status = "ABORTED_UNSAFE"`
          - Set `optimization.final` = `{ result: "format-exhausted", reason: "format retry budget exhausted after 2 attempts" }`
          - Run: `git stash drop <checkpointRef>` (no changes were made)
          - Output: "Phase 2 aborted: optimizer block format errors exceeded retry budget"
          - Preserve the Phase 1 top-level `result`
          - Rewrite `.verify-result.json` with the `optimization` object
          - Output: "Checkpoint hash: <checkpointHash>"
          - Output: "Recovery: git reset --hard HEAD && git clean -fd && git stash apply <checkpointRef>"
          - STOP

   f) **Match validation pass:**
      - Pre-validate ALL blocks before changing ANY file
      - For each block:
        - Read the explicit target file path; never guess alternate files
        - Confirm the file exists and is tracked
        - Try exact raw-text match for the SEARCH body first
        - If exact match fails, retry with whitespace-normalized matching:
          - Normalize line endings (CRLF to LF)
          - Strip trailing whitespace
          - Normalize indentation consistently for both SEARCH text and candidate file windows
        - Accept the block ONLY if the final match count is exactly 1
      - If ANY block fails pre-validation (0 matches or more than 1 matches):
        - Increment `matchRetryCounter`
        - Record the failed attempt in `optimization.attempts[]`
        - If `matchRetryCounter < 2`:
          - Output: "Phase 2 attempt <N>: block match failed (count: <N>). Requesting corrected blocks with more context..."
          - Log the match failure details (which file, which block, match count)
          - Feed back to subagent with instruction: "Previous blocks failed matching. Use MORE context lines for uniqueness anchors"
          - Retry from step (a)
        - If `matchRetryCounter >= 2`:
          - Set `optimization.status = "ABORTED_UNSAFE"`
          - Set `optimization.final` = `{ result: "match-exhausted", reason: "match retry budget exhausted after 2 attempts" }`
          - Run: `git stash drop <checkpointRef>` (no changes were made)
          - Output: "Phase 2 aborted: block matching failed after retries. Failed suggestions are in .verify-result.json under optimization.attempts."
          - Preserve the Phase 1 top-level `result`
          - Rewrite `.verify-result.json` with the `optimization` object
          - Output: "Checkpoint hash: <checkpointHash>"
          - Output: "Recovery: git reset --hard HEAD && git clean -fd && git stash apply <checkpointRef>"
          - STOP

   g) **Atomic apply:**
      - ALL blocks have passed format and match validation
      - Verify no block targets a file outside the git-tracked set (double-check)
      - Apply all replacements as one atomic batch
      - Use `path.join()` for cross-platform paths when writing files
      - Do NOT leave partially applied optimization edits on disk

   h) **P1 Speculative Fence:**
      - Run Phase 1 re-verification AFTER applying the changes, with EXPLICIT constraints:
        - MUST re-read artifacts and final file contents from disk
        - MUST reuse the same completeness / correctness / coherence rules as Phase 1
        - MUST NOT write back to `tasks.md` (NO task checkbox modification)
        - MUST NOT persist to `.verify-result.json` (NO overwrite of existing result)
        - MUST NOT re-enter Phase 2 (equivalent to running verify with `--skip-optimization`)
        - Execute as `P1_SPECULATIVE_FENCE` — a lightweight spec validation only

        **Implementation Note**: Implement by wrapping the Phase 1 assessment logic
        with a mode parameter (`P1_CANONICAL` vs `P1_SPECULATIVE_FENCE`).
        When mode is `P1_SPECULATIVE_FENCE`:
        - Assert no calls to the write-back function that modifies tasks.md
        - Assert no calls to the persist function that writes .verify-result.json
        - Forward the --skip-optimization flag to prevent Phase 2 re-entry
        See design.md Decision 3 for the full rationale.
      - Treat the attempt as behavior-safe ONLY if the speculative result:
        - Does NOT introduce new CRITICAL issues
        - Does NOT regress to `FAIL_NEEDS_REMEDIATION`
        - A result of `PASS` or `PASS_WITH_WARNINGS` is acceptable
      - **If re-verify PASS (behavior-safe):**
+       - Output: "Re-verifying optimization changes..."
        - Verify `git rev-parse --verify <checkpointRef>` still matches `checkpointHash`
        - If it matches, run: `git stash drop <checkpointRef>` (commit optimization)
        - If it does NOT match:
          - Run `git stash drop <checkpointRef>` to ensure the stash is cleaned up
          - Set `optimization.status = "ABORTED_UNSAFE"`, rewrite `.verify-result.json`
          - Output: "Phase 2 aborted: checkpoint hash mismatch after re-verify PASS"
          - Output: "Checkpoint hash: <checkpointHash>"
          - Output: "Recovery: git reset --hard HEAD && git clean -fd && git stash apply <checkpointRef>"
          - STOP
        - Set `optimization.status = "IMPROVED"`
        - Set `optimization.score` to the accepted quality score
        - Set `optimization.final` = `{ result: "improved", score: <score>, applied_blocks: <count> }`
        - Output:
          ```
          Phase 2 Optimization Summary
            Status:   IMPROVED
            Score:    <score>/100
            Strategy: <strategy>
            Changes:  <N> files, <M> lines modified
          ```
        - Preserve the Phase 1 top-level `result`
        - Rewrite `.verify-result.json` with the final `optimization` object
        - STOP
      - **If re-verify FAIL (would be FAIL_NEEDS_REMEDIATION):**
        - Discard speculative edits completely and restore the Phase 1 baseline from the checkpoint:
          ```bash
          git reset --hard HEAD
          git clean -fd
          git stash apply <checkpointRef>
          ```
        - Verify `git rev-parse --verify <checkpointRef>` still matches `checkpointHash`
        - If it does NOT match:
          - Run `git stash drop <checkpointRef>` to ensure the stash is cleaned up
          - Set `optimization.status = "ABORTED_UNSAFE"`, rewrite `.verify-result.json`
          - Output: "Phase 2 aborted: checkpoint hash mismatch during rollback"
          - Output: "Checkpoint hash: <checkpointHash>"
          - Output: "Recovery: git reset --hard HEAD && git clean -fd && git stash apply <checkpointRef>"
          - STOP
        - Increment `behaviorRetryCounter`
        - Record the failed attempt in `optimization.attempts[]` with:
          - Error category: "behavior"
          - Strategy used: <strategy from subagent JSON footer>
          - Re-verify result: <PASS / PASS_WITH_WARNINGS / FAIL_NEEDS_REMEDIATION>
          - Re-verify CRITICAL issues: <first CRITICAL issue message, or "regression detected" if none>
        - If `behaviorRetryCounter < 3`:
          - Output: "Phase 2 attempt <N>/3: optimization caused regression. Rolled back. Trying new strategy..."
          - Request a COMPLETELY different optimization strategy from the subagent
          - Retry from step (a)
        - If `behaviorRetryCounter >= 3`:
          - Keep the restored Phase 1 baseline (code is already rolled back)
          - Set `optimization.status = "DEGRADED"`
          - Set `optimization.final` = `{ result: "degraded", reason: "behavior retry budget exhausted after 3 attempts", score: <best_score> }`
          - Output:
            ```
            Phase 2 Optimization Summary
              Status:   DEGRADED
              Phase 1 canonical result preserved
              3 optimization attempts safely reverted

              Attempt 1: <strategy> -> <re-verify result>: <first CRITICAL issue summary>
              Attempt 2: <strategy> -> <re-verify result>: <first CRITICAL issue summary>
              Attempt 3: <strategy> -> <re-verify result>: <first CRITICAL issue summary>
            ```
          - If Phase 1 result was `PASS`, widen to `PASS_WITH_WARNINGS`
          - If Phase 1 result was already `PASS_WITH_WARNINGS`, keep as-is
          - Rewrite `.verify-result.json` with the final `optimization` object
          - STOP

   **11.6 Finalize Optimization Result**

   After exiting the optimization loop:
   - Step 10 created the canonical Phase 1 baseline file
   - Step 11 MUST rewrite that same `.verify-result.json` path before returning
   - The final JSON MUST preserve the existing Step 10 fields and add:
     - `optimization.status`: `SKIPPED` | `NOT_NEEDED` | `IMPROVED` | `DEGRADED` | `ABORTED_UNSAFE`
     - `optimization.score`: accepted optimizer score or `null`
     - `optimization.attempts[]`: ordered attempt ledger with failure category, summary, changed files, and speculative re-verify result
     - `optimization.baseline`: the captured checkpoint hash and Phase 1 result for recovery reference (stored as `{ checkpointHash, phase1Result, timestamp }`)
     - `optimization.final`: summary of the final accepted verify state after Phase 2 handling
   - Keep top-level `result` semantics unchanged:
     - Preserve the Phase 1 result for `SKIPPED`, `NOT_NEEDED`, `IMPROVED`, and `ABORTED_UNSAFE`
     - For `DEGRADED`: widen `PASS` to `PASS_WITH_WARNINGS`; keep `PASS_WITH_WARNINGS` as-is

   **11.7 Checkpoint Safety (Exit Conditions)**

   - Exit immediately on `SKIPPED`, `NOT_NEEDED`, `IMPROVED`, `ABORTED_UNSAFE`, or `DEGRADED`
   - On any exit after checkpoint creation, print:
     ```
     Checkpoint hash: <checkpointHash>
     Recovery: git reset --hard HEAD && git clean -fd && git stash apply <checkpointRef>
     ```
   - This ensures manual recovery is possible even if the process terminates abnormally

**Verification Complete**

After Phase 2 completes (or is skipped), verification is fully done. The `.verify-result.json` now contains both Phase 1 canonical result and Phase 2 optimization outcome.

The final markdown report should include an `Optimization` row in the summary table:
| Dimension    | Status   |
|--------------|----------|
| Completeness | X/Y      |
| Correctness  | <status> |
| Coherence    | <status> |
| Optimization | <status> |
```

#### Step 11 for non-subagent tools (default template)

For tools that do not support subagents, Phase 2 is entirely skipped. The Step 11 text should be:

```
11. **Phase 2: Optimality Check (NOT APPLICABLE)**

   This tool does not support clean-context subagent execution. Phase 2 optimization is not available.
   - Set `optimization.status = "NOT_APPLICABLE"` in `.verify-result.json`
   - Rewrite `.verify-result.json` with the optimization object
   - Proceed directly to verification complete

   The final `.verify-result.json` contains only the Phase 1 canonical result.
```
```
