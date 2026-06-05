import { describe, expect, it } from 'vitest';

import {
  type SkillTemplateEntry,
  generateSkillContent,
  getSkillTemplates,
} from '../../src/core/shared/skill-generation.js';

const MAX_FILE_LINES = 200;
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
}

function collectSkillFileLengths(): SkillFileLength[] {
  return VARIANTS.flatMap(({ label, toolId }) =>
    getSkillTemplates(undefined, toolId).flatMap(({ dirName, template }: SkillTemplateEntry) => [
      {
        dirName,
        variant: label,
        filePath: 'SKILL.md',
        lines: generateSkillContent(template, 'TEST').split('\n').length,
      },
      ...(template.referenceFiles ?? []).map((referenceFile) => ({
        dirName,
        variant: label,
        filePath: referenceFile.path,
        lines: referenceFile.content.split('\n').length,
      })),
    ])
  );
}

function formatOverLimitReport(lengths: SkillFileLength[]): string | undefined {
  const overLimit = lengths.filter(({ lines }) => lines > MAX_FILE_LINES);
  if (overLimit.length === 0) {
    return undefined;
  }

  const byFile = new Map<string, Map<number, string[]>>();
  for (const { dirName, variant, filePath, lines } of overLimit) {
    const key = `${dirName}/${filePath}`;
    const byLines = byFile.get(key) ?? new Map<number, string[]>();
    byLines.set(lines, [...(byLines.get(lines) ?? []), variant]);
    byFile.set(key, byLines);
  }

  const rows = [...byFile.entries()]
    .flatMap(([fileName, byLines]) =>
      [...byLines.entries()].map(([lines, variants]) => ({
        fileName,
        lines,
        variants,
      }))
    )
    .sort((left, right) => right.lines - left.lines || left.fileName.localeCompare(right.fileName))
    .map(
      ({ fileName, lines, variants }) =>
        `• ${fileName} (${variants.join(', ')}): ${lines} lines (+${lines - MAX_FILE_LINES})`
    );

  return [
    `${overLimit.length} skill template file variant(s) exceed ${MAX_FILE_LINES} lines.`,
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
      { dirName: 'openspec-explore', variant: 'default', filePath: 'SKILL.md', lines: 541 },
      { dirName: 'openspec-explore', variant: 'claude', filePath: 'SKILL.md', lines: 541 },
      { dirName: 'openspec-explore', variant: 'codex', filePath: 'SKILL.md', lines: 541 },
    ]);

    expect(report).toContain('3 skill template file variant(s) exceed 200 lines.');
    expect(report).toContain('• openspec-explore/SKILL.md (default, claude, codex): 541 lines (+341)');
    expect(report).toContain(REFERENCE_URL);
  });

  it('splits one file into separate rows when variant line counts differ', () => {
    const report = formatOverLimitReport([
      { dirName: 'openspec-verify', variant: 'default', filePath: 'SKILL.md', lines: 580 },
      { dirName: 'openspec-verify', variant: 'claude', filePath: 'SKILL.md', lines: 604 },
      { dirName: 'openspec-verify', variant: 'codex', filePath: 'SKILL.md', lines: 604 },
    ]);

    expect(report).toContain('• openspec-verify/SKILL.md (claude, codex): 604 lines (+404)');
    expect(report).toContain('• openspec-verify/SKILL.md (default): 580 lines (+380)');
  });

  it('reports reference files independently instead of summing a skill directory', () => {
    const report = formatOverLimitReport([
      { dirName: 'openspec-optimizer', variant: 'default', filePath: 'SKILL.md', lines: 180 },
      {
        dirName: 'openspec-optimizer',
        variant: 'default',
        filePath: 'references/output-protocol.md',
        lines: 205,
      },
    ]);

    expect(report).not.toContain('openspec-optimizer/SKILL.md');
    expect(report).toContain('• openspec-optimizer/references/output-protocol.md (default): 205 lines (+5)');
  });
});
