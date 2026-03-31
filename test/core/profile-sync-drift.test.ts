import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  hasProjectConfigDrift,
  WORKFLOW_TO_SKILL_DIR,
} from '../../src/core/profile-sync-drift.js';
import { getCommandSlug } from '../../src/core/shared/index.js';
import { CORE_WORKFLOWS } from '../../src/core/profiles.js';
import { CommandAdapterRegistry } from '../../src/core/command-generation/index.js';

function writeSkill(projectDir: string, workflowId: string): void {
  const skillDirName = WORKFLOW_TO_SKILL_DIR[workflowId as keyof typeof WORKFLOW_TO_SKILL_DIR];
  const skillPath = path.join(projectDir, '.claude', 'skills', skillDirName, 'SKILL.md');
  fs.mkdirSync(path.dirname(skillPath), { recursive: true });
  fs.writeFileSync(skillPath, `name: ${skillDirName}\n`);
}

function writeCommand(projectDir: string, workflowId: string): void {
  const adapter = CommandAdapterRegistry.get('claude');
  if (!adapter) throw new Error('Claude adapter unavailable in test environment');
  const cmdPath = adapter.getFilePath(getCommandSlug(workflowId as Parameters<typeof getCommandSlug>[0]));
  const fullPath = path.isAbsolute(cmdPath) ? cmdPath : path.join(projectDir, cmdPath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, `# ${workflowId}\n`);
}

function writeCodexLegacyCommand(workflowId: string): void {
  const codexHome = process.env.CODEX_HOME;
  if (!codexHome) {
    throw new Error('CODEX_HOME must be set for Codex drift tests');
  }

  const promptPath = path.join(
    path.resolve(codexHome),
    'prompts',
    `opsx-${getCommandSlug(workflowId as Parameters<typeof getCommandSlug>[0])}.md`
  );
  fs.mkdirSync(path.dirname(promptPath), { recursive: true });
  fs.writeFileSync(promptPath, `# ${workflowId}\n`);
}

function setupCoreSkills(projectDir: string): void {
  for (const workflow of CORE_WORKFLOWS) {
    writeSkill(projectDir, workflow);
  }
}

function setupCoreCommands(projectDir: string): void {
  for (const workflow of CORE_WORKFLOWS) {
    writeCommand(projectDir, workflow);
  }
}

describe('profile sync drift detection', () => {
  let tempDir: string;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    tempDir = path.join(os.tmpdir(), `openspec-profile-sync-drift-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    fs.mkdirSync(path.join(tempDir, 'openspec'), { recursive: true });
    process.env.CODEX_HOME = path.join(tempDir, 'codex-home');
  });

  afterEach(() => {
    process.env = originalEnv;
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('detects drift for skills-only delivery when commands still exist', () => {
    setupCoreSkills(tempDir);
    setupCoreCommands(tempDir);

    const hasDrift = hasProjectConfigDrift(tempDir, CORE_WORKFLOWS, 'skills');
    expect(hasDrift).toBe(true);
  });

  it('detects drift for commands-only delivery when skills still exist', () => {
    setupCoreCommands(tempDir);
    setupCoreSkills(tempDir);

    const hasDrift = hasProjectConfigDrift(tempDir, CORE_WORKFLOWS, 'commands');
    expect(hasDrift).toBe(true);
  });

  it('detects drift when required profile workflow files are missing', () => {
    writeSkill(tempDir, 'explore');

    const hasDrift = hasProjectConfigDrift(tempDir, CORE_WORKFLOWS, 'both');
    expect(hasDrift).toBe(true);
  });

  it('returns false when project files match core profile and delivery', () => {
    setupCoreSkills(tempDir);
    setupCoreCommands(tempDir);

    const hasDrift = hasProjectConfigDrift(tempDir, CORE_WORKFLOWS, 'both');
    expect(hasDrift).toBe(false);
  });

  it('detects drift when extra workflows are installed for both delivery', () => {
    setupCoreSkills(tempDir);
    setupCoreCommands(tempDir);
    writeSkill(tempDir, 'sync');
    writeCommand(tempDir, 'sync');

    const hasDrift = hasProjectConfigDrift(tempDir, CORE_WORKFLOWS, 'both');
    expect(hasDrift).toBe(true);
  });

  it('detects drift when codex only has legacy command files in commands delivery', () => {
    for (const workflow of CORE_WORKFLOWS) {
      writeCodexLegacyCommand(workflow);
    }

    const hasDrift = hasProjectConfigDrift(tempDir, CORE_WORKFLOWS, 'commands');
    expect(hasDrift).toBe(true);
  });

  it('treats codex skills as the desired surface even in commands delivery', () => {
    for (const workflow of CORE_WORKFLOWS) {
      const skillDirName = WORKFLOW_TO_SKILL_DIR[workflow as keyof typeof WORKFLOW_TO_SKILL_DIR];
      const skillPath = path.join(tempDir, '.codex', 'skills', skillDirName, 'SKILL.md');
      fs.mkdirSync(path.dirname(skillPath), { recursive: true });
      fs.writeFileSync(skillPath, `name: ${skillDirName}\n`);
    }

    const hasDrift = hasProjectConfigDrift(tempDir, CORE_WORKFLOWS, 'commands');
    expect(hasDrift).toBe(false);
  });
});
