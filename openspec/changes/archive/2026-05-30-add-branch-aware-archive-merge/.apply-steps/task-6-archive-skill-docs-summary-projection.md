# Task 6: Archive skill 文档与归档摘要扩展 - Detailed TDD Steps

## Context

Goal: Extend archive skill guidance with archive commit, merge, and cleanup steps; extend archive summary fields; document that archive consumes git policy through compiled prompt projection.

Files:
- Modify: `src/core/templates/workflows/archive-change.ts`
- Modify: `.claude/skills/openspec-archive-change/SKILL.md`
- Modify: `.codex/skills/openspec-archive-change/SKILL.md`
- Modify: `test/core/project-config.test.ts`
- Create: `test/skills/archive-skill-content.test.ts`
- Modify: `openspec/changes/add-branch-aware-archive-merge/tasks.md`

Requirements:
- Add Step 7 archive commit, Step 8 merge, Step 9 cleanup to archive skill instructions.
- Summary output must include archive commit SHA, merge strategy, merge SHA / abort status, and feature branch handling.
- Skill text must say archive reads git policy from compiled prompt projection, not raw YAML parsing.
- Keep legacy non-git/no-isolation branch-switch cleanup as fallback wording only.
- Archive prompt projection must expose `git.merge.strategy`, `git.merge.messageFrom`, and `git.branch.deleteAfterArchive`.

Related Spec:
- `openspec/changes/add-branch-aware-archive-merge/specs/opsx-archive-skill/spec.md`

## TDD Cycle 1: Archive skill content

### Step 1: Write Failing Test with complete test code

Create `test/skills/archive-skill-content.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { getArchiveChangeSkillTemplate } from '../../src/core/templates/workflows/archive-change.js';

const projectRoot = process.cwd();

function readSkill(relativePath: string): string {
  return readFileSync(join(projectRoot, relativePath), 'utf-8');
}

function normalizeSteps(content: string): string {
  const start = content.indexOf('7. **Create archive commit**');
  const end = content.indexOf('**Output On Success**');
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  return content.slice(start, end).replace(/\s+/g, ' ').trim();
}

describe('openspec archive skill content', () => {
  it('documents archive commit merge and cleanup steps in order', () => {
    const instructions = getArchiveChangeSkillTemplate().instructions;

    expect(instructions).toContain('7. **Create archive commit**');
    expect(instructions).toContain('8. **Merge archived branch**');
    expect(instructions).toContain('9. **Cleanup feature branch and worktree**');
    expect(instructions.indexOf('7. **Create archive commit**')).toBeLessThan(instructions.indexOf('8. **Merge archived branch**'));
    expect(instructions.indexOf('8. **Merge archived branch**')).toBeLessThan(instructions.indexOf('9. **Cleanup feature branch and worktree**'));
    expect(instructions).toContain('git commit -F -');
    expect(instructions).toContain('git merge --no-ff');
    expect(instructions).toContain('git merge --abort');
    expect(instructions).toContain('git branch --merged');
  });

  it('extends summary fields for archive commit merge and feature branch status', () => {
    const instructions = getArchiveChangeSkillTemplate().instructions;

    expect(instructions).toContain('Archive Commit SHA');
    expect(instructions).toContain('Merge Strategy');
    expect(instructions).toContain('Merge SHA / Status');
    expect(instructions).toContain('Feature Branch');
  });

  it('states archive consumes git policy from compiled prompt projection', () => {
    const instructions = getArchiveChangeSkillTemplate().instructions;

    expect(instructions).toContain('compiled prompt projection');
    expect(instructions).toContain('git.merge.strategy');
    expect(instructions).toContain('git.merge.messageFrom');
    expect(instructions).toContain('git.branch.deleteAfterArchive');
    expect(instructions).toContain('do not parse raw YAML inside the skill');
  });

  it('keeps codex and claude archive skill step sections equivalent', () => {
    const codex = readSkill('.codex/skills/openspec-archive-change/SKILL.md');
    const claude = readSkill('.claude/skills/openspec-archive-change/SKILL.md');

    expect(normalizeSteps(codex)).toBe(normalizeSteps(claude));
    expect(normalizeSteps(codex)).toBe(normalizeSteps(getArchiveChangeSkillTemplate().instructions));
  });
});
```

### Step 2: Run Test (Verify Fails) with command, expected failure, and "Test MUST fail"

Command:

```bash
pnpm exec vitest run test/skills/archive-skill-content.test.ts --pool forks
```

Expected failure: archive template still has old Step 7 cleanup and Step 8 summary only.

Test MUST fail.

### Step 3: Implement Minimal Code with complete implementation code

Patch `src/core/templates/workflows/archive-change.ts`:
- Replace old Step 7 cleanup and Step 8 summary with:
  - Step 7 `Create archive commit`
  - Step 8 `Merge archived branch`
  - Step 9 `Cleanup feature branch and worktree`
  - Step 10 `Display summary`
- Add text that archive receives `git.merge.strategy`, `git.merge.messageFrom`, and `git.branch.deleteAfterArchive` from compiled prompt projection and must not parse raw YAML in the skill body.
- Add conflict guidance: abort merge, preserve archive commit, report recovery.
- Add manual message guidance: write `.merge-message.draft` and skip automatic merge.
- Extend output block with archive commit SHA, merge strategy, merge SHA/status, and feature branch handling.
- Keep non-git/no-isolation fallback wording under Step 9 only.

Update `.claude/skills/openspec-archive-change/SKILL.md` and `.codex/skills/openspec-archive-change/SKILL.md` to match generated template content for the changed step section.

### Step 4: Run Test (Verify Passes) with command, expected pass, and "Test MUST pass"

Command:

```bash
pnpm exec vitest run test/skills/archive-skill-content.test.ts --pool forks
```

Expected pass: archive skill content checks pass.

Test MUST pass.

### Step 5: Commit with `git add` and Conventional Commit `git commit -m`

Do not commit yet if other unrelated staged files exist. Report changed files and verification results to the coordinator.

## TDD Cycle 2: Archive prompt projection coverage

### Step 1: Write Failing Test with complete test code

Extend `test/core/project-config.test.ts` in the config projection describe block:

```ts
it('keeps archive git projection lines available to archive skill prompts', () => {
  const projection = projectConfigForPrompt(
    {
      schema: 'spec-driven',
      git: {
        merge: {
          strategy: 'squash',
          messageFrom: 'manual',
        },
        branch: {
          deleteAfterArchive: true,
        },
      },
      rules: {},
    },
    { surface: 'archive' }
  );

  expect(projection.compiledLines).toEqual([
    'git.merge.strategy: squash',
    'git.merge.messageFrom: manual',
    'git.branch.deleteAfterArchive: true',
  ]);
});
```

### Step 2: Run Test (Verify Fails) with command, expected failure, and "Test MUST fail"

Command:

```bash
pnpm exec vitest run test/core/project-config.test.ts --pool forks
```

Expected failure only if the projection omits archive git lines. If it already passes, keep the test as regression coverage and proceed.

Test MUST fail unless behavior already exists from Task 1.

### Step 3: Implement Minimal Code with complete implementation code

If the projection test fails, patch `src/core/config-projection.ts` git projection to emit the three required lines for `surface === 'archive'`.

Do not modify `src/core/config-prompts.ts` unless the test proves the projection entry point has moved there.

### Step 4: Run Test (Verify Passes) with command, expected pass, and "Test MUST pass"

Command:

```bash
pnpm exec vitest run test/core/project-config.test.ts --pool forks
```

Expected pass: project config projection tests pass.

Test MUST pass.

### Step 5: Commit with `git add` and Conventional Commit `git commit -m`

Do not commit yet if unrelated staged files exist. Report changed files and verification results to the coordinator.

## Summary

Total cycles: 2
Modified files: `src/core/templates/workflows/archive-change.ts`, `.claude/skills/openspec-archive-change/SKILL.md`, `.codex/skills/openspec-archive-change/SKILL.md`, `test/skills/archive-skill-content.test.ts`, `test/core/project-config.test.ts`, `openspec/changes/add-branch-aware-archive-merge/tasks.md`
Commit count: 1 by coordinator after review
