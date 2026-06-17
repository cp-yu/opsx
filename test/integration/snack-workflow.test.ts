import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { parse as parseYaml } from 'yaml';

import { InitCommand } from '../../src/core/init.js';
import { UpdateCommand } from '../../src/core/update.js';
import { WorkflowManifestRegistry } from '../../src/core/templates/manifest/registry.js';
import { getSkillTemplates } from '../../src/core/shared/skill-generation.js';

const { confirmMock, inputMock, showWelcomeScreenMock, searchableMultiSelectMock } = vi.hoisted(() => ({
  confirmMock: vi.fn(),
  inputMock: vi.fn(),
  showWelcomeScreenMock: vi.fn().mockResolvedValue(undefined),
  searchableMultiSelectMock: vi.fn(),
}));

vi.mock('@inquirer/prompts', () => ({
  confirm: confirmMock,
  input: inputMock,
}));

vi.mock('../../src/ui/welcome-screen.js', () => ({
  showWelcomeScreen: showWelcomeScreenMock,
}));

vi.mock('../../src/prompts/searchable-multi-select.js', () => ({
  searchableMultiSelect: searchableMultiSelectMock,
}));

describe('snack workflow integration', () => {
  let testDir: string;
  let configTempDir: string;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(async () => {
    testDir = path.join(os.tmpdir(), `openspec-snack-it-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });
    originalEnv = { ...process.env };
    configTempDir = path.join(os.tmpdir(), `openspec-snack-cfg-${Date.now()}`);
    await fs.mkdir(configTempDir, { recursive: true });
    process.env.XDG_CONFIG_HOME = configTempDir;
    vi.spyOn(console, 'log').mockImplementation(() => {});
    confirmMock.mockReset();
    confirmMock.mockResolvedValue(true);
    inputMock.mockReset();
    inputMock.mockResolvedValue('');
    showWelcomeScreenMock.mockClear();
    searchableMultiSelectMock.mockReset();
  });

  afterEach(async () => {
    process.env = originalEnv;
    await fs.rm(testDir, { recursive: true, force: true });
    await fs.rm(configTempDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it('registry exposes snack as the 6th skill-only workflow', () => {
    const workflowIds = WorkflowManifestRegistry.getAllWorkflowIds();
    expect(workflowIds).toHaveLength(6);
    expect(workflowIds).toContain('snack');

    const snack = WorkflowManifestRegistry.get('snack');
    expect(snack?.modeMembership).toEqual(['core']);
    expect(snack?.getSkillTemplate).toBeDefined();
    // snack is skill-only: no command template
    expect(snack?.getCommandTemplate).toBeUndefined();

    const skillTemplates = getSkillTemplates();
    const snackTemplate = skillTemplates.find((entry) => entry.workflowId === 'snack');
    expect(snackTemplate?.dirName).toBe('openspec-snack');
  });

  it('init installs 6 workflow skills including snack for Claude Code', async () => {
    const initCommand = new InitCommand({ tools: 'claude', force: true });
    await initCommand.execute(testDir);

    const skillsDir = path.join(testDir, '.claude', 'skills');
    const expectedSkills = [
      'openspec-propose',
      'openspec-explore',
      'openspec-apply-change',
      'openspec-archive-change',
      'openspec-bootstrap-opsx',
      'openspec-snack',
    ];

    for (const skill of expectedSkills) {
      const skillFile = path.join(skillsDir, skill, 'SKILL.md');
      expect(await fileExists(skillFile)).toBe(true);
    }

    // snack is skill-only: no corresponding command file
    const snackCommand = path.join(testDir, '.claude', 'commands', 'opsx', 'snack.md');
    expect(await fileExists(snackCommand)).toBe(false);

    const snackSkill = await fs.readFile(
      path.join(skillsDir, 'openspec-snack', 'SKILL.md'),
      'utf-8'
    );
    expect(snackSkill).toContain('git diff');
    expect(snackSkill).toContain('code-map');
    expect(snackSkill).toContain('openspec instructions proposal');
    expect(snackSkill).toContain('openspec instructions specs');
    expect(snackSkill).toContain('openspec instructions design');
    expect(snackSkill).toContain('openspec validate "<name>" --type change --json');
    expect(snackSkill).toContain('  • 继续开发: `openspec sync "<change-name>" --no-verify`');
    expect(snackSkill).toContain('修正分支 1：审查 change → 手动编辑 specs → sync → archive');
    expect(snackSkill).toMatch(/不生成|Do NOT generate `tasks.md`/);
    // instructions portion (after YAML frontmatter) must stay <= 200 lines
    expect(instructionLineCount(snackSkill)).toBeLessThanOrEqual(200);
  });

  it('update refreshes the snack skill file in place', async () => {
    await fs.mkdir(path.join(testDir, 'openspec'), { recursive: true });
    await fs.mkdir(path.join(testDir, '.claude', 'skills', 'openspec-snack'), { recursive: true });
    const staleSkill = path.join(testDir, '.claude', 'skills', 'openspec-snack', 'SKILL.md');
    await fs.writeFile(staleSkill, 'STALE CONTENT');

    const updateCommand = new UpdateCommand({ force: true });
    await updateCommand.execute(testDir);

    const refreshed = await fs.readFile(staleSkill, 'utf-8');
    expect(refreshed).not.toBe('STALE CONTENT');
    expect(readSkillFrontmatter(refreshed)).toMatchObject({ name: 'openspec-snack' });
    expect(refreshed).toContain('git diff');
    expect(refreshed).toContain('openspec instructions proposal');
    expect(refreshed).toContain('openspec validate "<name>" --type change --json');
    expect(instructionLineCount(refreshed)).toBeLessThanOrEqual(200);
  });
});

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

// Count lines of the instructions body, i.e. everything after the YAML frontmatter.
function instructionLineCount(skillContent: string): number {
  const match = skillContent.match(/^---\n[\s\S]*?\n---\n/);
  const body = match ? skillContent.slice(match[0].length) : skillContent;
  return body.split('\n').length;
}

function readSkillFrontmatter(skillContent: string): unknown {
  const match = skillContent.match(/^---\n([\s\S]*?)\n---\n/);
  return parseYaml(match?.[1] ?? '');
}
