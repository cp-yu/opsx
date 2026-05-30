import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { promisify } from 'node:util';
import { execFile as execFileCallback } from 'node:child_process';

import { ArchiveCommand } from '../../src/core/archive.js';

vi.mock('@inquirer/prompts', () => ({
  confirm: vi.fn(),
  input: vi.fn(),
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

async function writeSharedConflict(projectRoot: string): Promise<void> {
  await writeFile(projectRoot, 'src/shared.ts', 'export const value = 1;\n');
  await git(projectRoot, ['add', 'src/shared.ts']);
  await git(projectRoot, ['commit', '-m', 'feat: shared baseline']);

  await git(projectRoot, ['checkout', 'main']);
  await writeFile(projectRoot, 'src/shared.ts', 'export const value = 2;\n');
  await git(projectRoot, ['add', 'src/shared.ts']);
  await git(projectRoot, ['commit', '-m', 'chore: main conflict']);
  await git(projectRoot, ['checkout', 'feature-archive']);
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
    await writeFile(projectRoot, 'openspec/changes/feature-archive/specs/synced/spec.md', `# Synced - Changes

## ADDED Requirements

### Requirement: Synced behavior
The system SHALL sync this requirement.
`);
    await writeFile(projectRoot, 'openspec/project.opsx.yaml', `schema_version: 1
project:
  id: proj.test
  name: Test
domains: []
capabilities: []
`);
    await writeFile(projectRoot, 'openspec/project.opsx.relations.yaml', `schema_version: 1
relations: []
`);
    await writeFile(projectRoot, 'openspec/project.opsx.code-map.yaml', `schema_version: 1
nodes: []
`);
    await writeFile(projectRoot, 'openspec/changes/feature-archive/opsx-delta.yaml', `schema_version: 1
ADDED:
  domains:
    - id: dom.auth
      type: domain
      intent: Authentication
  capabilities:
    - id: cap.auth.login
      type: capability
      intent: Login
  relations:
    - from: cap.auth.login
      to: dom.auth
      type: contains
`);
    await writeFile(projectRoot, 'openspec/specs/unrelated/spec.md', '# Unrelated\n');
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
    const archiveCommitMessage = await git(projectRoot, ['log', '-1', '--pretty=%B']);
    expect(archiveCommitMessage).toContain('openspec/changes/archive/');
    expect(archiveCommitMessage).toContain('openspec/specs/: 同步 delta spec');
    expect(archiveCommitMessage).toContain('openspec/project.opsx.*.yaml: 应用 OPSX delta');
    const archiveCommitFiles = await git(projectRoot, ['diff-tree', '--no-commit-id', '--name-only', '-r', 'HEAD']);
    expect(archiveCommitFiles).toContain('openspec/specs/synced/spec.md');
    expect(archiveCommitFiles).toContain('openspec/project.opsx.yaml');
    expect(archiveCommitFiles).toContain('openspec/project.opsx.relations.yaml');
    expect(archiveCommitFiles).toContain('openspec/project.opsx.code-map.yaml');
    expect(archiveCommitFiles).not.toContain('openspec/specs/unrelated/spec.md');
  });

  it('aborts merge conflict and keeps the feature archive commit and branch', async () => {
    projectRoot = await setupRepo();
    await writeChange(projectRoot);
    await writeSharedConflict(projectRoot);
    process.chdir(projectRoot);

    await expect(new ArchiveCommand().execute('feature-archive', { yes: true, noVerify: true, noValidate: true })).rejects.toThrow(
      '合并 originalBranch 时发生冲突；已 abort，请手动解决冲突后重跑 archive'
    );

    const featureBranch = await git(projectRoot, ['branch', '--list', 'feature-archive']);
    expect(featureBranch).toContain('feature-archive');
    await git(projectRoot, ['checkout', 'feature-archive']);
    const archiveCommitSubject = await git(projectRoot, ['log', '-1', '--pretty=%s']);
    expect(archiveCommitSubject).toBe('docs(feature-archive): 归档变更制品');
  });

  it('reuses the archived change path on rerun and still completes the merge flow', async () => {
    projectRoot = await setupRepo();
    await writeChange(projectRoot);
    process.chdir(projectRoot);

    await new ArchiveCommand().execute('feature-archive', { yes: true, noVerify: true, noValidate: true });
    await new ArchiveCommand().execute('feature-archive', { yes: true, noVerify: true, noValidate: true });

    const currentBranch = await git(projectRoot, ['branch', '--show-current']);
    expect(currentBranch).toBe('main');
    const archives = await fs.readdir(path.join(projectRoot, 'openspec', 'changes', 'archive'));
    expect(archives.filter((entry) => entry.endsWith('-feature-archive'))).toHaveLength(1);
  });

  it('deletes the feature branch after merge when archive cleanup is enabled', async () => {
    projectRoot = await setupRepo();
    await writeFile(projectRoot, 'openspec/config.yaml', `schema: spec-driven
git:
  merge:
    strategy: no-ff
    messageFrom: artifacts
  branch:
    deleteAfterArchive: true
`);
    await writeChange(projectRoot);
    process.chdir(projectRoot);

    await new ArchiveCommand().execute('feature-archive', { yes: true, noVerify: true, noValidate: true });

    const featureBranch = await git(projectRoot, ['branch', '--list', 'feature-archive']);
    expect(featureBranch).toBe('');
  });

  it('prompts for originalBranch when isolation and remote default branch are missing', async () => {
    projectRoot = await setupRepo();
    const { input } = await import('@inquirer/prompts');
    const mockInput = input as unknown as ReturnType<typeof vi.fn>;
    mockInput.mockResolvedValueOnce('main');
    const changeDir = path.join(projectRoot, 'openspec', 'changes', 'feature-archive');
    await fs.mkdir(changeDir, { recursive: true });
    await writeFile(projectRoot, path.join('openspec', 'changes', 'feature-archive', 'tasks.md'), '- [x] Task 1\n');
    await writeFile(projectRoot, path.join('openspec', 'changes', 'feature-archive', 'proposal.md'), '## Why\n\nFallback archive.\n\n## What Changes\n\n- test\n');
    await writeFile(projectRoot, path.join('openspec', 'changes', 'feature-archive', 'design.md'), '## Decisions\n\n### Decision 1: fallback\n');
    await writeFile(projectRoot, 'src/feature.ts', 'export const feature = true;\n');
    await git(projectRoot, ['add', 'src/feature.ts']);
    await git(projectRoot, ['commit', '-m', 'feat: implementation']);
    await fs.rm(path.join(changeDir, '.apply-isolation.json'), { force: true });
    process.chdir(projectRoot);

    await new ArchiveCommand().execute('feature-archive', { yes: true, noVerify: true, noValidate: true });

    const currentBranch = await git(projectRoot, ['branch', '--show-current']);
    expect(currentBranch).toBe('main');
    const archiveDir = path.join(projectRoot, 'openspec', 'changes', 'archive');
    const archives = await fs.readdir(archiveDir);
    const archiveName = archives.find((entry) => entry.includes('feature-archive'));
    expect(archiveName).toBeDefined();
    const isolation = JSON.parse(await fs.readFile(path.join(archiveDir, archiveName!, '.apply-isolation.json'), 'utf-8'));
    expect(isolation).toEqual(expect.objectContaining({
      branchName: 'feature-archive',
      originalBranch: 'main',
    }));
  });
});
