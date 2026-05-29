# Task 4: Merge message 生成器从 artifacts 提取 - Detailed TDD Steps

## Context

Goal: 实现把 `proposal.md` / `design.md` / `tasks.md` 转换为 git-commit-reasons 模板 message 的纯函数生成器，支持 type 推断、scope 抽取、Why/Changes 段构造，能写 manual 草稿。

Files:
- `src/core/archive/merge-message.ts`
- `test/core/archive/merge-message.test.ts`
- `test/fixtures/changes/sample-change/`

Requirements:
- Input: archived change directory absolute path.
- Output: `{ subject, body, toString() }`.
- Type inference from `proposal.md` `## What Changes`: 添加/新增 -> `feat`, 修复 -> `fix`, 重构/删除 -> `refactor`, fallback `chore`.
- Scope prefers dominant domain from ADDED/MODIFIED capabilities in `opsx-delta.yaml`; fallback to first segment of change name.
- Subject title comes from first non-empty prose line in `proposal.md` `## Why`, title truncates to 50 chars, whole subject max 72 chars.
- Body contains exactly `## Why` and `## Changes` sections.
- No runtime LLM dependency; pure file/string processing.

Related Spec:
- `openspec/changes/add-branch-aware-archive-merge/specs/archive-branch-merge/spec.md`

## TDD Cycle 1: Generate merge message from full artifacts

### Step 1: Write Failing Test with complete test code

Create fixture directory `test/fixtures/changes/sample-change/` with:

`test/fixtures/changes/sample-change/proposal.md`

```md
## Why

归档流程缺少把 feature 分支合并回主线的结构化入口，导致一次 change 的上下文散落在多个提交里。

## What Changes

- 新增归档合并流程
- 添加结构化 merge message
```

`test/fixtures/changes/sample-change/design.md`

```md
## Decisions

### Decision 1: 使用 no-ff merge commit

保留 feature 分支拓扑，让一次 change 在主线历史里有独立入口。
```

`test/fixtures/changes/sample-change/tasks.md`

```md
### Task 1: 加载 git 配置

**Goal**: 读取归档合并配置并提供默认值。

#### Checks

- [x] C1 配置加载

### Task 2: 执行 archive merge

**Goal**: 在归档完成后生成 archive commit 并合并回原分支。

#### Checks

- [x] C1 merge 成功

### Task 3: 未完成任务

**Goal**: 不应出现在 merge message 中。

#### Checks

- [ ] C1 未完成
```

`test/fixtures/changes/sample-change/opsx-delta.yaml`

```yaml
schema_version: 1
ADDED:
  capabilities:
    - id: cap.archive.merge
      type: capability
      intent: Merge archived branch
    - id: cap.archive.cleanup
      type: capability
      intent: Clean branch
MODIFIED:
  capabilities:
    - id: cap.config.git
      type: capability
      intent: Load git config
```

Create `test/core/archive/merge-message.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { mkdtempSync, cpSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  generateMergeMessage,
  inferMergeMessageType,
  resolveMergeMessageScope,
  writeManualMergeMessageDraft,
} from '../../../src/core/archive/merge-message.js';

function copyFixture(name: string): string {
  const root = mkdtempSync(join(tmpdir(), 'openspec-merge-message-'));
  const source = join(process.cwd(), 'test', 'fixtures', 'changes', name);
  const target = join(root, `2026-05-30-${name}`);
  cpSync(source, target, { recursive: true });
  return target;
}

describe('archive merge message generator', () => {
  it('generates the expected message from complete artifacts', async () => {
    const changeDir = copyFixture('sample-change');

    try {
      const message = await generateMergeMessage(changeDir);

      expect(message.subject).toBe('feat(archive): 归档流程缺少把 feature 分支合并回主线的结构化入口，导致一次 change 的上下文散落在多');
      expect(message.subject.length).toBeLessThanOrEqual(72);
      expect(message.body).toBe(`## Why
[业务背景] 归档流程缺少把 feature 分支合并回主线的结构化入口，导致一次 change 的上下文散落在多个提交里。
[技术决策] 使用 no-ff merge commit

## Changes
- \`加载 git 配置\`: 读取归档合并配置并提供默认值。
- \`执行 archive merge\`: 在归档完成后生成 archive commit 并合并回原分支。`);
      expect(message.toString()).toBe(`${message.subject}

${message.body}
`);
    } finally {
      rmSync(changeDir, { recursive: true, force: true });
    }
  });

  it.each([
    ['新增功能', 'feat'],
    ['添加流程', 'feat'],
    ['修复错误', 'fix'],
    ['重构结构', 'refactor'],
    ['删除旧字段', 'refactor'],
    ['调整文档', 'chore'],
  ] as const)('infers %s as %s', (text, expected) => {
    expect(inferMergeMessageType(text)).toBe(expected);
  });

  it('prefers dominant OPSX domain for scope and falls back to change name', async () => {
    const changeDir = copyFixture('sample-change');
    const fallbackRoot = mkdtempSync(join(tmpdir(), 'openspec-merge-message-'));
    const fallbackDir = join(fallbackRoot, '2026-05-30-config-cleanup');
    mkdirSync(fallbackDir, { recursive: true });

    try {
      expect(await resolveMergeMessageScope(changeDir)).toBe('archive');
      expect(await resolveMergeMessageScope(fallbackDir)).toBe('config');
    } finally {
      rmSync(changeDir, { recursive: true, force: true });
      rmSync(fallbackRoot, { recursive: true, force: true });
    }
  });

  it('writes manual draft beside archived change artifacts', async () => {
    const changeDir = copyFixture('sample-change');

    try {
      const draftPath = await writeManualMergeMessageDraft(changeDir);
      expect(draftPath).toBe(join(changeDir, '.merge-message.draft'));
    } finally {
      rmSync(changeDir, { recursive: true, force: true });
    }
  });
});
```

### Step 2: Run Test (Verify Fails) with command, expected failure, and "Test MUST fail"

Command:

```bash
pnpm test -- merge-message
```

Expected failure: `src/core/archive/merge-message.ts` does not exist.

Test MUST fail.

### Step 3: Implement Minimal Code with complete implementation code

Create `src/core/archive/merge-message.ts`:

```ts
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { parse as parseYaml } from 'yaml';

export type MergeMessageType = 'feat' | 'fix' | 'refactor' | 'chore';

export interface MergeMessage {
  subject: string;
  body: string;
  toString(): string;
}

interface OpsxDelta {
  ADDED?: { capabilities?: Array<{ id?: unknown }> };
  MODIFIED?: { capabilities?: Array<{ id?: unknown }> };
}

export async function generateMergeMessage(changeDir: string): Promise<MergeMessage> {
  const [proposal, design, tasks] = await Promise.all([
    readOptional(path.join(changeDir, 'proposal.md')),
    readOptional(path.join(changeDir, 'design.md')),
    readOptional(path.join(changeDir, 'tasks.md')),
  ]);

  const why = firstNonEmptyLine(section(proposal, 'Why')) || changeNameFromDir(changeDir);
  const decision = firstDecisionTitle(design);
  const type = inferMergeMessageType(section(proposal, 'What Changes'));
  const scope = await resolveMergeMessageScope(changeDir);
  const title = truncate(why, 50);
  const subject = truncate(`${type}(${scope}): ${title}`, 72);
  const changeLines = completedTaskSummaries(tasks);
  const body = [
    '## Why',
    `[业务背景] ${why}`,
    ...(decision ? [`[技术决策] ${decision}`] : []),
    '',
    '## Changes',
    ...(changeLines.length > 0 ? changeLines : ['- `archive`: 归档变更制品。']),
  ].join('\n');

  return {
    subject,
    body,
    toString() {
      return `${subject}\n\n${body}\n`;
    },
  };
}

export function inferMergeMessageType(whatChanges: string): MergeMessageType {
  if (whatChanges.includes('添加') || whatChanges.includes('新增')) {
    return 'feat';
  }
  if (whatChanges.includes('修复')) {
    return 'fix';
  }
  if (whatChanges.includes('重构') || whatChanges.includes('删除')) {
    return 'refactor';
  }
  return 'chore';
}

export async function resolveMergeMessageScope(changeDir: string): Promise<string> {
  const delta = await readOpsxDelta(changeDir);
  const counts = new Map<string, number>();

  for (const capability of [
    ...(delta?.ADDED?.capabilities ?? []),
    ...(delta?.MODIFIED?.capabilities ?? []),
  ]) {
    const id = typeof capability.id === 'string' ? capability.id : '';
    const domain = domainFromCapabilityId(id);
    if (domain) {
      counts.set(domain, (counts.get(domain) ?? 0) + 1);
    }
  }

  const dominant = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0];
  return dominant ?? changeNameFromDir(changeDir).split('-')[0] ?? 'change';
}

export async function writeManualMergeMessageDraft(changeDir: string): Promise<string> {
  const message = await generateMergeMessage(changeDir);
  const draftPath = path.join(changeDir, '.merge-message.draft');
  await fs.writeFile(draftPath, message.toString(), 'utf-8');
  return draftPath;
}

function domainFromCapabilityId(id: string): string | null {
  const parts = id.split('.');
  return parts[0] === 'cap' && parts[1] ? parts[1] : null;
}

async function readOpsxDelta(changeDir: string): Promise<OpsxDelta | null> {
  const content = await readOptional(path.join(changeDir, 'opsx-delta.yaml'));
  if (!content) {
    return null;
  }
  const parsed = parseYaml(content);
  return parsed && typeof parsed === 'object' ? parsed as OpsxDelta : null;
}

async function readOptional(filePath: string): Promise<string> {
  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch {
    return '';
  }
}

function section(markdown: string, title: string): string {
  const lines = markdown.replace(/\r\n?/g, '\n').split('\n');
  const start = lines.findIndex((line) => line.trim().toLowerCase() === `## ${title}`.toLowerCase());
  if (start < 0) {
    return '';
  }
  const body: string[] = [];
  for (let i = start + 1; i < lines.length; i++) {
    if (/^##\s+/.test(lines[i])) {
      break;
    }
    body.push(lines[i]);
  }
  return body.join('\n').trim();
}

function firstNonEmptyLine(content: string): string {
  return content
    .split('\n')
    .map((line) => line.replace(/^[-*]\s+/, '').trim())
    .find(Boolean) ?? '';
}

function firstDecisionTitle(markdown: string): string {
  const match = markdown.match(/^###\s+Decision\s+\d+:\s*(.+)$/m);
  return match?.[1]?.trim() ?? '';
}

function completedTaskSummaries(markdown: string): string[] {
  const lines = markdown.replace(/\r\n?/g, '\n').split('\n');
  const summaries: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const taskMatch = lines[i].match(/^###\s+Task\s+\d+:\s*(.+)$/);
    if (!taskMatch) {
      continue;
    }

    const title = taskMatch[1].trim();
    let goal = '';
    let completed = false;

    for (let j = i + 1; j < lines.length && !/^###\s+Task\s+\d+:/.test(lines[j]); j++) {
      const goalMatch = lines[j].match(/^\*\*Goal\*\*:\s*(.+)$/);
      if (goalMatch) {
        goal = goalMatch[1].trim();
      }
      if (/^\s*-\s+\[[xX]\]/.test(lines[j])) {
        completed = true;
      }
    }

    if (completed) {
      summaries.push(`- \`${title}\`: ${goal || '完成任务。'}`);
    }
  }

  return summaries;
}

function changeNameFromDir(changeDir: string): string {
  return path.basename(changeDir).replace(/^\d{4}-\d{2}-\d{2}-/, '');
}

function truncate(value: string, maxLength: number): string {
  return [...value].slice(0, maxLength).join('');
}
```

### Step 4: Run Test (Verify Passes) with command, expected pass, and "Test MUST pass"

Command:

```bash
pnpm test -- merge-message
```

Expected pass: merge-message tests pass.

Test MUST pass.

### Step 5: Commit with `git add` and Conventional Commit `git commit -m`

Commands:

```bash
git add src/core/archive/merge-message.ts test/core/archive/merge-message.test.ts test/fixtures/changes/sample-change/proposal.md test/fixtures/changes/sample-change/design.md test/fixtures/changes/sample-change/tasks.md test/fixtures/changes/sample-change/opsx-delta.yaml openspec/changes/add-branch-aware-archive-merge/.apply-steps/task-4-merge-message-generator.md
git commit -m "feat(archive): generate merge messages from artifacts" -- src/core/archive/merge-message.ts test/core/archive/merge-message.test.ts test/fixtures/changes/sample-change/proposal.md test/fixtures/changes/sample-change/design.md test/fixtures/changes/sample-change/tasks.md test/fixtures/changes/sample-change/opsx-delta.yaml openspec/changes/add-branch-aware-archive-merge/.apply-steps/task-4-merge-message-generator.md
```

## Summary

Total cycles: 1

Modified files:
- `src/core/archive/merge-message.ts`
- `test/core/archive/merge-message.test.ts`
- `test/fixtures/changes/sample-change/proposal.md`
- `test/fixtures/changes/sample-change/design.md`
- `test/fixtures/changes/sample-change/tasks.md`
- `test/fixtures/changes/sample-change/opsx-delta.yaml`
- `openspec/changes/add-branch-aware-archive-merge/.apply-steps/task-4-merge-message-generator.md`

Commit count: 1
