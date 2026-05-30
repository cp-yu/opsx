# Task 5: Archive 流程追加 archive commit、merge、cleanup - Detailed TDD Steps

## Context

Goal: 在 `src/core/archive.ts` 现有流程末尾追加 archive commit、merge、可选 branch cleanup 三步；冲突时 abort 并保留前置副作用；幂等支持已归档目录重跑 merge。

Files:
- `src/core/archive.ts`
- `test/core/archive-branch-merge.test.ts`

Requirements:
- sync + mv 之后调用 archive commit -> merge -> branch cleanup。
- 新增 git 命令使用 `child_process.spawn` 数组形式。
- `git commit -F -` 与 `git merge -F -` 通过 stdin 传 message。
- 非 git 仓库、缺少 branch isolation、或无法解析 originalBranch 时跳过 git merge flow，不破坏现有 archive 行为。
- merge 冲突时 `git merge --abort`，保留 feature 分支 archive commit，抛出含恢复指引的错误。
- `git.branch.deleteAfterArchive` 为 true 且 `git branch --merged <originalBranch>` 包含 feature 时执行 `git branch -d`。
- `git.merge.strategy`: `no-ff | ff-only | squash`。
- `git.merge.messageFrom: manual` 写 `.merge-message.draft` 并跳过自动 merge。

Related Spec:
- `openspec/changes/add-branch-aware-archive-merge/specs/archive-branch-merge/spec.md`

## TDD Cycle 1: Archive commit and default no-ff merge

### Step 1: Write Failing Test with complete test code

Create `test/core/archive-branch-merge.test.ts`:

```ts
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { promisify } from 'node:util';
import { execFile as execFileCallback } from 'node:child_process';

import { ArchiveCommand } from '../../src/core/archive.js';

vi.mock('@inquirer/prompts', () => ({
  confirm: vi.fn(),
  select: vi.fn(),
}));

const execFile = promisify(execFileCallback);

async function git(projectRoot: string, args: string[]): Promise<string> {
  const result = await execFile('git', args, { cwd: projectRoot, windowsHide: true });
  return result.stdout.trim();
}

async function writeFile(projectRoot: string, relativePath: string, content: string): Promise<void> {
  const filePath = path.join(projectRoot, relativePath);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, 'utf-8');
}

async function setupRepo(): Promise<string> {
  const projectRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-archive-merge-'));
  await fs.mkdir(path.join(projectRoot, 'openspec', 'changes', 'archive'), { recursive: true });
  await writeFile(projectRoot, 'openspec/config.yaml', `schema: spec-driven
git:
  merge:
    strategy: no-ff
    messageFrom: artifacts
  branch:
    deleteAfterArchive: false
`);
  await git(projectRoot, ['init', '-b', 'main']);
  await git(projectRoot, ['config', 'user.email', 'test@example.com']);
  await git(projectRoot, ['config', 'user.name', 'OpenSpec Test']);
  await writeFile(projectRoot, 'README.md', 'baseline\n');
  await git(projectRoot, ['add', '.']);
  await git(projectRoot, ['commit', '-m', 'baseline']);
  await git(projectRoot, ['checkout', '-b', 'feature-archive']);
  return projectRoot;
}

async function writeChange(projectRoot: string, changeName = 'feature-archive'): Promise<void> {
  const changeDir = path.join(projectRoot, 'openspec', 'changes', changeName);
  await fs.mkdir(changeDir, { recursive: true });
  await writeFile(projectRoot, path.join('openspec', 'changes', changeName, 'tasks.md'), `### Task 1: 实现归档合并

**Goal**: 在归档后合并 feature 分支。

#### Checks

- [x] C1 merge
`);
  await writeFile(projectRoot, path.join('openspec', 'changes', changeName, 'proposal.md'), `## Why

归档流程需要合并回主线。

## What Changes

- 新增 archive merge
`);
  await writeFile(projectRoot, path.join('openspec', 'changes', changeName, 'design.md'), `## Decisions

### Decision 1: 使用 no-ff
`);
  await writeFile(projectRoot, path.join('openspec', 'changes', changeName, '.apply-isolation.json'), JSON.stringify({
    method: 'branch',
    branchName: 'feature-archive',
    originalBranch: 'main',
  }));
  await writeFile(projectRoot, 'src/feature.ts', 'export const feature = true;\n');
  await git(projectRoot, ['add', 'src/feature.ts']);
  await git(projectRoot, ['commit', '-m', 'feat: implementation']);
}

describe('archive branch merge', () => {
  let projectRoot: string;
  let originalCwd: string;

  beforeEach(() => {
    originalCwd = process.cwd();
    console.log = vi.fn();
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    vi.restoreAllMocks();
    if (projectRoot) {
      await fs.rm(projectRoot, { recursive: true, force: true });
    }
  });

  it('creates archive commit on feature branch and no-ff merge commit on original branch', async () => {
    projectRoot = await setupRepo();
    await writeChange(projectRoot);
    process.chdir(projectRoot);

    await new ArchiveCommand().execute('feature-archive', { yes: true, noVerify: true, noValidate: true });

    const currentBranch = await git(projectRoot, ['branch', '--show-current']);
    expect(currentBranch).toBe('main');
    const parentLine = await git(projectRoot, ['rev-list', '--parents', '-n', '1', 'HEAD']);
    expect(parentLine.split(' ')).toHaveLength(3);
    const mergeMessage = await git(projectRoot, ['log', '-1', '--pretty=%B']);
    expect(mergeMessage).toContain('## Why');
    expect(mergeMessage).toContain('## Changes');

    await git(projectRoot, ['checkout', 'feature-archive']);
    const archiveCommitSubject = await git(projectRoot, ['log', '-1', '--pretty=%s']);
    expect(archiveCommitSubject).toBe('docs(feature-archive): 归档变更制品');
  });
});
```

### Step 2: Run Test (Verify Fails) with command, expected failure, and "Test MUST fail"

Command:

```bash
pnpm test -- archive-branch-merge
```

Expected failure: archive currently moves the change but does not create archive commit or merge commit.

Test MUST fail.

### Step 3: Implement Minimal Code with complete implementation code

Patch `src/core/archive.ts`:

- Import `spawn` from `node:child_process`, `readProjectConfig` from `./project-config.js`, and `generateMergeMessage` / `writeManualMergeMessageDraft` from `./archive/merge-message.js`.
- Add a `GitCommandResult` interface and `runGit(projectRoot, args, input?)` helper using `spawn('git', args, { cwd: projectRoot, windowsHide: true })`; write `input` to stdin when provided.
- Add `isGitRepository(projectRoot)`, `resolveOriginalBranch(projectRoot, changeDir, isolation)`, `runArchiveCommit(projectRoot, changeName, archivePath)`, `runArchiveMerge(projectRoot, archivePath, isolation, config)`, and `runBranchCleanup(projectRoot, originalBranch, featureBranch, deleteAfterArchive, strategy)`.
- In `execute`, after `moveDirectory(changeDir, archivePath)`, call:

```ts
    await this.runArchiveGitFlow({
      projectRoot: targetPath,
      changeName,
      archivePath,
      isolation: isolationState,
    });
```

- In idempotent mode, if active `changeDir` is absent but `openspec/changes/archive/*-${changeName}` exists, skip sync/mv and call the same git flow with that archived path.
- Keep non-git and missing isolation behavior as no-op.
- Use fixed archive commit message:

```ts
`docs(${changeName}): 归档变更制品

## Changes
- ${toPosixProjectPath(projectRoot, archivePath)}/: 移动 change 目录到归档区
`
```

- For default no-ff, checkout original branch then run `git merge --no-ff <featureBranch> -F -` with `generateMergeMessage(archivePath).toString()` as stdin.
- On merge failure, run `git merge --abort` and throw `new Error('合并 originalBranch 时发生冲突；已 abort，请手动解决冲突后重跑 archive')`.
- For `ff-only`, run `git merge --ff-only <featureBranch>`.
- For `squash`, run `git merge --squash <featureBranch>` then `git commit -F -` with generated message.
- For `messageFrom: manual`, call `writeManualMergeMessageDraft(archivePath)`, log draft path, and return without merge.

### Step 4: Run Test (Verify Passes) with command, expected pass, and "Test MUST pass"

Command:

```bash
pnpm test -- archive-branch-merge
```

Expected pass: the dedicated archive branch merge test passes.

Test MUST pass.

### Step 5: Commit with `git add` and Conventional Commit `git commit -m`

Commands:

```bash
git add src/core/archive.ts test/core/archive-branch-merge.test.ts openspec/changes/add-branch-aware-archive-merge/.apply-steps/task-5-archive-commit-merge-cleanup.md
git commit -m "feat(archive): merge archived branch back to original" -- src/core/archive.ts test/core/archive-branch-merge.test.ts openspec/changes/add-branch-aware-archive-merge/.apply-steps/task-5-archive-commit-merge-cleanup.md
```

## TDD Cycle 2: Conflict, rerun, cleanup, and fallback behavior

### Step 1: Write Failing Test with complete test code

Extend `test/core/archive-branch-merge.test.ts` with tests for:

- merge conflict abort preserves feature archive commit and leaves branch undeleted.
- rerun after the change already exists under `openspec/changes/archive/YYYY-MM-DD-<change>` skips sync/mv and attempts merge flow.
- `git.branch.deleteAfterArchive: true` deletes the feature branch after successful merge when `git branch --merged main` contains it.
- missing `.apply-isolation.json` falls back to `git symbolic-ref refs/remotes/origin/HEAD --short`; when no remote default exists, git flow is skipped without breaking archive.

Use the same temp repo helper and exact git assertions. Keep each test under one scenario.

### Step 2: Run Test (Verify Fails) with command, expected failure, and "Test MUST fail"

Command:

```bash
pnpm test -- archive-branch-merge
```

Expected failure: the first cycle does not yet cover all idempotency/cleanup/fallback paths.

Test MUST fail.

### Step 3: Implement Minimal Code with complete implementation code

Extend the helpers from Cycle 1:

- `findArchivedChangePath(archiveDir, changeName)` returns the newest directory whose name ends with `-${changeName}`.
- `resolveOriginalBranch()` reads isolation, then `git symbolic-ref refs/remotes/origin/HEAD --short`, stripping `origin/`; returns null if unresolved.
- `runBranchCleanup()` checks `deleteAfterArchive`, skips `squash`, checks `git branch --merged <originalBranch>`, then `git branch -d <featureBranch>`.
- `runArchiveMerge()` catches failed merge, calls `git merge --abort`, and rethrows the recovery error.

### Step 4: Run Test (Verify Passes) with command, expected pass, and "Test MUST pass"

Command:

```bash
pnpm test -- archive-branch-merge
```

Expected pass: all archive branch merge tests pass.

Test MUST pass.

### Step 5: Commit with `git add` and Conventional Commit `git commit -m`

Commands:

```bash
git add src/core/archive.ts test/core/archive-branch-merge.test.ts openspec/changes/add-branch-aware-archive-merge/.apply-steps/task-5-archive-commit-merge-cleanup.md
git commit -m "fix(archive): handle merge fallback and branch cleanup" -- src/core/archive.ts test/core/archive-branch-merge.test.ts openspec/changes/add-branch-aware-archive-merge/.apply-steps/task-5-archive-commit-merge-cleanup.md
```

## Summary

Total cycles: 2

Modified files:
- `src/core/archive.ts`
- `test/core/archive-branch-merge.test.ts`
- `openspec/changes/add-branch-aware-archive-merge/.apply-steps/task-5-archive-commit-merge-cleanup.md`

Commit count: 2
