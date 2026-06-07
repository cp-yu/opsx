import { describe, expect, it } from 'vitest';

import {
  type SkillTemplateEntry,
  generateSkillContent,
  getSkillTemplates,
} from '../../src/core/shared/skill-generation.js';

const MAX_SKILL_LINES = 200;
const MAX_REFERENCE_LINES = 500;
const REFERENCE_URL = 'https://github.com/mattpocock/skills/blob/main/skills/productivity/write-a-skill/SKILL.md';
const VARIANTS = [
  { label: 'default', toolId: undefined },
  { label: 'claude', toolId: 'claude' },
  { label: 'codex', toolId: 'codex' },
] as const;

interface SkillFileLength {
  dirName: string;
  variant: string;
  filePath: string;
  lines: number;
  limit: number;
}

function collectSkillFileLengths(): SkillFileLength[] {
  return VARIANTS.flatMap(({ label, toolId }) =>
    getSkillTemplates(undefined, toolId).flatMap(({ dirName, template }: SkillTemplateEntry) => [
      {
        dirName,
        variant: label,
        filePath: 'SKILL.md',
        lines: generateSkillContent(template, 'TEST').split('\n').length,
        limit: MAX_SKILL_LINES,
      },
      ...(template.referenceFiles ?? []).map((referenceFile) => ({
        dirName,
        variant: label,
        filePath: referenceFile.path,
        lines: referenceFile.content.split('\n').length,
        limit: MAX_REFERENCE_LINES,
      })),
    ])
  );
}

function formatOverLimitReport(lengths: SkillFileLength[]): string | undefined {
  const overLimit = lengths.filter(({ lines, limit }) => lines > limit);
  if (overLimit.length === 0) {
    return undefined;
  }

  const byFile = new Map<string, Map<string, { lines: number; limit: number; variants: string[] }>>();
  for (const { dirName, variant, filePath, lines, limit } of overLimit) {
    const key = `${dirName}/${filePath}`;
    const byLines = byFile.get(key) ?? new Map<string, { lines: number; limit: number; variants: string[] }>();
    const lineKey = `${lines}:${limit}`;
    const existing = byLines.get(lineKey) ?? { lines, limit, variants: [] };
    byLines.set(lineKey, { ...existing, variants: [...existing.variants, variant] });
    byFile.set(key, byLines);
  }

  const rows = [...byFile.entries()]
    .flatMap(([fileName, byLines]) =>
      [...byLines.values()].map(({ lines, limit, variants }) => ({
        fileName,
        lines,
        limit,
        variants,
      }))
    )
    .sort((left, right) => right.lines - left.lines || left.fileName.localeCompare(right.fileName))
    .map(
      ({ fileName, lines, limit, variants }) =>
        `• ${fileName} (${variants.join(', ')}): ${lines} lines (+${lines - limit}, limit ${limit})`
    );

  return [
    `${overLimit.length} skill template file variant(s) exceed configured line limits.`,
    '',
    ...rows,
    '',
    `Reference: ${REFERENCE_URL}`,
  ].join('\n');
}

describe('skill template length validation', () => {
  it('keeps every generated skill file within the line limit', () => {
    const report = formatOverLimitReport(collectSkillFileLengths());

    if (report) {
      throw new Error(report);
    }
  });

  it('groups over-limit file variants by path and identical line count', () => {
    const report = formatOverLimitReport([
      { dirName: 'openspec-explore', variant: 'default', filePath: 'SKILL.md', lines: 541, limit: MAX_SKILL_LINES },
      { dirName: 'openspec-explore', variant: 'claude', filePath: 'SKILL.md', lines: 541, limit: MAX_SKILL_LINES },
      { dirName: 'openspec-explore', variant: 'codex', filePath: 'SKILL.md', lines: 541, limit: MAX_SKILL_LINES },
    ]);

    expect(report).toContain('3 skill template file variant(s) exceed configured line limits.');
    expect(report).toContain('• openspec-explore/SKILL.md (default, claude, codex): 541 lines (+341, limit 200)');
    expect(report).toContain(REFERENCE_URL);
  });

  it('splits one file into separate rows when variant line counts differ', () => {
    const report = formatOverLimitReport([
      { dirName: 'openspec-verify', variant: 'default', filePath: 'SKILL.md', lines: 580, limit: MAX_SKILL_LINES },
      { dirName: 'openspec-verify', variant: 'claude', filePath: 'SKILL.md', lines: 604, limit: MAX_SKILL_LINES },
      { dirName: 'openspec-verify', variant: 'codex', filePath: 'SKILL.md', lines: 604, limit: MAX_SKILL_LINES },
    ]);

    expect(report).toContain('• openspec-verify/SKILL.md (claude, codex): 604 lines (+404, limit 200)');
    expect(report).toContain('• openspec-verify/SKILL.md (default): 580 lines (+380, limit 200)');
  });

  it('reports reference files independently instead of summing a skill directory', () => {
    const report = formatOverLimitReport([
      { dirName: 'openspec-optimizer', variant: 'default', filePath: 'SKILL.md', lines: 180, limit: MAX_SKILL_LINES },
      {
        dirName: 'openspec-optimizer',
        variant: 'default',
        filePath: 'references/output-protocol.md',
        lines: 501,
        limit: MAX_REFERENCE_LINES,
      },
    ]);

    expect(report).not.toContain('openspec-optimizer/SKILL.md');
    expect(report).toContain('• openspec-optimizer/references/output-protocol.md (default): 501 lines (+1, limit 500)');
  });
});
