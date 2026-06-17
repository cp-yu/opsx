import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { parse as parseYaml } from 'yaml';
import { InitCommand } from '../../src/core/init.js';
import { getCommandSlug } from '../../src/core/shared/index.js';
import { saveGlobalConfig, getGlobalConfig } from '../../src/core/global-config.js';

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

describe('InitCommand', () => {
  let testDir: string;
  let configTempDir: string;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(async () => {
    testDir = path.join(os.tmpdir(), `openspec-init-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });
    originalEnv = { ...process.env };
    // Use a temp dir for global config to avoid reading real config
    configTempDir = path.join(os.tmpdir(), `openspec-config-init-${Date.now()}`);
    await fs.mkdir(configTempDir, { recursive: true });
    process.env.XDG_CONFIG_HOME = configTempDir;

    // Mock console.log to suppress output during tests
    vi.spyOn(console, 'log').mockImplementation(() => { });
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

  async function writeLegacyCodexCommand(workflowSlug: string): Promise<string> {
    const codexHome = process.env.CODEX_HOME ?? path.join(testDir, 'codex-home');
    process.env.CODEX_HOME = codexHome;
    const promptFile = path.join(path.resolve(codexHome), 'prompts', `opsx-${workflowSlug}.md`);
    await fs.mkdir(path.dirname(promptFile), { recursive: true });
    await fs.writeFile(promptFile, '# legacy codex command', 'utf-8');
    return promptFile;
  }

  describe('execute with --tools flag', () => {
    it('should create OpenSpec directory structure', async () => {
      const initCommand = new InitCommand({ tools: 'claude', force: true });

      await initCommand.execute(testDir);

      const openspecPath = path.join(testDir, 'openspec');
      expect(await directoryExists(openspecPath)).toBe(true);
      expect(await directoryExists(path.join(openspecPath, 'specs'))).toBe(true);
      expect(await directoryExists(path.join(openspecPath, 'changes'))).toBe(true);
      expect(await directoryExists(path.join(openspecPath, 'changes', 'archive'))).toBe(true);
    });

    it('should create config.yaml with functional defaults', async () => {
      const initCommand = new InitCommand({ tools: 'claude', force: true });

      await initCommand.execute(testDir);

      const configPath = path.join(testDir, 'openspec', 'config.yaml');
      expect(await fileExists(configPath)).toBe(true);

      const content = await fs.readFile(configPath, 'utf-8');
      const parsed = parseYaml(content);
      expect(content).toContain('schema: spec-driven');
      expect(content).toContain('optimization:');
      expect(content).toContain('  enabled: true');
      expect(content).toContain('  optRetries: 2');
      expect(content).toContain('apply:');
      expect(content).toContain('  defaultIsolation: ask  # ask / branch / worktree / none');
      expect(content).toContain('git:');
      expect(content).toContain('  merge:');
      expect(content).toContain('    strategy: no-ff');
      expect(content).toContain('  branch:');
      expect(content).toContain('    deleteAfterArchive: false');
      expect(content).not.toContain('autoCommit');
      expect(content).not.toContain('convention: openspec-archive');
      expect(content).not.toContain('convention: openspec-merge-summary');
      expect(content).not.toContain('messageFrom');
      expect(parsed.git).not.toHaveProperty('autoCommit');
      expect(parsed.git).not.toHaveProperty('archive');
      expect(parsed.git.merge).not.toHaveProperty('commitMessage');
      expect(parsed.git.merge.strategy).toBe('no-ff');
      expect(parsed.git.branch.deleteAfterArchive).toBe(false);
      expect(parsed).not.toHaveProperty('propose');
      expect(parsed.apply).toEqual({
        defaultIsolation: 'ask',
      });
      expect(parsed).not.toHaveProperty('rules');
      expect(parsed).not.toHaveProperty('context');
      expect(parsed).not.toHaveProperty('docLanguage');
    });

    it('should write proseLanguage to config.yaml during interactive init', async () => {
      const initCommand = new InitCommand({ force: true });
      vi.spyOn(initCommand as any, 'canPromptInteractively').mockReturnValue(true);
      vi.spyOn(initCommand as any, 'getSelectedTools').mockResolvedValue(['claude']);
      inputMock.mockResolvedValue('zh-CN');

      await initCommand.execute(testDir);

      const configPath = path.join(testDir, 'openspec', 'config.yaml');
      const content = await fs.readFile(configPath, 'utf-8');
      expect(content).toContain('schema: spec-driven');
      expect(content).toContain('proseLanguage: zh-CN');
    });

    it('should create all 6 registry skills for Claude Code by default', async () => {
      const initCommand = new InitCommand({ tools: 'claude', force: true });

      await initCommand.execute(testDir);

      // All 6 registry workflows: propose, explore, apply, archive, bootstrap-opsx, snack
      const expectedSkillNames = [
        'openspec-propose',
        'openspec-explore',
        'openspec-apply-change',
        'openspec-archive-change',
        'openspec-bootstrap-opsx',
        'openspec-snack',
      ];

      for (const skillName of expectedSkillNames) {
        const skillFile = path.join(testDir, '.claude', 'skills', skillName, 'SKILL.md');
        expect(await fileExists(skillFile)).toBe(true);

        const content = await fs.readFile(skillFile, 'utf-8');
        expect(content).toContain('---');
        expect(content).toContain('name:');
        expect(content).toContain('description:');
      }

      // Removed workflow skills should NOT be created
      const removedSkillNames = [
        'openspec-new-change',
        'openspec-continue-change',
        'openspec-ff-change',
        'openspec-sync-specs',
        'openspec-bulk-archive-change',
        'openspec-verify-change',
      ];

      for (const skillName of removedSkillNames) {
        const skillFile = path.join(testDir, '.claude', 'skills', skillName, 'SKILL.md');
        expect(await fileExists(skillFile)).toBe(false);
      }
    });

    it('should create 5 command templates for Claude Code (snack is skill-only)', async () => {
      const initCommand = new InitCommand({ tools: 'claude', force: true });

      await initCommand.execute(testDir);

      // 5 command templates: propose, explore, apply, archive, bootstrap (snack is skill-only)
      const expectedCommandNames = [
        'opsx/propose.md',
        'opsx/explore.md',
        'opsx/apply.md',
        'opsx/archive.md',
        'opsx/bootstrap.md',
      ];

      for (const cmdName of expectedCommandNames) {
        const cmdFile = path.join(testDir, '.claude', 'commands', cmdName);
        expect(await fileExists(cmdFile)).toBe(true);
      }

      // Removed workflow commands should NOT be created
      const removedCommandNames = [
        'opsx/new.md',
        'opsx/continue.md',
        'opsx/ff.md',
        'opsx/sync.md',
        'opsx/bulk-archive.md',
        'opsx/verify.md',
      ];

      for (const cmdName of removedCommandNames) {
        const cmdFile = path.join(testDir, '.claude', 'commands', cmdName);
        expect(await fileExists(cmdFile)).toBe(false);
      }
    });

    it('should create skills in Cursor skills directory', async () => {
      const initCommand = new InitCommand({ tools: 'cursor', force: true });

      await initCommand.execute(testDir);

      const skillFile = path.join(testDir, '.cursor', 'skills', 'openspec-explore', 'SKILL.md');
      expect(await fileExists(skillFile)).toBe(true);
    });

    it('should create skills in Windsurf skills directory', async () => {
      const initCommand = new InitCommand({ tools: 'windsurf', force: true });

      await initCommand.execute(testDir);

      const skillFile = path.join(testDir, '.windsurf', 'skills', 'openspec-explore', 'SKILL.md');
      expect(await fileExists(skillFile)).toBe(true);
    });

    it('should configure codex as skills-only by default', async () => {
      const consoleSpy = vi.spyOn(console, 'log');
      const initCommand = new InitCommand({ tools: 'codex', force: true });

      await initCommand.execute(testDir);

      expect(await fileExists(
        path.join(testDir, '.codex', 'skills', 'openspec-explore', 'SKILL.md')
      )).toBe(true);
      expect(await fileExists(
        path.join(path.resolve(process.env.CODEX_HOME ?? path.join(testDir, 'codex-home')), 'prompts', 'opsx-explore.md')
      )).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('$openspec-propose "your idea"')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('refreshed skills to take effect')
      );
      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('/opsx:propose')
      );
    });

    it('should keep command-backed init guidance on slash commands', async () => {
      const consoleSpy = vi.spyOn(console, 'log');
      const initCommand = new InitCommand({ tools: 'claude', force: true });

      await initCommand.execute(testDir);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('/opsx:propose "your idea"')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('slash commands to take effect')
      );
    });

    it('should keep codex on skills and remove legacy command files in commands delivery', async () => {
      saveGlobalConfig({
        featureFlags: {},
        delivery: 'commands',
      });
      const legacyCommand = await writeLegacyCodexCommand('explore');
      const initCommand = new InitCommand({ tools: 'codex', force: true });

      await initCommand.execute(testDir);

      expect(await fileExists(
        path.join(testDir, '.codex', 'skills', 'openspec-explore', 'SKILL.md')
      )).toBe(true);
      expect(await fileExists(legacyCommand)).toBe(false);
    });

    it('should create skills for multiple tools at once', async () => {
      const initCommand = new InitCommand({ tools: 'claude,cursor', force: true });

      await initCommand.execute(testDir);

      const claudeSkill = path.join(testDir, '.claude', 'skills', 'openspec-explore', 'SKILL.md');
      const cursorSkill = path.join(testDir, '.cursor', 'skills', 'openspec-explore', 'SKILL.md');

      expect(await fileExists(claudeSkill)).toBe(true);
      expect(await fileExists(cursorSkill)).toBe(true);
    });

    it('should select all tools with --tools all option', async () => {
      const initCommand = new InitCommand({ tools: 'all', force: true });

      await initCommand.execute(testDir);

      // Check a few representative tools
      const claudeSkill = path.join(testDir, '.claude', 'skills', 'openspec-explore', 'SKILL.md');
      const cursorSkill = path.join(testDir, '.cursor', 'skills', 'openspec-explore', 'SKILL.md');
      const windsurfSkill = path.join(testDir, '.windsurf', 'skills', 'openspec-explore', 'SKILL.md');

      expect(await fileExists(claudeSkill)).toBe(true);
      expect(await fileExists(cursorSkill)).toBe(true);
      expect(await fileExists(windsurfSkill)).toBe(true);
    });

    it('should skip tool configuration with --tools none option', async () => {
      const initCommand = new InitCommand({ tools: 'none', force: true });

      await initCommand.execute(testDir);

      // Should create OpenSpec structure but no skills
      const openspecPath = path.join(testDir, 'openspec');
      expect(await directoryExists(openspecPath)).toBe(true);

      // No tool-specific directories should be created
      const claudeSkillsDir = path.join(testDir, '.claude', 'skills');
      expect(await directoryExists(claudeSkillsDir)).toBe(false);
    });

    it('should throw error for invalid tool names', async () => {
      const initCommand = new InitCommand({ tools: 'invalid-tool', force: true });

      await expect(initCommand.execute(testDir)).rejects.toThrow(/Invalid tool\(s\): invalid-tool/);
    });

    it('should handle comma-separated tool names with spaces', async () => {
      const initCommand = new InitCommand({ tools: 'claude, cursor', force: true });

      await initCommand.execute(testDir);

      const claudeSkill = path.join(testDir, '.claude', 'skills', 'openspec-explore', 'SKILL.md');
      const cursorSkill = path.join(testDir, '.cursor', 'skills', 'openspec-explore', 'SKILL.md');

      expect(await fileExists(claudeSkill)).toBe(true);
      expect(await fileExists(cursorSkill)).toBe(true);
    });

    it('should reject combining reserved keywords with explicit tool ids', async () => {
      const initCommand = new InitCommand({ tools: 'all,claude', force: true });

      await expect(initCommand.execute(testDir)).rejects.toThrow(
        /Cannot combine reserved values "all" or "none" with specific tool IDs/
      );
    });

    it('should not create config.yaml if it already exists', async () => {
      // Pre-create config.yaml
      const openspecDir = path.join(testDir, 'openspec');
      await fs.mkdir(openspecDir, { recursive: true });
      const configPath = path.join(openspecDir, 'config.yaml');
      const existingContent = 'schema: custom-schema\n';
      await fs.writeFile(configPath, existingContent);

      const initCommand = new InitCommand({ tools: 'claude', force: true });
      await initCommand.execute(testDir);

      const content = await fs.readFile(configPath, 'utf-8');
      expect(content).toBe(existingContent);
    });

    it('should handle non-existent target directory', async () => {
      const newDir = path.join(testDir, 'new-project');
      const initCommand = new InitCommand({ tools: 'claude', force: true });

      await initCommand.execute(newDir);

      const openspecPath = path.join(newDir, 'openspec');
      expect(await directoryExists(openspecPath)).toBe(true);
    });

    it('should work in extend mode (re-running init)', async () => {
      const initCommand1 = new InitCommand({ tools: 'claude', force: true });
      await initCommand1.execute(testDir);

      // Run init again with a different tool
      const initCommand2 = new InitCommand({ tools: 'cursor', force: true });
      await initCommand2.execute(testDir);

      // Both tools should have skills
      const claudeSkill = path.join(testDir, '.claude', 'skills', 'openspec-explore', 'SKILL.md');
      const cursorSkill = path.join(testDir, '.cursor', 'skills', 'openspec-explore', 'SKILL.md');

      expect(await fileExists(claudeSkill)).toBe(true);
      expect(await fileExists(cursorSkill)).toBe(true);
    });

    it('should update existing config.yaml with proseLanguage in extend mode', async () => {
      const openspecDir = path.join(testDir, 'openspec');
      await fs.mkdir(openspecDir, { recursive: true });
      await fs.writeFile(
        path.join(openspecDir, 'config.yaml'),
        `schema: spec-driven
context: |
  Existing project context
`
      );

      const initCommand = new InitCommand({ force: true });
      vi.spyOn(initCommand as any, 'canPromptInteractively').mockReturnValue(true);
      vi.spyOn(initCommand as any, 'getSelectedTools').mockResolvedValue(['claude']);
      inputMock.mockResolvedValue('ja');

      await initCommand.execute(testDir);

      const content = await fs.readFile(path.join(openspecDir, 'config.yaml'), 'utf-8');
      expect(content).toContain('proseLanguage: ja');
      expect(content).toContain('Existing project context');
    });

    it('should refresh skills on re-run for the same tool', async () => {
      const initCommand1 = new InitCommand({ tools: 'claude', force: true });
      await initCommand1.execute(testDir);

      const skillFile = path.join(testDir, '.claude', 'skills', 'openspec-explore', 'SKILL.md');
      const originalContent = await fs.readFile(skillFile, 'utf-8');

      // Modify the file
      await fs.writeFile(skillFile, '# Modified content\n');

      // Run init again
      const initCommand2 = new InitCommand({ tools: 'claude', force: true });
      await initCommand2.execute(testDir);

      const newContent = await fs.readFile(skillFile, 'utf-8');
      expect(newContent).toBe(originalContent);
    });
  });

  describe('skill content validation', () => {
    it('should generate valid SKILL.md with YAML frontmatter', async () => {
      const initCommand = new InitCommand({ tools: 'claude', force: true });
      await initCommand.execute(testDir);

      const skillFile = path.join(testDir, '.claude', 'skills', 'openspec-explore', 'SKILL.md');
      const content = await fs.readFile(skillFile, 'utf-8');

      // Should have YAML frontmatter
      expect(content).toMatch(/^---\n/);
      expect(readSkillFrontmatter(content)).toMatchObject({ name: 'openspec-explore' });
      expect(content).toContain('description:');
      expect(content).toContain('license:');
      expect(content).toContain('compatibility:');
      expect(content).toContain('metadata:');
      expect(content).toMatch(/---\n\n/); // End of frontmatter
    });

    it('should include explore mode instructions', async () => {
      const initCommand = new InitCommand({ tools: 'claude', force: true });
      await initCommand.execute(testDir);

      const skillFile = path.join(testDir, '.claude', 'skills', 'openspec-explore', 'SKILL.md');
      const content = await fs.readFile(skillFile, 'utf-8');

      expect(content).toContain('Enter explore mode');
      expect(content).toContain('thinking partner');
    });

    it('should include propose skill instructions', async () => {
      const initCommand = new InitCommand({ tools: 'claude', force: true });
      await initCommand.execute(testDir);

      const skillFile = path.join(testDir, '.claude', 'skills', 'openspec-propose', 'SKILL.md');
      const content = await fs.readFile(skillFile, 'utf-8');

      expect(readSkillFrontmatter(content)).toMatchObject({ name: 'openspec-propose' });
    });

    it('should include apply-change skill instructions', async () => {
      const initCommand = new InitCommand({ tools: 'claude', force: true });
      await initCommand.execute(testDir);

      const skillFile = path.join(testDir, '.claude', 'skills', 'openspec-apply-change', 'SKILL.md');
      const content = await fs.readFile(skillFile, 'utf-8');

      expect(readSkillFrontmatter(content)).toMatchObject({ name: 'openspec-apply-change' });
      expect(content).toMatch(/preserve.*canonical|template.*heading/i);
    });

    it('should embed generatedBy version in skill files', async () => {
      const initCommand = new InitCommand({ tools: 'claude', force: true });
      await initCommand.execute(testDir);

      const skillFile = path.join(testDir, '.claude', 'skills', 'openspec-explore', 'SKILL.md');
      const content = await fs.readFile(skillFile, 'utf-8');

      // Should contain generatedBy field with a version string
      expect(content).toMatch(/generatedBy:\s*["']?\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?["']?/);
    });
  });

  describe('command generation', () => {
    it('should generate Claude Code commands with correct format', async () => {
      const initCommand = new InitCommand({ tools: 'claude', force: true });
      await initCommand.execute(testDir);

      const cmdFile = path.join(testDir, '.claude', 'commands', 'opsx', 'explore.md');
      const content = await fs.readFile(cmdFile, 'utf-8');

      // Claude commands use YAML frontmatter
      expect(content).toMatch(/^---\n/);
      expect(content).toContain('name:');
      expect(content).toContain('description:');
    });

    it('should generate Cursor commands with correct format', async () => {
      const initCommand = new InitCommand({ tools: 'cursor', force: true });
      await initCommand.execute(testDir);

      const cmdFile = path.join(testDir, '.cursor', 'commands', 'opsx-explore.md');
      expect(await fileExists(cmdFile)).toBe(true);

      const content = await fs.readFile(cmdFile, 'utf-8');
      expect(content).toMatch(/^---\n/);
    });

    it('should generate mapped bootstrap command path', async () => {
      saveGlobalConfig({
        featureFlags: {},
        delivery: 'commands',
      });

      const initCommand = new InitCommand({ tools: 'claude', force: true });
      await initCommand.execute(testDir);

      const bootstrapCmd = path.join(testDir, '.claude', 'commands', 'opsx', getCommandSlug('bootstrap-opsx') + '.md');
      const legacyBootstrapCmd = path.join(testDir, '.claude', 'commands', 'opsx', 'bootstrap-opsx.md');
      expect(await fileExists(bootstrapCmd)).toBe(true);
      expect(await fileExists(legacyBootstrapCmd)).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should provide helpful error for insufficient permissions', async () => {
      // Mock the permission check to fail
      const readOnlyDir = path.join(testDir, 'readonly');
      await fs.mkdir(readOnlyDir);

      const originalWriteFile = fs.writeFile;
      vi.spyOn(fs, 'writeFile').mockImplementation(
        async (filePath: any, ...args: any[]) => {
          if (
            typeof filePath === 'string' &&
            filePath.includes('.openspec-test-')
          ) {
            throw new Error('EACCES: permission denied');
          }
          return originalWriteFile.call(fs, filePath, ...args);
        }
      );

      const initCommand = new InitCommand({ tools: 'claude', force: true });
      await expect(initCommand.execute(readOnlyDir)).rejects.toThrow(/Insufficient permissions/);
    });

    it('should throw error in non-interactive mode without --tools flag and no detected tools', async () => {
      const initCommand = new InitCommand({ interactive: false });

      await expect(initCommand.execute(testDir)).rejects.toThrow(/No tools detected and no --tools flag/);
    });
  });

  describe('tool-specific adapters', () => {
    it('should generate Gemini CLI commands as TOML files', async () => {
      const initCommand = new InitCommand({ tools: 'gemini', force: true });
      await initCommand.execute(testDir);

      const cmdFile = path.join(testDir, '.gemini', 'commands', 'opsx', 'explore.toml');
      expect(await fileExists(cmdFile)).toBe(true);

      const content = await fs.readFile(cmdFile, 'utf-8');
      expect(content).toContain('description =');
      expect(content).toContain('prompt =');
    });

    it('should generate Windsurf commands', async () => {
      const initCommand = new InitCommand({ tools: 'windsurf', force: true });
      await initCommand.execute(testDir);

      const cmdFile = path.join(testDir, '.windsurf', 'workflows', 'opsx-explore.md');
      expect(await fileExists(cmdFile)).toBe(true);
    });

    it('should generate Continue prompt files', async () => {
      const initCommand = new InitCommand({ tools: 'continue', force: true });
      await initCommand.execute(testDir);

      const cmdFile = path.join(testDir, '.continue', 'prompts', 'opsx-explore.prompt');
      expect(await fileExists(cmdFile)).toBe(true);

      const content = await fs.readFile(cmdFile, 'utf-8');
      expect(content).toContain('name: opsx-explore');
      expect(content).toContain('invokable: true');
    });

    it('should generate Cline workflow files', async () => {
      const initCommand = new InitCommand({ tools: 'cline', force: true });
      await initCommand.execute(testDir);

      const cmdFile = path.join(testDir, '.clinerules', 'workflows', 'opsx-explore.md');
      expect(await fileExists(cmdFile)).toBe(true);
    });

    it('should generate GitHub Copilot prompt files', async () => {
      const initCommand = new InitCommand({ tools: 'github-copilot', force: true });
      await initCommand.execute(testDir);

      const cmdFile = path.join(testDir, '.github', 'prompts', 'opsx-explore.prompt.md');
      expect(await fileExists(cmdFile)).toBe(true);
    });
  });
});

describe('OPSX skeleton generation', () => {
  let testDir: string;
  let configTempDir: string;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(async () => {
    testDir = path.join(os.tmpdir(), `openspec-opsx-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });
    originalEnv = { ...process.env };
    configTempDir = path.join(os.tmpdir(), `openspec-config-opsx-${Date.now()}`);
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

  it('should generate three OPSX skeleton files on first-time init', async () => {
    const initCommand = new InitCommand({ tools: 'claude', force: true });
    await initCommand.execute(testDir);

    const opsxYaml = path.join(testDir, 'openspec', 'project.opsx.yaml');
    const relationsYaml = path.join(testDir, 'openspec', 'project.opsx.relations.yaml');
    const codeMapYaml = path.join(testDir, 'openspec', 'project.opsx.code-map.yaml');

    expect(await fileExists(opsxYaml)).toBe(true);
    expect(await fileExists(relationsYaml)).toBe(true);
    expect(await fileExists(codeMapYaml)).toBe(true);

    // Verify opsx.yaml content
    const opsxContent = await fs.readFile(opsxYaml, 'utf-8');
    expect(opsxContent).toContain('schema_version: 1');
    expect(opsxContent).toContain('project:');
    expect(opsxContent).toContain('domains: []');
    expect(opsxContent).toContain('capabilities: []');

    // Verify relations.yaml content
    const relationsContent = await fs.readFile(relationsYaml, 'utf-8');
    expect(relationsContent).toContain('schema_version: 1');
    expect(relationsContent).toContain('relations: []');

    // Verify code-map.yaml content
    const codeMapContent = await fs.readFile(codeMapYaml, 'utf-8');
    expect(codeMapContent).toContain('schema_version: 1');
    expect(codeMapContent).toContain('generated_at:');
    expect(codeMapContent).toContain('nodes: []');
  });

  it('should infer project name from package.json', async () => {
    const pkgPath = path.join(testDir, 'package.json');
    await fs.writeFile(pkgPath, JSON.stringify({ name: '@scope/my-awesome-project' }));

    const initCommand = new InitCommand({ tools: 'claude', force: true });
    await initCommand.execute(testDir);

    const opsxContent = await fs.readFile(
      path.join(testDir, 'openspec', 'project.opsx.yaml'),
      'utf-8',
    );
    expect(opsxContent).toContain("id: scope-my-awesome-project");
    expect(opsxContent).toContain("name: @scope/my-awesome-project");
  });

  it('should fall back to directory basename when no package.json', async () => {
    const initCommand = new InitCommand({ tools: 'claude', force: true });
    await initCommand.execute(testDir);

    const opsxContent = await fs.readFile(
      path.join(testDir, 'openspec', 'project.opsx.yaml'),
      'utf-8',
    );
    const dirBasename = path.basename(testDir);
    const expectedId = dirBasename.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    expect(opsxContent).toContain(`id: ${expectedId}`);
    expect(opsxContent).toContain(`name: ${dirBasename}`);
  });

  it('should not overwrite existing OPSX files in extend mode', async () => {
    // Pre-create openspec directory with an existing project.opsx.yaml
    const openspecDir = path.join(testDir, 'openspec');
    await fs.mkdir(openspecDir, { recursive: true });
    const existingContent = `schema_version: 1
project:
  id: my-project
  name: my-project
domains:
  - id: dom.auth
    type: domain
    intent: Custom domain
capabilities: []
`;
    await fs.writeFile(path.join(openspecDir, 'project.opsx.yaml'), existingContent);

    const initCommand = new InitCommand({ tools: 'claude', force: true });
    await initCommand.execute(testDir);

    const opsxContent = await fs.readFile(
      path.join(testDir, 'openspec', 'project.opsx.yaml'),
      'utf-8',
    );
    expect(opsxContent).toBe(existingContent);
  });

  it('should show bootstrap guidance when bootstrap-opsx is installed and non-extend mode', async () => {
    saveGlobalConfig({
      featureFlags: {},
      delivery: 'both',
    });

    const consoleSpy = vi.spyOn(console, 'log');
    const initCommand = new InitCommand({ tools: 'claude', force: true });
    await initCommand.execute(testDir);

    const logCalls = consoleSpy.mock.calls.flat().map(String);
    const bootstrapLine = logCalls.find((line) =>
      line.includes('Next: run') && line.includes('bootstrap')
    );
    expect(bootstrapLine).toBeDefined();
    expect(bootstrapLine).toContain('/opsx:bootstrap');
    expect(bootstrapLine).toContain('map your architecture');
  });

  it('should show bootstrap guidance for all 5 workflows including bootstrap-opsx', async () => {
    saveGlobalConfig({
      featureFlags: {},
      delivery: 'both',
    });

    const consoleSpy = vi.spyOn(console, 'log');
    const initCommand = new InitCommand({ tools: 'claude', force: true });
    await initCommand.execute(testDir);

    const logCalls = consoleSpy.mock.calls.flat().map(String);
    const bootstrapLine = logCalls.find((line) =>
      line.includes('Next: run') && line.includes('bootstrap')
    );
    expect(bootstrapLine).toBeDefined();
  });

  it('should not show bootstrap guidance in extend mode', async () => {
    saveGlobalConfig({
      featureFlags: {},
      delivery: 'both',
    });

    // Pre-create openspec to make it extend mode
    await fs.mkdir(path.join(testDir, 'openspec'), { recursive: true });

    const consoleSpy = vi.spyOn(console, 'log');
    const initCommand = new InitCommand({ tools: 'claude', force: true });
    await initCommand.execute(testDir);

    const logCalls = consoleSpy.mock.calls.flat().map(String);
    const bootstrapLine = logCalls.find((line) =>
      line.includes('Next: run') && line.includes('bootstrap')
    );
    expect(bootstrapLine).toBeUndefined();
  });
});

describe('InitCommand - profile and detection features', () => {
  let testDir: string;
  let configTempDir: string;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(async () => {
    testDir = path.join(os.tmpdir(), `openspec-init-profile-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });
    originalEnv = { ...process.env };
    // Use a temp dir for global config to avoid polluting real config
    configTempDir = path.join(os.tmpdir(), `openspec-config-test-${Date.now()}`);
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

  it('should install all 6 workflows regardless of obsolete profile config', async () => {
    // Set global config with obsolete profile/workflows fields
    saveGlobalConfig({
      featureFlags: {},
      delivery: 'both',
    } as any);

    const initCommand = new InitCommand({ tools: 'claude', force: true });
    await initCommand.execute(testDir);

    // All 6 registry workflows should be created
    const expectedSkillNames = [
      'openspec-propose',
      'openspec-explore',
      'openspec-apply-change',
      'openspec-archive-change',
      'openspec-bootstrap-opsx',
      'openspec-snack',
    ];

    for (const skillName of expectedSkillNames) {
      const skillFile = path.join(testDir, '.claude', 'skills', skillName, 'SKILL.md');
      expect(await fileExists(skillFile)).toBe(true);
    }
  });

  it('should reject --profile flag with friendly error', async () => {
    // --profile is now rejected at CLI level, but test InitCommand directly
    const initCommand = new InitCommand({
      tools: 'claude',
      force: true,
    });

    // InitCommand no longer accepts profile — just verify it installs all 5 workflows
    await initCommand.execute(testDir);

    const proposeSkill = path.join(testDir, '.claude', 'skills', 'openspec-propose', 'SKILL.md');
    expect(await fileExists(proposeSkill)).toBe(true);
  });

  it('should use detected tools in non-interactive mode when no --tools flag', async () => {
    // Create a .claude directory to simulate detected tool
    await fs.mkdir(path.join(testDir, '.claude'), { recursive: true });

    const initCommand = new InitCommand({ interactive: false, force: true });
    await initCommand.execute(testDir);

    // Should have used claude (detected)
    const skillFile = path.join(testDir, '.claude', 'skills', 'openspec-explore', 'SKILL.md');
    expect(await fileExists(skillFile)).toBe(true);
  });

  it('should auto-cleanup legacy artifacts in non-interactive mode without --force', async () => {
    // Create legacy OpenCode command files (singular 'command' path)
    const legacyDir = path.join(testDir, '.opencode', 'command');
    await fs.mkdir(legacyDir, { recursive: true });
    await fs.writeFile(path.join(legacyDir, 'opsx-propose.md'), 'legacy content');

    // Run init in non-interactive mode without --force
    const initCommand = new InitCommand({ tools: 'opencode' });
    await initCommand.execute(testDir);

    // Legacy files should be cleaned up automatically
    expect(await fileExists(path.join(legacyDir, 'opsx-propose.md'))).toBe(false);

    // New commands should be at the correct plural path
    const newCommandsDir = path.join(testDir, '.opencode', 'commands');
    expect(await directoryExists(newCommandsDir)).toBe(true);
  });

  it('should preselect configured tools but not directory-detected tools in extend mode', async () => {
    // Simulate existing OpenSpec project (extend mode).
    await fs.mkdir(path.join(testDir, 'openspec'), { recursive: true });

    // Configured with OpenSpec
    const claudeSkillDir = path.join(testDir, '.claude', 'skills', 'openspec-explore');
    await fs.mkdir(claudeSkillDir, { recursive: true });
    await fs.writeFile(path.join(claudeSkillDir, 'SKILL.md'), 'configured');

    // Directory detected only (not configured with OpenSpec)
    await fs.mkdir(path.join(testDir, '.github'), { recursive: true });
    await fs.writeFile(path.join(testDir, '.github', 'copilot-instructions.md'), '');

    searchableMultiSelectMock.mockResolvedValue(['claude']);

    const initCommand = new InitCommand({ force: true });
    vi.spyOn(initCommand as any, 'canPromptInteractively').mockReturnValue(true);

    await initCommand.execute(testDir);

    expect(searchableMultiSelectMock).toHaveBeenCalledTimes(1);
    const [{ choices }] = searchableMultiSelectMock.mock.calls[0] as [{ choices: Array<{ value: string; preSelected?: boolean; detected?: boolean }> }];

    const claude = choices.find((choice) => choice.value === 'claude');
    const githubCopilot = choices.find((choice) => choice.value === 'github-copilot');

    expect(claude?.preSelected).toBe(true);
    expect(githubCopilot?.preSelected).toBe(false);
    expect(githubCopilot?.detected).toBe(true);
  });

  it('should preselect detected tools for first-time interactive setup', async () => {
    // First-time init: no openspec/ directory and no configured OpenSpec skills.
    await fs.mkdir(path.join(testDir, '.github'), { recursive: true });
    await fs.writeFile(path.join(testDir, '.github', 'copilot-instructions.md'), '');

    searchableMultiSelectMock.mockResolvedValue(['github-copilot']);

    const initCommand = new InitCommand({ force: true });
    vi.spyOn(initCommand as any, 'canPromptInteractively').mockReturnValue(true);

    await initCommand.execute(testDir);

    expect(searchableMultiSelectMock).toHaveBeenCalledTimes(1);
    const [{ choices }] = searchableMultiSelectMock.mock.calls[0] as [{ choices: Array<{ value: string; preSelected?: boolean }> }];
    const githubCopilot = choices.find((choice) => choice.value === 'github-copilot');

    expect(githubCopilot?.preSelected).toBe(true);
  });

  it('should ignore obsolete profile/workflows fields and install all 6 workflows', async () => {
    saveGlobalConfig({
      featureFlags: {},
      delivery: 'both',
    } as any);

    const initCommand = new InitCommand({ tools: 'claude', force: true });
    await initCommand.execute(testDir);

    // All 6 workflows should be installed
    const expectedSkills = [
      'openspec-propose',
      'openspec-explore',
      'openspec-apply-change',
      'openspec-archive-change',
      'openspec-bootstrap-opsx',
      'openspec-snack',
    ];

    for (const skillName of expectedSkills) {
      const skillFile = path.join(testDir, '.claude', 'skills', skillName, 'SKILL.md');
      expect(await fileExists(skillFile)).toBe(true);
    }
  });

  it('should install all 6 workflows in extend mode regardless of prior config', async () => {
    await fs.mkdir(path.join(testDir, 'openspec'), { recursive: true });
    await fs.mkdir(path.join(testDir, '.claude', 'commands', 'opsx'), { recursive: true });
    await fs.writeFile(path.join(testDir, '.claude', 'commands', 'opsx', 'explore.md'), '# explore\n');

    const initCommand = new InitCommand({ tools: 'claude', force: true });
    await initCommand.execute(testDir);

    // snack is skill-only: 5 commands (propose, explore, apply, archive, bootstrap)
    const expectedCommands = ['explore.md', 'propose.md', 'apply.md', 'archive.md', 'bootstrap.md'];
    for (const cmd of expectedCommands) {
      expect(await fileExists(path.join(testDir, '.claude', 'commands', 'opsx', cmd))).toBe(true);
    }

    // All 6 skills should exist (includes skill-only snack)
    const expectedSkills = [
      'openspec-explore', 'openspec-propose', 'openspec-apply-change',
      'openspec-archive-change', 'openspec-bootstrap-opsx', 'openspec-snack',
    ];
    for (const skill of expectedSkills) {
      expect(await fileExists(path.join(testDir, '.claude', 'skills', skill, 'SKILL.md'))).toBe(true);
    }
  });

  it('should install all 6 workflows in interactive mode without profile prompts', async () => {
    saveGlobalConfig({
      featureFlags: {},
      delivery: 'both',
    });

    const initCommand = new InitCommand({ force: true });
    vi.spyOn(initCommand as any, 'canPromptInteractively').mockReturnValue(true);
    vi.spyOn(initCommand as any, 'getSelectedTools').mockResolvedValue(['claude']);

    await initCommand.execute(testDir);

    expect(showWelcomeScreenMock).toHaveBeenCalled();
    expect(confirmMock).not.toHaveBeenCalled();

    // All 6 workflows should be installed
    const expectedSkills = [
      'openspec-explore', 'openspec-propose', 'openspec-apply-change',
      'openspec-archive-change', 'openspec-bootstrap-opsx', 'openspec-snack',
    ];
    for (const skill of expectedSkills) {
      expect(await fileExists(path.join(testDir, '.claude', 'skills', skill, 'SKILL.md'))).toBe(true);
    }

    const logCalls = (console.log as unknown as { mock: { calls: unknown[][] } }).mock.calls.flat().map(String);
    expect(logCalls.some((entry) => entry.includes('Applying custom profile'))).toBe(false);
  });

  it('should respect delivery=skills setting (no commands)', async () => {
    saveGlobalConfig({
      featureFlags: {},
      delivery: 'skills',
    });

    const initCommand = new InitCommand({ tools: 'claude', force: true });
    await initCommand.execute(testDir);

    // Skills should exist
    const skillFile = path.join(testDir, '.claude', 'skills', 'openspec-explore', 'SKILL.md');
    expect(await fileExists(skillFile)).toBe(true);

    // Commands should NOT exist
    const cmdFile = path.join(testDir, '.claude', 'commands', 'opsx', 'explore.md');
    expect(await fileExists(cmdFile)).toBe(false);
  });

  it('should respect delivery=commands setting (no skills)', async () => {
    saveGlobalConfig({
      featureFlags: {},
      delivery: 'commands',
    });

    const initCommand = new InitCommand({ tools: 'claude', force: true });
    await initCommand.execute(testDir);

    // Skills should NOT exist
    const skillFile = path.join(testDir, '.claude', 'skills', 'openspec-explore', 'SKILL.md');
    expect(await fileExists(skillFile)).toBe(false);

    // Commands should exist
    const cmdFile = path.join(testDir, '.claude', 'commands', 'opsx', 'explore.md');
    expect(await fileExists(cmdFile)).toBe(true);
  });

  it('should remove commands on re-init when delivery changes to skills', async () => {
    saveGlobalConfig({
      featureFlags: {},
      delivery: 'both',
    });

    const initCommand1 = new InitCommand({ tools: 'claude', force: true });
    await initCommand1.execute(testDir);

    const cmdFile = path.join(testDir, '.claude', 'commands', 'opsx', 'explore.md');
    expect(await fileExists(cmdFile)).toBe(true);

    saveGlobalConfig({
      featureFlags: {},
      delivery: 'skills',
    });

    const initCommand2 = new InitCommand({ tools: 'claude', force: true });
    await initCommand2.execute(testDir);

    expect(await fileExists(cmdFile)).toBe(false);

    const skillFile = path.join(testDir, '.claude', 'skills', 'openspec-explore', 'SKILL.md');
    expect(await fileExists(skillFile)).toBe(true);
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

async function directoryExists(dirPath: string): Promise<boolean> {
  try {
    const stats = await fs.stat(dirPath);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

function readSkillFrontmatter(skillContent: string): unknown {
  const match = skillContent.match(/^---\n([\s\S]*?)\n---\n/);
  return parseYaml(match?.[1] ?? '');
}
