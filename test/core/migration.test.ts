import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'path';
import os from 'os';
import { randomUUID } from 'crypto';
import fs from 'node:fs';
import { promises as fsp } from 'node:fs';
import { AI_TOOLS, type AIToolOption } from '../../src/core/config.js';
import { saveGlobalConfig, getGlobalConfigPath } from '../../src/core/global-config.js';
import { migrateIfNeeded, scanInstalledWorkflows } from '../../src/core/migration.js';

const CLAUDE_TOOL = AI_TOOLS.find((tool) => tool.value === 'claude') as AIToolOption | undefined;

function ensureClaudeTool(): AIToolOption {
  if (!CLAUDE_TOOL) {
    throw new Error('Claude tool definition not found');
  }
  return CLAUDE_TOOL;
}

async function writeSkill(projectPath: string, dirName: string): Promise<void> {
  const skillFile = path.join(projectPath, '.claude', 'skills', dirName, 'SKILL.md');
  await fsp.mkdir(path.dirname(skillFile), { recursive: true });
  await fsp.writeFile(skillFile, 'name: test\n', 'utf-8');
}

function readRawConfig(): Record<string, unknown> {
  return JSON.parse(fs.readFileSync(getGlobalConfigPath(), 'utf-8')) as Record<string, unknown>;
}

describe('migration', () => {
  let projectDir: string;
  let configHome: string;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(async () => {
    projectDir = path.join(os.tmpdir(), `openspec-migration-project-${randomUUID()}`);
    configHome = path.join(os.tmpdir(), `openspec-migration-config-${randomUUID()}`);
    await fsp.mkdir(projectDir, { recursive: true });
    await fsp.mkdir(configHome, { recursive: true });
    originalEnv = { ...process.env };
    process.env.XDG_CONFIG_HOME = configHome;
  });

  afterEach(async () => {
    process.env = originalEnv;
    await fsp.rm(projectDir, { recursive: true, force: true });
    await fsp.rm(configHome, { recursive: true, force: true });
  });

  it('cleans up obsolete profile/workflows/delivery fields from config', async () => {
    const configPath = getGlobalConfigPath();
    const configDir = path.dirname(configPath);
    await fsp.mkdir(configDir, { recursive: true });
    await fsp.writeFile(configPath, JSON.stringify({
      featureFlags: {},
      profile: 'core',
      delivery: 'both',
      workflows: ['explore'],
    }));

    await writeSkill(projectDir, 'openspec-explore');

    migrateIfNeeded(projectDir, [ensureClaudeTool()]);

    const config = readRawConfig();
    expect(config.profile).toBeUndefined();
    expect(config.workflows).toBeUndefined();
    expect(config.delivery).toBeUndefined();
  });

  it('does not infer delivery from artifacts (delivery is removed)', async () => {
    const configPath = getGlobalConfigPath();
    const configDir = path.dirname(configPath);
    await fsp.mkdir(configDir, { recursive: true });
    await fsp.writeFile(configPath, JSON.stringify({
      featureFlags: {},
      profile: 'custom',
      workflows: ['explore'],
    }));

    await writeSkill(projectDir, 'openspec-explore');

    migrateIfNeeded(projectDir, [ensureClaudeTool()]);

    const config = readRawConfig();
    expect(config.profile).toBeUndefined();
    expect(config.workflows).toBeUndefined();
    expect(config.delivery).toBeUndefined();
  });

  it('does not migrate when no obsolete fields exist', async () => {
    const configPath = getGlobalConfigPath();
    const configDir = path.dirname(configPath);
    await fsp.mkdir(configDir, { recursive: true });
    await fsp.writeFile(configPath, JSON.stringify({
      featureFlags: {},
      optimization: { enabled: true },
    }));

    await writeSkill(projectDir, 'openspec-explore');

    migrateIfNeeded(projectDir, [ensureClaudeTool()]);

    const config = readRawConfig();
    expect(config.profile).toBeUndefined();
    expect(config.delivery).toBeUndefined();
    expect(config.workflows).toBeUndefined();
  });

  it('does not create config when no config file exists', async () => {
    migrateIfNeeded(projectDir, [ensureClaudeTool()]);

    expect(fs.existsSync(getGlobalConfigPath())).toBe(false);
  });

  it('ignores unknown custom skill files when scanning workflows', async () => {
    await writeSkill(projectDir, 'my-custom-skill');

    const workflows = scanInstalledWorkflows(projectDir, [ensureClaudeTool()]);
    expect(workflows).toEqual([]);

    migrateIfNeeded(projectDir, [ensureClaudeTool()]);
    expect(fs.existsSync(getGlobalConfigPath())).toBe(false);
  });

  it('detects installed workflows from skills only (commands ignored)', async () => {
    await writeSkill(projectDir, 'openspec-explore');

    const workflows = scanInstalledWorkflows(projectDir, [ensureClaudeTool()]);
    expect(workflows).toContain('explore');
    expect(workflows).not.toContain('apply');
  });
});
