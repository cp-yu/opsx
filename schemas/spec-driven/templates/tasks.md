### Task 1: <!-- concise task name -->

**Goal**: <!-- what this task accomplishes -->

**Files**:
- Create: `<!-- path/to/new-file -->`
- Modify: `<!-- path/to/existing-file -->`
- Test: `<!-- path/to/test-file -->`

**Requirements**:
- <!-- requirement 1; keep each task to 5 or fewer requirements -->
- <!-- requirement 2 -->

#### Checks

- [ ] C1 <!-- Verification check -->
  - Verifies: `specs/<capability>/spec.md` / Requirement "<requirement name>" / Scenario "<scenario name>"
  - Command: `<!-- command or test -->`
  - Expect: <!-- observable result -->

### Task 2: <!-- deletion task example -->

**Goal**: <!-- remove deprecated feature -->

**Files**:
- Delete: `<!-- path/to/deprecated-file -->`
- Modify: `<!-- path/to/file-with-references -->`
- Test: `<!-- path/to/test-file -->`

**Requirements**:
- <!-- requirement describing what is removed and why -->

#### Checks

- [ ] C2 <!-- Deletion verification check -->
  - Verifies: `specs/<capability>/spec.md` / REMOVED Requirement "<requirement name>"
  - Command: `<!-- absence assertion command, e.g., grep or test -->`
  - Expect: <!-- no matches or references found -->

### Task 3: <!-- refactor task example -->

**Goal**: <!-- refactor existing code without behavior change -->

**Files**:
- Modify: `<!-- path/to/refactored-file -->`
- Test: `<!-- path/to/test-file -->`

**Requirements**:
- <!-- requirement describing behavior preservation -->

#### Checks

- [ ] C3 <!-- Behavior equivalence check -->
  - Preserves: `openspec/specs/<capability>/spec.md` / Requirement "<requirement name>" / Scenario "<scenario name>"
  - Command: `<!-- behavior test command -->`
  - Expect: <!-- old form (old function, old path, old duplication) no longer exists -->
