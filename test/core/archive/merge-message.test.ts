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
