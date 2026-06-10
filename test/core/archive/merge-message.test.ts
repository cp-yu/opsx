import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { getArchiveChangeSkillTemplate } from '../../../src/core/templates/workflows/archive-change.js';

const projectRoot = process.cwd();

describe('archive merge message runtime boundary', () => {
  it('keeps archive CLI independent from runtime merge message generation', () => {
    const archiveSource = readFileSync(join(projectRoot, 'src', 'core', 'archive.ts'), 'utf-8');

    expect(archiveSource).not.toContain('archive/merge-message');
    expect(archiveSource).not.toContain('generateMergeMessage');
    expect(existsSync(join(projectRoot, 'src', 'core', 'archive', 'merge-message.ts'))).toBe(false);
  });

  it('keeps message templates in archive skill references', () => {
    const template = getArchiveChangeSkillTemplate();
    const archiveReference = template.referenceFiles?.find((file) => file.path === 'references/archive-commit-message.md');
    const mergeReference = template.referenceFiles?.find((file) => file.path === 'references/merge-summary-message.md');

    expect(archiveReference?.content).toContain('git.commitMessage.archive');
    expect(archiveReference?.content).toContain('docs(<change-name>): 归档变更制品');
    expect(mergeReference?.content).toContain('git.commitMessage.merge');
    expect(mergeReference?.content).toContain('<type>(<scope>): <中文标题>');
  });
});
