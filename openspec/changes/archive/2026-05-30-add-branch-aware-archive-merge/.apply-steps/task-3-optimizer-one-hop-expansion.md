# Task 3: Optimizer skill 一层依赖展开协议 - Detailed TDD Steps

## Context

Goal: 把 optimizer skill 改造为：scope 锚定与 reviewer 一致；新增"一层依赖展开"协议覆盖 imports/callers/OPSX relations 三路；展开候选不进入 affectedFileHashes 与 patch 目标。

Files:
- `src/core/templates/workflows/optimizer.ts`
- `.claude/skills/openspec-optimizer/SKILL.md`
- `.codex/skills/openspec-optimizer/SKILL.md`
- `test/skills/optimizer-skill-content.test.ts`

Requirements:
- Self-Read Protocol resolves `originalBranch` and uses `git diff <originalBranch>...HEAD --name-only` as base scope.
- Do not use diff hunks as optimization evidence.
- Add `Dependency Expansion (One Hop)` covering imports, callers, and OPSX relations.
- Filter expansion candidates with `path.relative`, gitignore reuse, and ignored directories `node_modules`, `dist`, `build`, `.git`.
- Search/Replace `PATH` targets only files in base scope; `affectedFileHashes` only includes base scope files.
- Missing `project.opsx.relations.yaml` degrades to imports and callers only.

Related Spec:
- `openspec/changes/add-branch-aware-archive-merge/specs/openspec-optimizer-skill/spec.md`

## TDD Cycle 1: Optimizer template documents branch-aware scope and one-hop expansion

### Step 1: Write Failing Test with complete test code

Create `test/skills/optimizer-skill-content.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { getOptimizerSkillTemplate } from '../../src/core/templates/workflows/optimizer.js';

const projectRoot = process.cwd();

function readSkill(relativePath: string): string {
  return readFileSync(join(projectRoot, relativePath), 'utf-8');
}

function normalizeSelfRead(content: string): string {
  const start = content.indexOf('## Self-Read Protocol');
  const end = content.indexOf('## Optimization Principles');
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  return content
    .slice(start, end)
    .replace(/^---[\s\S]*?---\n/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

describe('openspec optimizer skill content', () => {
  it('uses original branch name-only scope and avoids diff hunk evidence', () => {
    const instructions = getOptimizerSkillTemplate().instructions;

    expect(instructions).toContain('git diff <originalBranch>...HEAD --name-only');
    expect(instructions).toContain('base scope');
    expect(instructions).toContain('changeDir/.apply-isolation.json');
    expect(instructions).toContain('git symbolic-ref refs/remotes/origin/HEAD --short');
    expect(instructions).not.toMatch(/git diff(?! <originalBranch>\.\.\.HEAD --name-only)/);
  });

  it('documents one-hop dependency expansion through imports callers and OPSX relations', () => {
    const instructions = getOptimizerSkillTemplate().instructions;

    expect(instructions).toContain('## Dependency Expansion (One Hop)');
    expect(instructions).toContain('imports');
    expect(instructions).toContain('callers');
    expect(instructions).toContain('OPSX relations');
    expect(instructions).toContain('one hop');
  });

  it('limits patches and affected hashes to base scope files', () => {
    const instructions = getOptimizerSkillTemplate().instructions;

    expect(instructions).toContain('Expansion candidates MUST NOT be patch targets');
    expect(instructions).toContain('Search/Replace PATH');
    expect(instructions).toContain('affectedFileHashes');
    expect(instructions).toContain('base scope files only');
  });

  it('documents expansion filtering and relations fallback', () => {
    const instructions = getOptimizerSkillTemplate().instructions;

    expect(instructions).toContain('path.relative');
    expect(instructions).toContain('gitignore');
    expect(instructions).toContain('node_modules');
    expect(instructions).toContain('dist');
    expect(instructions).toContain('build');
    expect(instructions).toContain('.git');
    expect(instructions).toContain('project.opsx.relations.yaml');
    expect(instructions).toContain('If relations are missing');
  });

  it('keeps codex and claude optimizer skill self-read sections equivalent', () => {
    const codex = readSkill('.codex/skills/openspec-optimizer/SKILL.md');
    const claude = readSkill('.claude/skills/openspec-optimizer/SKILL.md');

    expect(normalizeSelfRead(codex)).toBe(normalizeSelfRead(claude));
    expect(normalizeSelfRead(codex)).toBe(normalizeSelfRead(getOptimizerSkillTemplate().instructions));
  });
});
```

### Step 2: Run Test (Verify Fails) with command, expected failure, and "Test MUST fail"

Command:

```bash
pnpm test -- optimizer-skill-content
```

Expected failure: current optimizer skill lacks originalBranch scope anchoring, one-hop dependency expansion, patch target limits, and relations fallback text.

Test MUST fail.

### Step 3: Implement Minimal Code with complete implementation code

Patch `src/core/templates/workflows/optimizer.ts`:

- In Hard Constraints, replace read-only git examples so the only concrete diff command is `git diff <originalBranch>...HEAD --name-only`.
- Replace the Self-Read Protocol with:

```md
1. Validate changeName, changeDir, and projectRoot.
2. Read changeDir/.verify-result.json and extract result, issues, summary, verificationContext.evidenceFiles, and optimization.failedDirections.
3. Read change artifacts from changeDir: proposal.md, specs/*/spec.md, and design.md when present.
4. Read projectRoot/openspec/config.yaml for optimization.enabled and optimization.optRetries when present.
5. Resolve originalBranch for branch-aware scope anchoring:
   - First read changeDir/.apply-isolation.json and use originalBranch when present.
   - If missing, run `git symbolic-ref refs/remotes/origin/HEAD --short` and strip the `origin/` prefix.
   - If still unresolved, ask the user for the original branch before selecting optimization scope.
6. Run `git diff <originalBranch>...HEAD --name-only` from projectRoot to build the base scope. Treat this name-only output as a navigation list, not behavior evidence.
7. Read candidate implementation files from verificationContext.evidenceFiles and base scope, excluding spec files, design documents, tasks files, config files, and untracked paths.
8. Apply Dependency Expansion (One Hop) before deciding whether an optimization opportunity exists.
```

- Add this section immediately after Self-Read Protocol:

```md
## Dependency Expansion (One Hop)

Expand the base scope by one hop to understand safe optimization context:

1. imports — parse direct import/require/from references from base scope files and resolve project-local targets.
2. callers — identify exported names from base scope files and search direct callers in tracked project files.
3. OPSX relations — when project.opsx.relations.yaml exists, find one-hop depends_on / relates_to neighbors for nodes mapped to base scope files.

Expansion stops after one hop. Do not recursively expand expansion candidates.

Filter expansion candidates before reading them:
- Use path.relative(projectRoot, candidate) and discard paths whose relative form starts with `..`.
- Reuse gitignore parsing when available.
- Exclude ignored directories: node_modules, dist, build, .git.

If relations are missing, continue with imports and callers only; do not fail.

Expansion candidates MUST NOT be patch targets. Search/Replace PATH values MUST remain inside base scope files only. affectedFileHashes MUST include base scope files only; expansion candidates are read-only context.
```

- In Constraint Checklist, change tracked-file target wording to require base scope files.
- In Cross-File Refactoring edge case, require every block target an existing tracked base scope file.

Patch `.claude/skills/openspec-optimizer/SKILL.md` and `.codex/skills/openspec-optimizer/SKILL.md` with the same generated instruction changes. Keep frontmatter unchanged.

### Step 4: Run Test (Verify Passes) with command, expected pass, and "Test MUST pass"

Command:

```bash
pnpm test -- optimizer-skill-content
```

Expected pass: optimizer template and both skill copies contain branch-aware scope, one-hop expansion, patch target limits, relations fallback, and equivalent Self-Read sections.

Test MUST pass.

### Step 5: Commit with `git add` and Conventional Commit `git commit -m`

Commands:

```bash
git add src/core/templates/workflows/optimizer.ts .claude/skills/openspec-optimizer/SKILL.md .codex/skills/openspec-optimizer/SKILL.md test/skills/optimizer-skill-content.test.ts openspec/changes/add-branch-aware-archive-merge/.apply-steps/task-3-optimizer-one-hop-expansion.md
git commit -m "docs(verify): document optimizer one-hop scope expansion" -- src/core/templates/workflows/optimizer.ts .claude/skills/openspec-optimizer/SKILL.md .codex/skills/openspec-optimizer/SKILL.md test/skills/optimizer-skill-content.test.ts openspec/changes/add-branch-aware-archive-merge/.apply-steps/task-3-optimizer-one-hop-expansion.md
```

## Summary

Total cycles: 1

Modified files:
- `src/core/templates/workflows/optimizer.ts`
- `.claude/skills/openspec-optimizer/SKILL.md`
- `.codex/skills/openspec-optimizer/SKILL.md`
- `test/skills/optimizer-skill-content.test.ts`
- `openspec/changes/add-branch-aware-archive-merge/.apply-steps/task-3-optimizer-one-hop-expansion.md`

Commit count: 1
