Task 1: Shared project config defaults - Detailed TDD Steps

Context:
- Goal: Define one source of truth for functional project config defaults and use it for new init output.
- Files:
  - Modify: src/core/project-config.ts
  - Modify: src/core/config-prompts.ts
  - Modify: src/core/init.ts
  - Test: test/core/init.test.ts
  - Test: test/core/project-config.test.ts
- Requirements:
  - Expose shared defaults for optimization.enabled, optimization.optRetries, and git.
  - Keep docLanguage, context, rules, propose, and apply out of automatic default materialization.
  - Make fresh openspec init write the functional defaults to openspec/config.yaml.
  - Preserve existing explicit docLanguage behavior.
  - Use path.join() or existing path utilities for config file paths.
- Related Spec:
  - openspec/changes/migrate-project-config-defaults/specs/cli-init/spec.md
  - openspec/changes/migrate-project-config-defaults/specs/config-loading/spec.md

TDD Cycle 1: Specify shared disk defaults and init output

1. Step 1: Write Failing Test with complete test code
   - In test/core/project-config.test.ts, update the import from ../../src/core/project-config.js to include materializeProjectConfigDefaults.
   - Add this test inside describe('project-config', ...) before describe('readProjectConfig', ...):

```ts
  describe('materializeProjectConfigDefaults', () => {
    it('should include only functional disk defaults', () => {
      const defaults = materializeProjectConfigDefaults({ schema: 'spec-driven' });

      expect(defaults).toEqual({
        schema: 'spec-driven',
        optimization: {
          enabled: true,
          optRetries: 2,
        },
        git: {
          merge: {
            strategy: 'no-ff',
            messageFrom: 'artifacts',
          },
          branch: {
            deleteAfterArchive: false,
          },
        },
      });
      expect(defaults).not.toHaveProperty('docLanguage');
      expect(defaults).not.toHaveProperty('context');
      expect(defaults).not.toHaveProperty('rules');
      expect(defaults).not.toHaveProperty('propose');
      expect(defaults).not.toHaveProperty('apply');
    });

    it('should preserve explicit docLanguage without adding other optional fields', () => {
      const defaults = materializeProjectConfigDefaults({
        schema: 'spec-driven',
        docLanguage: 'zh-CN',
      });

      expect(defaults.docLanguage).toBe('zh-CN');
      expect(defaults).not.toHaveProperty('context');
      expect(defaults).not.toHaveProperty('rules');
      expect(defaults).not.toHaveProperty('propose');
      expect(defaults).not.toHaveProperty('apply');
    });
  });
```

   - In test/core/init.test.ts, update the existing test named "should create config.yaml with default schema" to assert functional defaults and excluded fields:

```ts
    it('should create config.yaml with functional defaults', async () => {
      const initCommand = new InitCommand({ tools: 'claude', force: true });

      await initCommand.execute(testDir);

      const configPath = path.join(testDir, 'openspec', 'config.yaml');
      expect(await fileExists(configPath)).toBe(true);

      const content = await fs.readFile(configPath, 'utf-8');
      expect(content).toContain('schema: spec-driven');
      expect(content).toContain('optimization:');
      expect(content).toContain('  enabled: true');
      expect(content).toContain('  optRetries: 2');
      expect(content).toContain('git:');
      expect(content).toContain('  merge:');
      expect(content).toContain('    strategy: no-ff');
      expect(content).toContain('    messageFrom: artifacts');
      expect(content).toContain('  branch:');
      expect(content).toContain('    deleteAfterArchive: false');
      expect(content).not.toContain('propose:');
      expect(content).not.toContain('apply:');
      expect(content).not.toContain('rules:');
      expect(content).not.toContain('context:');
      expect(content).not.toContain('docLanguage:');
    });
```

   - Keep the existing interactive docLanguage test and ensure it still expects docLanguage: zh-CN.

2. Step 2: Run Test (Verify Fails) with command, expected failure, and "Test MUST fail"
   - Command: npm run test -- test/core/project-config.test.ts test/core/init.test.ts
   - Expected failure: TypeScript/Vitest reports that materializeProjectConfigDefaults is not exported, or the init config lacks git/default materialization.
   - Test MUST fail.

3. Step 3: Implement Minimal Code with complete implementation code
   - In src/core/project-config.ts:
     - Replace the private GIT_DEFAULTS constant with an exported shared disk defaults constant.
     - Add a small clone helper and materialization helper.
     - Use the exported git defaults in readProjectConfig.
   - Minimal code shape:

```ts
export const PROJECT_CONFIG_FUNCTIONAL_DEFAULTS = {
  optimization: {
    enabled: true,
    optRetries: 2,
  },
  git: {
    merge: {
      strategy: 'no-ff' as const,
      messageFrom: 'artifacts' as const,
    },
    branch: {
      deleteAfterArchive: false,
    },
  },
};

function cloneFunctionalDefaults() {
  return {
    optimization: {
      ...PROJECT_CONFIG_FUNCTIONAL_DEFAULTS.optimization,
    },
    git: {
      merge: {
        ...PROJECT_CONFIG_FUNCTIONAL_DEFAULTS.git.merge,
      },
      branch: {
        ...PROJECT_CONFIG_FUNCTIONAL_DEFAULTS.git.branch,
      },
    },
  };
}

export function materializeProjectConfigDefaults(
  config: Pick<ProjectConfig, 'schema'> & Partial<Pick<ProjectConfig, 'docLanguage'>>
): Pick<ProjectConfig, 'schema' | 'optimization' | 'git'> & Partial<Pick<ProjectConfig, 'docLanguage'>> {
  const defaults = cloneFunctionalDefaults();
  return config.docLanguage
    ? { schema: config.schema, docLanguage: config.docLanguage, ...defaults }
    : { schema: config.schema, ...defaults };
}
```

   - In readProjectConfig(), replace JSON.parse(JSON.stringify(GIT_DEFAULTS)) with a git clone from PROJECT_CONFIG_FUNCTIONAL_DEFAULTS. Do not add optimization defaults to readProjectConfig when optimization is absent; current runtime projection handles that separately.
   - In src/core/config-prompts.ts:
     - Import materializeProjectConfigDefaults.
     - At the start of serializeConfig(), compute:

```ts
  const materialized = config.schema
    ? materializeProjectConfigDefaults({
        schema: config.schema,
        docLanguage: config.docLanguage,
      })
    : config;
```

     - Use materialized.schema, materialized.docLanguage, materialized.optimization, and materialized.git for output.
     - Add a git section after optimization:

```ts
  lines.push('# Git archive and merge policy (optional)');
  lines.push('# Example:');
  lines.push('#   git:');
  lines.push('#     merge:');
  lines.push('#       strategy: no-ff');
  lines.push('#       messageFrom: artifacts');
  lines.push('#     branch:');
  lines.push('#       deleteAfterArchive: false');
  if (materialized.git) {
    lines.push('git:');
    lines.push('  merge:');
    lines.push(`    strategy: ${materialized.git.merge.strategy}`);
    lines.push(`    messageFrom: ${materialized.git.merge.messageFrom}`);
    lines.push('  branch:');
    lines.push(`    deleteAfterArchive: ${materialized.git.branch.deleteAfterArchive}`);
  }
  lines.push('');
```

   - In src/core/init.ts, no path handling refactor is needed if createConfig still uses path.join(openspecPath, 'config.yaml'). Keep existing docLanguage write behavior.

4. Step 4: Run Test (Verify Passes) with command, expected pass, and "Test MUST pass"
   - Command: npm run test -- test/core/project-config.test.ts test/core/init.test.ts
   - Expected pass: project config and init tests pass.
   - Test MUST pass.

5. Step 5: Commit with git add and Conventional Commit git commit -m
   - Command: git add src/core/project-config.ts src/core/config-prompts.ts src/core/init.ts test/core/init.test.ts test/core/project-config.test.ts openspec/changes/migrate-project-config-defaults/.apply-steps/task-1-shared-project-config-defaults.md openspec/changes/migrate-project-config-defaults/.apply-isolation.json
   - Command: git commit -m "feat(config): materialize project config defaults"

Summary:
- Total cycles: 1
- Modified files: src/core/project-config.ts, src/core/config-prompts.ts, src/core/init.ts, test/core/init.test.ts, test/core/project-config.test.ts
- Commit count: 1
