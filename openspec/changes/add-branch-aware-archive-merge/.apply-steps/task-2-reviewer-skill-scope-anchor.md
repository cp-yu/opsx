# Task 2: Reviewer skill scope 锚定改造 - Detailed TDD Steps

## Context

Goal: 把 reviewer skill 的 Self-Read 协议中 `git diff` 内容级命令替换为 `git diff <originalBranch>...HEAD --name-only`，强制以 Read 到的最终文件内容作为唯一权威证据。

Files:
- `src/core/templates/workflows/reviewer.ts`
- `.claude/skills/openspec-reviewer/SKILL.md`
- `.codex/skills/openspec-reviewer/SKILL.md`
- `test/skills/reviewer-skill-content.test.ts`

Requirements:
- Self-Read Step 4 resolves `originalBranch` from `.apply-isolation.json`, then remote default branch, then user prompt.
- The only reviewer diff command for scope anchoring is `git diff <originalBranch>...HEAD --name-only`.
- Remove `git diff` content and `git log -5 --oneline` as judgment evidence. `git status` / `git log` may remain scope context only.
- Locate step uses name-only output, not diff content.
- Output contract remains unchanged.

Related Spec:
- `openspec/changes/add-branch-aware-archive-merge/specs/openspec-reviewer-skill/spec.md`

## TDD Cycle 1: Reviewer template documents branch-aware name-only scope

### Step 1: Write Failing Test with complete test code

Create `test/skills/reviewer-skill-content.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { getReviewerSkillTemplate } from '../../src/core/templates/workflows/reviewer.js';

const projectRoot = process.cwd();

function readSkill(relativePath: string): string {
  return readFileSync(join(projectRoot, relativePath), 'utf-8');
}

function normalizeSelfRead(content: string): string {
  const start = content.indexOf('## Self-Read Protocol');
  const end = content.indexOf('## Verification Protocol');
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  return content
    .slice(start, end)
    .replace(/^---[\s\S]*?---\n/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

describe('openspec reviewer skill content', () => {
  it('uses branch-aware name-only git scope instead of diff content', () => {
    const instructions = getReviewerSkillTemplate().instructions;

    expect(instructions).toContain('git diff <originalBranch>...HEAD --name-only');
    expect(instructions).toContain('name-only output');
    expect(instructions).toContain('final file contents');
    expect(instructions).not.toMatch(/git diff(?! <originalBranch>\.\.\.HEAD --name-only)/);
    expect(instructions).not.toContain('git log -5 --oneline');
  });

  it('documents originalBranch resolution fallback chain', () => {
    const instructions = getReviewerSkillTemplate().instructions;

    expect(instructions).toContain('changeDir/.apply-isolation.json');
    expect(instructions).toContain('originalBranch');
    expect(instructions).toContain('git symbolic-ref refs/remotes/origin/HEAD --short');
    expect(instructions).toContain('ask the user');
  });

  it('keeps codex and claude reviewer skill self-read sections equivalent', () => {
    const codex = readSkill('.codex/skills/openspec-reviewer/SKILL.md');
    const claude = readSkill('.claude/skills/openspec-reviewer/SKILL.md');

    expect(normalizeSelfRead(codex)).toBe(normalizeSelfRead(claude));
    expect(normalizeSelfRead(codex)).toBe(normalizeSelfRead(getReviewerSkillTemplate().instructions));
  });
});
```

### Step 2: Run Test (Verify Fails) with command, expected failure, and "Test MUST fail"

Command:

```bash
pnpm test -- reviewer-skill-content
```

Expected failure: current reviewer skill still documents `git diff`, `git diff --name-only`, and `git log -5 --oneline`, and lacks originalBranch fallback text.

Test MUST fail.

### Step 3: Implement Minimal Code with complete implementation code

Patch `src/core/templates/workflows/reviewer.ts`:

- In Hard Constraints, replace read-only git examples so `git diff` appears only as `git diff <originalBranch>...HEAD --name-only`; mention `git log` without the concrete `-5 --oneline` command if retained.
- Replace Self-Read Step 4 with:

```md
4. Resolve originalBranch for branch-aware scope anchoring:
   - First read changeDir/.apply-isolation.json and use originalBranch when present.
   - If missing, run `git symbolic-ref refs/remotes/origin/HEAD --short` and strip the `origin/` prefix.
   - If still unresolved, ask the user for the original branch before judging implementation scope.
   Then run `git status` and `git diff <originalBranch>...HEAD --name-only` from projectRoot. Use the name-only output only to identify candidate files; never use diff hunks as behavior evidence.
```

- Replace candidate file language so git evidence means the name-only output.
- In Verification Protocol Step 1, say: `Identify candidate files from requirement keywords and name-only output.`
- In Evidence Standards, make git evidence "name-only scope output".
- Replace the conflicting evidence edge case with final-file authority over scope hints, without referencing diff hunks.

Patch `.claude/skills/openspec-reviewer/SKILL.md` and `.codex/skills/openspec-reviewer/SKILL.md` with the same generated instruction changes. Keep frontmatter unchanged.

### Step 4: Run Test (Verify Passes) with command, expected pass, and "Test MUST pass"

Command:

```bash
pnpm test -- reviewer-skill-content
```

Expected pass: reviewer template and both skill copies use the branch-aware name-only scope protocol and keep equivalent Self-Read sections.

Test MUST pass.

### Step 5: Commit with `git add` and Conventional Commit `git commit -m`

Commands:

```bash
git add src/core/templates/workflows/reviewer.ts .claude/skills/openspec-reviewer/SKILL.md .codex/skills/openspec-reviewer/SKILL.md test/skills/reviewer-skill-content.test.ts openspec/changes/add-branch-aware-archive-merge/.apply-steps/task-2-reviewer-skill-scope-anchor.md
git commit -m "docs(verify): anchor reviewer scope to original branch" -- src/core/templates/workflows/reviewer.ts .claude/skills/openspec-reviewer/SKILL.md .codex/skills/openspec-reviewer/SKILL.md test/skills/reviewer-skill-content.test.ts openspec/changes/add-branch-aware-archive-merge/.apply-steps/task-2-reviewer-skill-scope-anchor.md
```

## Summary

Total cycles: 1

Modified files:
- `src/core/templates/workflows/reviewer.ts`
- `.claude/skills/openspec-reviewer/SKILL.md`
- `.codex/skills/openspec-reviewer/SKILL.md`
- `test/skills/reviewer-skill-content.test.ts`
- `openspec/changes/add-branch-aware-archive-merge/.apply-steps/task-2-reviewer-skill-scope-anchor.md`

Commit count: 1
