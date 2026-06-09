import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { parse as parseYaml } from 'yaml';
import {
  materializeProjectConfigDefaults,
  migrateProjectConfigDefaults,
  readProjectConfig,
  validateConfigRules,
  suggestSchemas,
} from '../../src/core/project-config.js';
import {
  buildConfigProjectionBundle,
  normalizeProjectConfig,
  projectConfigForPrompt,
  projectConfigForRuntime,
} from '../../src/core/config-projection.js';

function gitConfig({
  autoCommit = 'auto',
  strategy = 'no-ff',
  deleteAfterArchive = false,
}: {
  autoCommit?: 'auto' | 'manual';
  strategy?: 'no-ff' | 'ff-only' | 'squash';
  deleteAfterArchive?: boolean;
} = {}) {
  return {
    autoCommit,
    archive: {
      commitMessage: {
        convention: 'openspec-archive',
      },
    },
    merge: {
      strategy,
      commitMessage: {
        convention: 'openspec-merge-summary',
      },
    },
    branch: {
      deleteAfterArchive,
    },
  };
}

describe('project-config', () => {
  let tempDir: string;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-test-config-'));
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
    consoleWarnSpy.mockRestore();
  });

  describe('materializeProjectConfigDefaults', () => {
    it('should include only functional disk defaults', () => {
      const defaults = materializeProjectConfigDefaults({ schema: 'spec-driven' });

      expect(defaults).toEqual({
        schema: 'spec-driven',
        optimization: {
          enabled: true,
          optRetries: 2,
        },
        apply: {
          defaultIsolation: 'ask',
        },
        git: gitConfig(),
      });
      expect(defaults).not.toHaveProperty('proseLanguage');
      expect(defaults).not.toHaveProperty('context');
      expect(defaults).not.toHaveProperty('rules');
      expect(defaults).not.toHaveProperty('propose');
    });

    it('should preserve explicit proseLanguage without adding other optional fields', () => {
      const defaults = materializeProjectConfigDefaults({
        schema: 'spec-driven',
        proseLanguage: 'zh-CN',
      });

      expect(defaults.proseLanguage).toBe('zh-CN');
      expect(defaults).not.toHaveProperty('context');
      expect(defaults).not.toHaveProperty('rules');
      expect(defaults).not.toHaveProperty('propose');
      expect(defaults.apply).toEqual({
        defaultIsolation: 'ask',
      });
    });
  });

  describe('migrateProjectConfigDefaults', () => {
    it('should create config.yaml with functional defaults when config is missing', () => {
      fs.mkdirSync(path.join(tempDir, 'openspec'), { recursive: true });

      const result = migrateProjectConfigDefaults(tempDir);
      const configPath = path.join(tempDir, 'openspec', 'config.yaml');
      const content = fs.readFileSync(configPath, 'utf-8');
      const parsed = parseYaml(content);

      expect(result).toEqual({
        status: 'created',
        path: configPath,
      });
      expect(parsed).toEqual({
        schema: 'spec-driven',
        optimization: {
          enabled: true,
          optRetries: 2,
        },
        apply: {
          defaultIsolation: 'ask',
        },
        git: gitConfig(),
      });
    });

    it('should add nested missing defaults without overwriting existing values', () => {
      const configDir = path.join(tempDir, 'openspec');
      fs.mkdirSync(configDir, { recursive: true });
      const configPath = path.join(configDir, 'config.yaml');
      fs.writeFileSync(
        configPath,
        `schema: custom-schema
optimization:
  enabled: false
git:
  merge:
    strategy: squash
context: keep me
`
      );

      const result = migrateProjectConfigDefaults(tempDir);
      const parsed = parseYaml(fs.readFileSync(configPath, 'utf-8'));

      expect(result).toEqual({
        status: 'updated',
        path: configPath,
      });
      expect(parsed.schema).toBe('custom-schema');
      expect(parsed.context).toBe('keep me');
      expect(parsed.optimization.enabled).toBe(false);
      expect(parsed.optimization.optRetries).toBe(2);
      expect(parsed.git.autoCommit).toBe('auto');
      expect(parsed.git.archive.commitMessage.convention).toBe('openspec-archive');
      expect(parsed.git.merge.strategy).toBe('squash');
      expect(parsed.git.merge.commitMessage.convention).toBe('openspec-merge-summary');
      expect(parsed.git.branch.deleteAfterArchive).toBe(false);
      expect(parsed).not.toHaveProperty('propose');
      expect(parsed.apply.defaultIsolation).toBe('ask');
    });

    it('should add defaults through missing nested parents', () => {
      const configDir = path.join(tempDir, 'openspec');
      fs.mkdirSync(configDir, { recursive: true });
      const configPath = path.join(configDir, 'config.yaml');
      fs.writeFileSync(
        configPath,
        `schema: spec-driven
git:
  merge:
    strategy: ff-only
`
      );

      const result = migrateProjectConfigDefaults(tempDir);
      const parsed = parseYaml(fs.readFileSync(configPath, 'utf-8'));

      expect(result).toEqual({
        status: 'updated',
        path: configPath,
      });
      expect(parsed.optimization).toEqual({
        enabled: true,
        optRetries: 2,
      });
      expect(parsed.apply).toEqual({
        defaultIsolation: 'ask',
      });
      expect(parsed.git).toEqual(gitConfig({ strategy: 'ff-only' }));
    });

    it('should not overwrite non-map parents during nested default migration', () => {
      const configDir = path.join(tempDir, 'openspec');
      fs.mkdirSync(configDir, { recursive: true });
      const configPath = path.join(configDir, 'config.yaml');
      fs.writeFileSync(
        configPath,
        `schema: spec-driven
optimization:
git: disabled
`
      );

      const result = migrateProjectConfigDefaults(tempDir);
      const parsed = parseYaml(fs.readFileSync(configPath, 'utf-8'));

      expect(result).toEqual({
        status: 'updated',
        path: configPath,
      });
      expect(parsed.optimization).toBeNull();
      expect(parsed.git).toBe('disabled');
      expect(parsed.apply).toEqual({
        defaultIsolation: 'ask',
      });
    });

    it('should mutate config.yml when config.yaml is missing', () => {
      const configDir = path.join(tempDir, 'openspec');
      fs.mkdirSync(configDir, { recursive: true });
      const ymlPath = path.join(configDir, 'config.yml');
      fs.writeFileSync(ymlPath, 'schema: spec-driven\n');

      const result = migrateProjectConfigDefaults(tempDir);

      expect(result).toEqual({
        status: 'updated',
        path: ymlPath,
      });
      expect(fs.existsSync(path.join(configDir, 'config.yaml'))).toBe(false);
      expect(parseYaml(fs.readFileSync(ymlPath, 'utf-8')).git.merge.strategy).toBe('no-ff');
    });

    it('should leave invalid yaml unchanged and report skipped migration', () => {
      const configDir = path.join(tempDir, 'openspec');
      fs.mkdirSync(configDir, { recursive: true });
      const configPath = path.join(configDir, 'config.yaml');
      const original = 'schema: [unclosed';
      fs.writeFileSync(configPath, original);

      const result = migrateProjectConfigDefaults(tempDir);

      expect(result).toEqual({
        status: 'skipped',
        path: configPath,
        reason: 'invalid-yaml',
      });
      expect(fs.readFileSync(configPath, 'utf-8')).toBe(original);
    });

    it('should leave non-object yaml unchanged and report skipped migration', () => {
      const configDir = path.join(tempDir, 'openspec');
      fs.mkdirSync(configDir, { recursive: true });
      const configPath = path.join(configDir, 'config.yaml');
      const original = '"just a string"\n';
      fs.writeFileSync(configPath, original);

      const result = migrateProjectConfigDefaults(tempDir);

      expect(result).toEqual({
        status: 'skipped',
        path: configPath,
        reason: 'non-object',
      });
      expect(fs.readFileSync(configPath, 'utf-8')).toBe(original);
    });

    it('should preserve runtime defaults after disk materialization round trip', () => {
      fs.mkdirSync(path.join(tempDir, 'openspec'), { recursive: true });

      migrateProjectConfigDefaults(tempDir);
      const config = readProjectConfig(tempDir);
      const runtime = projectConfigForRuntime(config, { consumer: 'archive' });

      expect(config?.optimization).toEqual({
        enabled: true,
        optRetries: 2,
      });
      expect(runtime.git).toEqual(gitConfig());
      expect(config).not.toHaveProperty('propose');
      expect(config?.apply).toEqual({
        defaultIsolation: 'ask',
      });
    });
  });

  describe('readProjectConfig', () => {
    describe('resilient parsing', () => {
      it('should parse complete valid config', () => {
        const configDir = path.join(tempDir, 'openspec');
        fs.mkdirSync(configDir, { recursive: true });
        fs.writeFileSync(
          path.join(configDir, 'config.yaml'),
          `schema: spec-driven
proseLanguage: zh-CN
context: |
  Tech stack: TypeScript, React
  API style: RESTful
rules:
  proposal:
    - Include rollback plan
    - Identify affected teams
  specs:
    - Use Given/When/Then format
`
        );

        const config = readProjectConfig(tempDir);

        expect(config).toEqual({
          schema: 'spec-driven',
          proseLanguage: 'zh-CN',
          context: 'Tech stack: TypeScript, React\nAPI style: RESTful\n',
          git: gitConfig(),
          rules: {
            proposal: ['Include rollback plan', 'Identify affected teams'],
            specs: ['Use Given/When/Then format'],
          },
        });
        expect(consoleWarnSpy).not.toHaveBeenCalled();
      });

      it('should migrate legacy docLanguage when proseLanguage is absent', () => {
        const configDir = path.join(tempDir, 'openspec');
        fs.mkdirSync(configDir, { recursive: true });
        fs.writeFileSync(
          path.join(configDir, 'config.yaml'),
          `schema: spec-driven
docLanguage: zh-CN
`
        );

        const config = readProjectConfig(tempDir);

        expect(config?.proseLanguage).toBe('zh-CN');
        expect(config).not.toHaveProperty('docLanguage');
        expect(consoleWarnSpy).not.toHaveBeenCalled();
      });

      it('should prefer proseLanguage over legacy docLanguage', () => {
        const configDir = path.join(tempDir, 'openspec');
        fs.mkdirSync(configDir, { recursive: true });
        fs.writeFileSync(
          path.join(configDir, 'config.yaml'),
          `schema: spec-driven
proseLanguage: 中文
docLanguage: zh-CN
`
        );

        const config = readProjectConfig(tempDir);

        expect(config?.proseLanguage).toBe('中文');
        expect(config).not.toHaveProperty('docLanguage');
        expect(consoleWarnSpy).not.toHaveBeenCalled();
      });

      it('should parse minimal config with schema only', () => {
        const configDir = path.join(tempDir, 'openspec');
        fs.mkdirSync(configDir, { recursive: true });
        fs.writeFileSync(path.join(configDir, 'config.yaml'), 'schema: spec-driven\n');

        const config = readProjectConfig(tempDir);

        expect(config).toEqual({
          schema: 'spec-driven',
          git: gitConfig(),
        });
        expect(consoleWarnSpy).not.toHaveBeenCalled();
      });

      it('should parse optimization policy when present', () => {
        const configDir = path.join(tempDir, 'openspec');
        fs.mkdirSync(configDir, { recursive: true });
        fs.writeFileSync(
          path.join(configDir, 'config.yaml'),
          `schema: spec-driven
optimization:
  enabled: false
`
        );

        const config = readProjectConfig(tempDir);

        expect(config).toEqual({
          schema: 'spec-driven',
          optimization: {
            enabled: false,
            optRetries: 2,
          },
          git: gitConfig(),
        });
      });

      it('should parse propose and apply workflow policy when present', () => {
        const configDir = path.join(tempDir, 'openspec');
        fs.mkdirSync(configDir, { recursive: true });
        fs.writeFileSync(
          path.join(configDir, 'config.yaml'),
          `schema: spec-driven
propose:
  smartRouting: false
  requireExplore: false
apply:
  defaultIsolation: worktree
`
        );

        const config = readProjectConfig(tempDir);

        expect(config).toEqual({
          schema: 'spec-driven',
          propose: {
            smartRouting: false,
            requireExplore: false,
          },
          apply: {
            defaultIsolation: 'worktree',
          },
          git: gitConfig(),
        });
      });

      it('should parse complete git archive policy when present', () => {
        const configDir = path.join(tempDir, 'openspec');
        fs.mkdirSync(configDir, { recursive: true });
        fs.writeFileSync(
          path.join(configDir, 'config.yaml'),
          `schema: spec-driven
git:
  autoCommit: manual
  archive:
    commitMessage:
      convention: openspec-archive
  merge:
    strategy: squash
    commitMessage:
      convention: openspec-merge-summary
  branch:
    deleteAfterArchive: true
`
        );

        const config = readProjectConfig(tempDir);

        expect(config).toEqual({
          schema: 'spec-driven',
          git: gitConfig({ autoCommit: 'manual', strategy: 'squash', deleteAfterArchive: true }),
        });
        expect(consoleWarnSpy).not.toHaveBeenCalled();
      });

      it('should fill default git archive policy when git node is missing', () => {
        const configDir = path.join(tempDir, 'openspec');
        fs.mkdirSync(configDir, { recursive: true });
        fs.writeFileSync(path.join(configDir, 'config.yaml'), 'schema: spec-driven\n');

        const config = readProjectConfig(tempDir);

        expect(config).toEqual({
          schema: 'spec-driven',
          git: gitConfig(),
        });
        expect(consoleWarnSpy).not.toHaveBeenCalled();
      });

      it('should preserve valid git fields while defaulting missing nested fields', () => {
        const configDir = path.join(tempDir, 'openspec');
        fs.mkdirSync(configDir, { recursive: true });
        fs.writeFileSync(
          path.join(configDir, 'config.yaml'),
          `schema: spec-driven
git:
  merge:
    strategy: ff-only
`
        );

        const config = readProjectConfig(tempDir);

        expect(config?.git).toEqual(gitConfig({ strategy: 'ff-only' }));
        expect(consoleWarnSpy).not.toHaveBeenCalled();
      });

      it('should warn per invalid git field and keep valid siblings', () => {
        const configDir = path.join(tempDir, 'openspec');
        fs.mkdirSync(configDir, { recursive: true });
        fs.writeFileSync(
          path.join(configDir, 'config.yaml'),
          `schema: spec-driven
git:
  autoCommit: archive-only
  archive:
    commitMessage:
      convention: invalid-archive
  merge:
    strategy: rebase
    commitMessage:
      convention: invalid-merge
  branch:
    deleteAfterArchive: "true"
`
        );

        const config = readProjectConfig(tempDir);

        expect(config?.git).toEqual(gitConfig());
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          'git.autoCommit must be one of: auto, manual'
        );
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          'git.archive.commitMessage.convention must be one of: openspec-archive'
        );
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          'git.merge.strategy must be one of: no-ff, ff-only, squash'
        );
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          'git.merge.commitMessage.convention must be one of: openspec-merge-summary'
        );
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          'git.branch.deleteAfterArchive must be boolean'
        );
      });

      it('should return partial config when schema is invalid', () => {
        const configDir = path.join(tempDir, 'openspec');
        fs.mkdirSync(configDir, { recursive: true });
        fs.writeFileSync(
          path.join(configDir, 'config.yaml'),
          `schema: ""
context: Valid context here
rules:
  proposal:
    - Valid rule
`
        );

        const config = readProjectConfig(tempDir);

        expect(config).toEqual({
          context: 'Valid context here',
          git: gitConfig(),
          rules: {
            proposal: ['Valid rule'],
          },
        });
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          expect.stringContaining("Invalid 'schema' field")
        );
      });

      it('should return partial config when context is invalid', () => {
        const configDir = path.join(tempDir, 'openspec');
        fs.mkdirSync(configDir, { recursive: true });
        fs.writeFileSync(
          path.join(configDir, 'config.yaml'),
          `schema: spec-driven
context: 123
rules:
  proposal:
    - Valid rule
`
        );

        const config = readProjectConfig(tempDir);

        expect(config).toEqual({
          schema: 'spec-driven',
          git: gitConfig(),
          rules: {
            proposal: ['Valid rule'],
          },
        });
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          expect.stringContaining("Invalid 'context' field")
        );
      });

      it('should return partial config when proseLanguage is invalid', () => {
        const configDir = path.join(tempDir, 'openspec');
        fs.mkdirSync(configDir, { recursive: true });
        fs.writeFileSync(
          path.join(configDir, 'config.yaml'),
          `schema: spec-driven
proseLanguage: 123
context: Valid context
`
        );

        const config = readProjectConfig(tempDir);

        expect(config).toEqual({
          schema: 'spec-driven',
          context: 'Valid context',
          git: gitConfig(),
        });
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          expect.stringContaining("Invalid 'proseLanguage' field")
        );
      });

      it('should return partial config when rules is not an object', () => {
        const configDir = path.join(tempDir, 'openspec');
        fs.mkdirSync(configDir, { recursive: true });
        fs.writeFileSync(
          path.join(configDir, 'config.yaml'),
          `schema: spec-driven
context: Valid context
rules: ["not", "an", "object"]
`
        );

        const config = readProjectConfig(tempDir);

        expect(config).toEqual({
          schema: 'spec-driven',
          context: 'Valid context',
          git: gitConfig(),
        });
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          expect.stringContaining("Invalid 'rules' field")
        );
      });

      it('should return partial config when optimization is invalid', () => {
        const configDir = path.join(tempDir, 'openspec');
        fs.mkdirSync(configDir, { recursive: true });
        fs.writeFileSync(
          path.join(configDir, 'config.yaml'),
          `schema: spec-driven
optimization: "bad"
context: Valid context
`
        );

        const config = readProjectConfig(tempDir);

        expect(config).toEqual({
          schema: 'spec-driven',
          context: 'Valid context',
          git: gitConfig(),
        });
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          expect.stringContaining("Invalid 'optimization' field")
        );
      });

      it('should handle rules: null without aborting config parsing', () => {
        // YAML `rules:` with no value parses to null
        const configDir = path.join(tempDir, 'openspec');
        fs.mkdirSync(configDir, { recursive: true });
        fs.writeFileSync(
          path.join(configDir, 'config.yaml'),
          `schema: spec-driven
context: Valid context
rules:
`
        );

        const config = readProjectConfig(tempDir);

        // Should still parse schema and context despite null rules
        expect(config).toEqual({
          schema: 'spec-driven',
          context: 'Valid context',
          git: gitConfig(),
        });
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          expect.stringContaining("Invalid 'rules' field")
        );
      });

      it('should filter out invalid rules for specific artifact', () => {
        const configDir = path.join(tempDir, 'openspec');
        fs.mkdirSync(configDir, { recursive: true });
        fs.writeFileSync(
          path.join(configDir, 'config.yaml'),
          `schema: spec-driven
rules:
  proposal:
    - Valid rule
  specs: "not an array"
  design:
    - Another valid rule
`
        );

        const config = readProjectConfig(tempDir);

        expect(config).toEqual({
          schema: 'spec-driven',
          git: gitConfig(),
          rules: {
            proposal: ['Valid rule'],
            design: ['Another valid rule'],
          },
        });
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          expect.stringContaining("Rules for 'specs' must be an array of strings")
        );
      });

      it('should filter out empty string rules', () => {
        const configDir = path.join(tempDir, 'openspec');
        fs.mkdirSync(configDir, { recursive: true });
        fs.writeFileSync(
          path.join(configDir, 'config.yaml'),
          `schema: spec-driven
rules:
  proposal:
    - Valid rule
    - ""
    - Another valid rule
    - ""
`
        );

        const config = readProjectConfig(tempDir);

        expect(config).toEqual({
          schema: 'spec-driven',
          git: gitConfig(),
          rules: {
            proposal: ['Valid rule', 'Another valid rule'],
          },
        });
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          expect.stringContaining("Some rules for 'proposal' are empty strings")
        );
      });

      it('should skip artifact if all rules are empty strings', () => {
        const configDir = path.join(tempDir, 'openspec');
        fs.mkdirSync(configDir, { recursive: true });
        fs.writeFileSync(
          path.join(configDir, 'config.yaml'),
          `schema: spec-driven
rules:
  proposal:
    - ""
    - ""
  specs:
    - Valid rule
`
        );

        const config = readProjectConfig(tempDir);

        expect(config).toEqual({
          schema: 'spec-driven',
          git: gitConfig(),
          rules: {
            specs: ['Valid rule'],
          },
        });
      });

      it('should handle completely invalid YAML gracefully', () => {
        const configDir = path.join(tempDir, 'openspec');
        fs.mkdirSync(configDir, { recursive: true });
        fs.writeFileSync(path.join(configDir, 'config.yaml'), 'schema: [unclosed');

        const config = readProjectConfig(tempDir);

        expect(config).toBeNull();
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          expect.stringContaining('Failed to parse openspec/config.yaml'),
          expect.anything()
        );
      });

      it('should warn when config is not a YAML object', () => {
        const configDir = path.join(tempDir, 'openspec');
        fs.mkdirSync(configDir, { recursive: true });
        fs.writeFileSync(path.join(configDir, 'config.yaml'), '"just a string"');

        const config = readProjectConfig(tempDir);

        expect(config).toBeNull();
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          expect.stringContaining('not a valid YAML object')
        );
      });

      it('should handle empty config file', () => {
        const configDir = path.join(tempDir, 'openspec');
        fs.mkdirSync(configDir, { recursive: true });
        fs.writeFileSync(path.join(configDir, 'config.yaml'), '');

        const config = readProjectConfig(tempDir);

        expect(config).toBeNull();
      });
    });

    describe('context size limit enforcement', () => {
      it('should accept context under 50KB limit', () => {
        const configDir = path.join(tempDir, 'openspec');
        fs.mkdirSync(configDir, { recursive: true });
        const smallContext = 'a'.repeat(1000); // 1KB
        fs.writeFileSync(
          path.join(configDir, 'config.yaml'),
          `schema: spec-driven\ncontext: "${smallContext}"\n`
        );

        const config = readProjectConfig(tempDir);

        expect(config?.context).toBe(smallContext);
        expect(consoleWarnSpy).not.toHaveBeenCalledWith(
          expect.stringContaining('Context too large')
        );
      });

      it('should reject context over 50KB limit', () => {
        const configDir = path.join(tempDir, 'openspec');
        fs.mkdirSync(configDir, { recursive: true });
        const largeContext = 'a'.repeat(51 * 1024); // 51KB
        fs.writeFileSync(
          path.join(configDir, 'config.yaml'),
          `schema: spec-driven\ncontext: "${largeContext}"\n`
        );

        const config = readProjectConfig(tempDir);

        expect(config).toEqual({
          schema: 'spec-driven',
          git: gitConfig(),
        });
        expect(config?.context).toBeUndefined();
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          expect.stringContaining('Context too large (51.0KB, limit: 50KB)')
        );
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          expect.stringContaining('Ignoring context field')
        );
      });

      it('should handle context exactly at 50KB limit', () => {
        const configDir = path.join(tempDir, 'openspec');
        fs.mkdirSync(configDir, { recursive: true });
        const exactContext = 'a'.repeat(50 * 1024); // Exactly 50KB
        fs.writeFileSync(
          path.join(configDir, 'config.yaml'),
          `schema: spec-driven\ncontext: "${exactContext}"\n`
        );

        const config = readProjectConfig(tempDir);

        expect(config?.context).toBe(exactContext);
        expect(consoleWarnSpy).not.toHaveBeenCalledWith(
          expect.stringContaining('Context too large')
        );
      });

      it('should handle multi-byte UTF-8 characters in size calculation', () => {
        const configDir = path.join(tempDir, 'openspec');
        fs.mkdirSync(configDir, { recursive: true });
        // Unicode snowman is 3 bytes in UTF-8
        const contextWithUnicode = '☃'.repeat(18000); // ~54KB in UTF-8 (18000 * 3 bytes)
        fs.writeFileSync(
          path.join(configDir, 'config.yaml'),
          `schema: spec-driven
context: |
  ${contextWithUnicode}
`
        );

        const config = readProjectConfig(tempDir);

        expect(config?.context).toBeUndefined();
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          expect.stringContaining('Context too large')
        );
      });
    });

    describe('.yml/.yaml precedence', () => {
      it('should prefer .yaml when both exist', () => {
        const configDir = path.join(tempDir, 'openspec');
        fs.mkdirSync(configDir, { recursive: true });
        fs.writeFileSync(
          path.join(configDir, 'config.yaml'),
          'schema: spec-driven\ncontext: from yaml\n'
        );
        fs.writeFileSync(
          path.join(configDir, 'config.yml'),
          'schema: custom-schema\ncontext: from yml\n'
        );

        const config = readProjectConfig(tempDir);

        expect(config?.schema).toBe('spec-driven');
        expect(config?.context).toBe('from yaml');
      });

      it('should use .yml when .yaml does not exist', () => {
        const configDir = path.join(tempDir, 'openspec');
        fs.mkdirSync(configDir, { recursive: true });
        fs.writeFileSync(
          path.join(configDir, 'config.yml'),
          'schema: custom-schema\ncontext: from yml\n'
        );

        const config = readProjectConfig(tempDir);

        expect(config?.schema).toBe('custom-schema');
        expect(config?.context).toBe('from yml');
      });

      it('should return null when neither .yaml nor .yml exist', () => {
        const configDir = path.join(tempDir, 'openspec');
        fs.mkdirSync(configDir, { recursive: true });

        const config = readProjectConfig(tempDir);

        expect(config).toBeNull();
        expect(consoleWarnSpy).not.toHaveBeenCalled();
      });

      it('should return null when openspec directory does not exist', () => {
        const config = readProjectConfig(tempDir);

        expect(config).toBeNull();
        expect(consoleWarnSpy).not.toHaveBeenCalled();
      });
    });

    describe('multi-line and special characters', () => {
      it('should preserve multi-line context', () => {
        const configDir = path.join(tempDir, 'openspec');
        fs.mkdirSync(configDir, { recursive: true });
        fs.writeFileSync(
          path.join(configDir, 'config.yaml'),
          `schema: spec-driven
context: |
  Line 1: Tech stack
  Line 2: API conventions
  Line 3: Testing approach
`
        );

        const config = readProjectConfig(tempDir);

        expect(config?.context).toBe(
          'Line 1: Tech stack\nLine 2: API conventions\nLine 3: Testing approach\n'
        );
      });

      it('should preserve special YAML characters in context', () => {
        const configDir = path.join(tempDir, 'openspec');
        fs.mkdirSync(configDir, { recursive: true });
        fs.writeFileSync(
          path.join(configDir, 'config.yaml'),
          `schema: spec-driven
context: |
  Special chars: : @ # $ % & * [ ] { }
  Quotes: "double" 'single'
  Symbols: < > | \\ /
`
        );

        const config = readProjectConfig(tempDir);

        expect(config?.context).toContain('Special chars: : @ # $ % & * [ ] { }');
        expect(config?.context).toContain('"double"');
        expect(config?.context).toContain("'single'");
        expect(config?.context).toContain('Symbols: < > | \\ /');
      });

      it('should preserve special characters in rule strings', () => {
        const configDir = path.join(tempDir, 'openspec');
        fs.mkdirSync(configDir, { recursive: true });
        fs.writeFileSync(
          path.join(configDir, 'config.yaml'),
          `schema: spec-driven
rules:
  proposal:
    - "Use <template> tags in docs"
    - "Reference @mentions and #channels"
    - "Follow {variable} naming"
`
        );

        const config = readProjectConfig(tempDir);

        expect(config?.rules?.proposal).toEqual([
          'Use <template> tags in docs',
          'Reference @mentions and #channels',
          'Follow {variable} naming',
        ]);
      });
    });
  });

  describe('validateConfigRules', () => {
    it('should return no warnings for valid artifact IDs', () => {
      const rules = {
        proposal: ['Rule 1'],
        specs: ['Rule 2'],
        design: ['Rule 3'],
      };
      const validIds = new Set(['proposal', 'specs', 'design', 'tasks']);

      const warnings = validateConfigRules(rules, validIds, 'spec-driven');

      expect(warnings).toEqual([]);
    });

    it('should warn about unknown artifact IDs', () => {
      const rules = {
        proposal: ['Rule 1'],
        testplan: ['Rule 2'], // Invalid
        documentation: ['Rule 3'], // Invalid
      };
      const validIds = new Set(['proposal', 'specs', 'design', 'tasks']);

      const warnings = validateConfigRules(rules, validIds, 'spec-driven');

      expect(warnings).toHaveLength(2);
      expect(warnings[0]).toContain('Unknown artifact ID in rules: "testplan"');
      expect(warnings[0]).toContain('Valid IDs for schema "spec-driven": design, proposal, specs, tasks');
      expect(warnings[1]).toContain('Unknown artifact ID in rules: "documentation"');
    });

    it('should return warnings for all unknown artifact IDs', () => {
      const rules = {
        invalid1: ['Rule 1'],
        invalid2: ['Rule 2'],
        invalid3: ['Rule 3'],
      };
      const validIds = new Set(['proposal', 'specs']);

      const warnings = validateConfigRules(rules, validIds, 'spec-driven');

      expect(warnings).toHaveLength(3);
    });

    it('should handle empty rules object', () => {
      const rules = {};
      const validIds = new Set(['proposal', 'specs']);

      const warnings = validateConfigRules(rules, validIds, 'spec-driven');

      expect(warnings).toEqual([]);
    });
  });

  describe('config projection', () => {
    it('normalizes whitespace while preserving whitelist fields', () => {
      const normalized = normalizeProjectConfig({
        schema: ' spec-driven ',
        proseLanguage: ' 中文 ',
        context: '  Team context  ',
        optimization: {
          enabled: false,
          optRetries: 2,
        },
        propose: {
          smartRouting: false,
          requireExplore: false,
        },
        apply: {
          defaultIsolation: 'worktree',
        },
        git: {
          ...gitConfig({ autoCommit: 'manual', strategy: 'squash', deleteAfterArchive: true }),
        },
        rules: {
          proposal: ['  Rule 1  ', ' ', 'Rule 2'],
          '  ': ['ignored'],
        },
      });

      expect(normalized).toEqual({
        schema: 'spec-driven',
        proseLanguage: '中文',
        context: 'Team context',
        optimization: {
          enabled: false,
          optRetries: 2,
        },
        propose: {
          smartRouting: false,
          requireExplore: false,
        },
        apply: {
          defaultIsolation: 'worktree',
        },
        git: {
          ...gitConfig({ autoCommit: 'manual', strategy: 'squash', deleteAfterArchive: true }),
        },
        rules: {
          proposal: ['Rule 1', 'Rule 2'],
        },
      });
    });

    it('builds a prompt projection bundle without leaking raw config structure', () => {
      const bundle = buildConfigProjectionBundle(
        {
          schema: 'spec-driven',
          proseLanguage: '中文',
          context: 'Tech stack: TypeScript',
          rules: {
            proposal: ['Include rollback plan'],
            specs: ['Use Given/When/Then'],
          },
        },
        { surface: 'artifact-instructions', artifactId: 'proposal' }
      );

      expect(bundle.normalized.rules).toEqual({
        proposal: ['Include rollback plan'],
        specs: ['Use Given/When/Then'],
      });
      expect(bundle.prompt.fragments).toEqual([
        expect.objectContaining({ key: 'proseLanguage', scope: 'global' }),
        expect.objectContaining({ key: 'context', scope: 'global' }),
        expect.objectContaining({ key: 'rules', scope: 'artifact', lines: ['Include rollback plan'] }),
      ]);
      expect(bundle.prompt.compiledLines.join('\n')).toContain('Use 中文 for natural-language prose');
      expect(bundle.prompt.compiledLines.join('\n')).toContain('task titles, check names, Requirement titles, Scenario titles');
      expect(bundle.prompt.compiledLines.join('\n')).toContain('Expect/Evidence descriptions');
      expect(bundle.prompt.compiledLines.join('\n')).toContain('exact existing Requirement titles required for MODIFIED matching');
      expect(bundle.prompt.compiledLines.join('\n')).toContain('English project terminology may remain embedded');
      expect(bundle.prompt.compiledLines.join('\n')).toContain('Tech stack: TypeScript');
      expect(bundle.prompt.compiledLines.join('\n')).toContain('Include rollback plan');
      expect(bundle.prompt.compiledLines.join('\n')).not.toContain('Use Given/When/Then');
    });

    it('projects git settings for archive prompt consumers', () => {
      const bundle = buildConfigProjectionBundle(
        {
          schema: 'spec-driven',
        git: {
          ...gitConfig(),
        },
          rules: {},
        },
        { surface: 'archive' }
      );

      expect(bundle.normalized.git).toEqual({
        ...gitConfig(),
      });
      expect(bundle.prompt.fragments).toEqual([
        expect.objectContaining({
          key: 'git',
          scope: 'global',
          lines: [
            'git.autoCommit: auto',
            'git.autoCommit semantics: auto means agent handoff after archive CLI; manual means user handoff after archive CLI',
            'git.archive.commitMessage.convention: openspec-archive',
            'git.merge.strategy: no-ff',
            'git.merge.commitMessage.convention: openspec-merge-summary',
            'git.branch.deleteAfterArchive: false',
          ],
        }),
      ]);
    });

    it('keeps archive git projection lines available to archive skill prompts', () => {
      const projection = projectConfigForPrompt(
        {
          schema: 'spec-driven',
        git: {
          ...gitConfig({ autoCommit: 'manual', strategy: 'squash', deleteAfterArchive: true }),
        },
          rules: {},
        },
        { surface: 'archive' }
      );

      expect(projection.fragments).toEqual([
        expect.objectContaining({
          key: 'git',
          scope: 'global',
          lines: [
            'git.autoCommit: manual',
            'git.autoCommit semantics: auto means agent handoff after archive CLI; manual means user handoff after archive CLI',
            'git.archive.commitMessage.convention: openspec-archive',
            'git.merge.strategy: squash',
            'git.merge.commitMessage.convention: openspec-merge-summary',
            'git.branch.deleteAfterArchive: true',
          ],
        }),
      ]);
    });

    it('exposes archive git settings through runtime projection', () => {
      const projection = projectConfigForRuntime(
        {
          schema: 'spec-driven',
        git: {
          ...gitConfig({ autoCommit: 'manual', strategy: 'squash', deleteAfterArchive: true }),
        },
          rules: {},
        },
        { consumer: 'archive' }
      );

      expect(projection.git).toEqual({
        ...gitConfig({ autoCommit: 'manual', strategy: 'squash', deleteAfterArchive: true }),
      });
      expect(projection.fragments).toEqual([
        expect.objectContaining({
          key: 'git',
          scope: 'global',
          lines: [
            'git.autoCommit: manual',
            'git.autoCommit semantics: auto means agent handoff after archive CLI; manual means user handoff after archive CLI',
            'git.archive.commitMessage.convention: openspec-archive',
            'git.merge.strategy: squash',
            'git.merge.commitMessage.convention: openspec-merge-summary',
            'git.branch.deleteAfterArchive: true',
          ],
        }),
      ]);
    });

    it('omits invalid or missing fields from runtime projection and marks proseLanguage as fingerprint-affecting', () => {
      const runtimeProjection = projectConfigForRuntime(
        {
          schema: 'spec-driven',
          proseLanguage: '中文',
          rules: {},
        },
        { consumer: 'bootstrap-review' }
      );

      expect(runtimeProjection.proseLanguage).toBe('中文');
      expect(runtimeProjection.affectsFingerprint).toBe(true);
      expect(runtimeProjection.forbidHardcodedEnglishBoilerplate).toBe(true);
      expect(runtimeProjection.fragments).toEqual([
        expect.objectContaining({ key: 'proseLanguage' }),
      ]);
      expect(runtimeProjection.fragments[0].lines.join('\n')).toContain('task titles, check names, Requirement titles, Scenario titles');
      expect(runtimeProjection.fragments[0].lines.join('\n')).toContain('ordinary English sentences');
    });
  });

  describe('suggestSchemas', () => {
    const availableSchemas = [
      { name: 'spec-driven', isBuiltIn: true },
      { name: 'custom-workflow', isBuiltIn: false },
      { name: 'team-process', isBuiltIn: false },
    ];

    it('should suggest close matches using fuzzy matching', () => {
      const message = suggestSchemas('spec-drven', availableSchemas); // Missing 'i'

      expect(message).toContain("Schema 'spec-drven' not found");
      expect(message).toContain('Did you mean one of these?');
      expect(message).toContain('spec-driven (built-in)');
    });

    it('should suggest custom-workflow for workflow typo', () => {
      const message = suggestSchemas('custom-workflo', availableSchemas);

      expect(message).toContain('Did you mean one of these?');
      expect(message).toContain('custom-workflow');
    });

    it('should list all available schemas', () => {
      const message = suggestSchemas('nonexistent', availableSchemas);

      expect(message).toContain('Available schemas:');
      expect(message).toContain('Built-in: spec-driven');
      expect(message).toContain('Project-local: custom-workflow, team-process');
    });

    it('should handle case when no project-local schemas exist', () => {
      const builtInOnly = [
        { name: 'spec-driven', isBuiltIn: true },
      ];
      const message = suggestSchemas('invalid', builtInOnly);

      expect(message).toContain('Built-in: spec-driven');
      expect(message).toContain('Project-local: (none found)');
    });

    it('should include fix instruction', () => {
      const message = suggestSchemas('wrong-schema', availableSchemas);

      expect(message).toContain(
        "Fix: Edit openspec/config.yaml and change 'schema: wrong-schema' to a valid schema name"
      );
    });

    it('should limit suggestions to top 3 matches', () => {
      const manySchemas = [
        { name: 'test-a', isBuiltIn: true },
        { name: 'test-b', isBuiltIn: true },
        { name: 'test-c', isBuiltIn: true },
        { name: 'test-d', isBuiltIn: true },
        { name: 'test-e', isBuiltIn: true },
      ];
      const message = suggestSchemas('test', manySchemas);

      // Should suggest at most 3
      const suggestionCount = (message.match(/test-/g) || []).length;
      expect(suggestionCount).toBeGreaterThanOrEqual(3);
      expect(suggestionCount).toBeLessThanOrEqual(3 + 5); // 3 in suggestions + 5 in "Available" list
    });

    it('should not suggest schemas with distance > 3', () => {
      const message = suggestSchemas('abcdefghijk', availableSchemas);

      // 'abcdefghijk' has large Levenshtein distance from all schemas
      expect(message).not.toContain('Did you mean');
      expect(message).toContain('Available schemas:');
    });
  });
});
