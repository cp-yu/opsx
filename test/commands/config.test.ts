import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { Command } from 'commander';

describe('config command integration', () => {
  // These tests use real file system operations with XDG_CONFIG_HOME override
  let tempDir: string;
  let originalEnv: NodeJS.ProcessEnv;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Create unique temp directory for each test
    tempDir = path.join(os.tmpdir(), `openspec-config-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    fs.mkdirSync(tempDir, { recursive: true });

    // Save original env and set XDG_CONFIG_HOME
    originalEnv = { ...process.env };
    process.env.XDG_CONFIG_HOME = tempDir;

    // Spy on console.error
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore original env
    process.env = originalEnv;

    // Clean up temp directory
    fs.rmSync(tempDir, { recursive: true, force: true });

    // Restore spies
    consoleErrorSpy.mockRestore();

    // Reset module cache to pick up new XDG_CONFIG_HOME
    vi.resetModules();
  });

  it('should use XDG_CONFIG_HOME for config path', async () => {
    const { getGlobalConfigPath } = await import('../../src/core/global-config.js');
    const configPath = getGlobalConfigPath();
    expect(configPath).toBe(path.join(tempDir, 'openspec', 'config.json'));
  });

  it('should save and load config correctly', async () => {
    const { getGlobalConfig, saveGlobalConfig } = await import('../../src/core/global-config.js');

    saveGlobalConfig({ featureFlags: { test: true } });
    const config = getGlobalConfig();
    expect(config.featureFlags).toEqual({ test: true });
  });

  it('should return defaults when config file does not exist', async () => {
    const { getGlobalConfig, getGlobalConfigPath } = await import('../../src/core/global-config.js');

    const configPath = getGlobalConfigPath();
    // Make sure config doesn't exist
    if (fs.existsSync(configPath)) {
      fs.unlinkSync(configPath);
    }

    const config = getGlobalConfig();
    expect(config.featureFlags).toEqual({});
  });

  it('should preserve unknown fields', async () => {
    const { getGlobalConfig, getGlobalConfigDir } = await import('../../src/core/global-config.js');

    const configDir = getGlobalConfigDir();
    fs.mkdirSync(configDir, { recursive: true });
    fs.writeFileSync(path.join(configDir, 'config.json'), JSON.stringify({
      featureFlags: {},
      customField: 'preserved',
    }));

    const config = getGlobalConfig();
    expect((config as Record<string, unknown>).customField).toBe('preserved');
  });

  it('should handle invalid JSON gracefully', async () => {
    const { getGlobalConfig, getGlobalConfigDir } = await import('../../src/core/global-config.js');

    const configDir = getGlobalConfigDir();
    fs.mkdirSync(configDir, { recursive: true });
    fs.writeFileSync(path.join(configDir, 'config.json'), '{ invalid json }');

    const config = getGlobalConfig();
    // Should return defaults
    expect(config.featureFlags).toEqual({});
    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid JSON'));
  });
});

// NOTE: Shell completion registry tests moved to introspect-regression.test.ts

describe('config project command', () => {
  let tempDir: string;
  let originalCwd: string;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    tempDir = path.join(os.tmpdir(), `openspec-project-config-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    fs.mkdirSync(tempDir, { recursive: true });
    originalCwd = process.cwd();
    process.chdir(tempDir);
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    process.chdir(originalCwd);
    fs.rmSync(tempDir, { recursive: true, force: true });
    consoleLogSpy.mockRestore();
    vi.resetModules();
  });

  async function runProjectCommand(args: string[]): Promise<void> {
    const { registerConfigCommand } = await import('../../src/commands/config.js');
    const program = new Command();
    registerConfigCommand(program);
    await program.parseAsync(['node', 'openspec', 'config', 'project', ...args]);
  }

  it('prints normalized project config as JSON', async () => {
    fs.mkdirSync(path.join(tempDir, 'openspec'), { recursive: true });
    fs.writeFileSync(
      path.join(tempDir, 'openspec', 'config.yaml'),
      `schema: spec-driven
proseLanguage: 中文
context: Project context
optimization:
  enabled: false
  optRetries: 1
propose:
  smartRouting: false
apply:
  defaultIsolation: branch
git:
  commitMessage:
    archive: docs/archive.md
    merge: docs/merge.md
  merge:
    strategy: squash
  branch:
    deleteAfterArchive: true
rules:
  proposal:
    - Keep it short
`,
      'utf-8'
    );

    await runProjectCommand(['--json']);

    const output = JSON.parse(consoleLogSpy.mock.calls[0][0]);
    expect(output).toEqual({
      schema: 'spec-driven',
      proseLanguage: '中文',
      context: 'Project context',
      optimization: {
        enabled: false,
        optRetries: 1,
      },
      propose: {
        smartRouting: false,
      },
      apply: {
        defaultIsolation: 'branch',
      },
      git: {
        commitMessage: {
          archive: 'docs/archive.md',
          merge: 'docs/merge.md',
        },
        merge: {
          strategy: 'squash',
        },
        branch: {
          deleteAfterArchive: true,
        },
      },
      rules: {
        proposal: ['Keep it short'],
      },
    });
  });

  it('prints minimal JSON when config.yaml is missing', async () => {
    await runProjectCommand(['--json']);

    expect(JSON.parse(consoleLogSpy.mock.calls[0][0])).toEqual({ rules: {} });
  });

  it('prints YAML-like text without --json', async () => {
    fs.mkdirSync(path.join(tempDir, 'openspec'), { recursive: true });
    fs.writeFileSync(
      path.join(tempDir, 'openspec', 'config.yaml'),
      `schema: spec-driven
proseLanguage: 中文
rules: {}
`,
      'utf-8'
    );

    await runProjectCommand([]);

    const output = consoleLogSpy.mock.calls[0][0];
    expect(output).toContain('schema: spec-driven');
    expect(output).toContain('proseLanguage: 中文');
    expect(output).toContain('rules: {}');
  });
});

describe('config key validation', () => {
  it('rejects unknown top-level keys', async () => {
    const { validateConfigKeyPath } = await import('../../src/core/config-schema.js');
    expect(validateConfigKeyPath('unknownKey').valid).toBe(false);
  });

  it('allows feature flag keys', async () => {
    const { validateConfigKeyPath } = await import('../../src/core/config-schema.js');
    expect(validateConfigKeyPath('featureFlags.someFlag').valid).toBe(true);
  });

  it('rejects deeply nested feature flag keys', async () => {
    const { validateConfigKeyPath } = await import('../../src/core/config-schema.js');
    expect(validateConfigKeyPath('featureFlags.someFlag.extra').valid).toBe(false);
  });

  it('allows delivery key', async () => {
    const { validateConfigKeyPath } = await import('../../src/core/config-schema.js');
    expect(validateConfigKeyPath('delivery').valid).toBe(true);
  });

  it('allows workflows key', async () => {
    const { validateConfigKeyPath } = await import('../../src/core/config-schema.js');
    expect(validateConfigKeyPath('workflows').valid).toBe(true);
  });

  it('allows optimization.enabled key', async () => {
    const { validateConfigKeyPath } = await import('../../src/core/config-schema.js');
    expect(validateConfigKeyPath('optimization.enabled').valid).toBe(true);
  });

  it('allows optimization.optRetries key', async () => {
    const { validateConfigKeyPath } = await import('../../src/core/config-schema.js');
    expect(validateConfigKeyPath('optimization.optRetries').valid).toBe(true);
  });

  it('rejects unsupported optimization nesting', async () => {
    const { validateConfigKeyPath } = await import('../../src/core/config-schema.js');
    expect(validateConfigKeyPath('optimization.enabled.extra').valid).toBe(false);
  });
});

describe('config schema validation', () => {
  it('config schema should reject invalid delivery values', async () => {
    const { validateConfig } = await import('../../src/core/config-schema.js');

    const result = validateConfig({ featureFlags: {}, delivery: 'invalid' });
    expect(result.success).toBe(false);
  });
});
