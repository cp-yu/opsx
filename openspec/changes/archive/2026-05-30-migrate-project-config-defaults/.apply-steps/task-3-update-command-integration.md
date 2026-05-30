Task 3: Update command integration - Detailed TDD Steps

Context:
- Goal: Run project config default migration during openspec update independently from tool artifact freshness.
- Files:
  - Modify: src/core/update.ts
  - Test: test/core/update.test.ts
- Requirements:
  - Invoke project config migration after verifying openspec/ exists.
  - Run migration before early returns for no configured tools or up-to-date tools.
  - Warn and continue when config migration is skipped due to invalid config.
  - Do not create or refresh unrelated native tool files because of config migration.
  - Keep existing global profile migration behavior intact.
- Related Spec:
  - openspec/changes/migrate-project-config-defaults/specs/cli-update/spec.md
  - openspec/changes/migrate-project-config-defaults/specs/config-loading/spec.md

TDD Cycle 1: Update runs project config defaults migration early

1. Step 1: Write Failing Test with complete test code
   - In test/core/update.test.ts add this import:

```ts
import { parse as parseYaml } from 'yaml';
```

   - In describe('basic validation', ...), update the existing "should report no configured tools when none exist" test:

```ts
    it('should report no configured tools when none exist', async () => {
      const consoleSpy = vi.spyOn(console, 'log');

      await updateCommand.execute(testDir);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('No configured tools found')
      );

      const configPath = path.join(testDir, 'openspec', 'config.yaml');
      const config = parseYaml(await fs.readFile(configPath, 'utf-8'));
      expect(config.optimization.enabled).toBe(true);
      expect(config.optimization.optRetries).toBe(2);
      expect(config.git.merge.strategy).toBe('no-ff');
      expect(config.git.merge.messageFrom).toBe('artifacts');
      expect(config.git.branch.deleteAfterArchive).toBe(false);

      consoleSpy.mockRestore();
    });
```

   - Still in describe('basic validation', ...), add:

```ts
    it('should preserve existing config fields while adding missing defaults', async () => {
      const configPath = path.join(testDir, 'openspec', 'config.yaml');
      await fs.writeFile(
        configPath,
        `schema: custom-schema
docLanguage: zh-CN
context: keep me
rules:
  proposal:
    - keep this rule
`
      );

      await updateCommand.execute(testDir);

      const config = parseYaml(await fs.readFile(configPath, 'utf-8'));
      expect(config.schema).toBe('custom-schema');
      expect(config.docLanguage).toBe('zh-CN');
      expect(config.context).toBe('keep me');
      expect(config.rules.proposal).toEqual(['keep this rule']);
      expect(config.optimization.enabled).toBe(true);
      expect(config.optimization.optRetries).toBe(2);
      expect(config.git.merge.strategy).toBe('no-ff');
      expect(config.git.merge.messageFrom).toBe('artifacts');
      expect(config.git.branch.deleteAfterArchive).toBe(false);
      expect(config).not.toHaveProperty('propose');
      expect(config).not.toHaveProperty('apply');
    });

    it('should warn and continue refreshing tools when project config migration is skipped', async () => {
      const configPath = path.join(testDir, 'openspec', 'config.yaml');
      const originalConfig = 'schema: [unclosed';
      await fs.writeFile(configPath, originalConfig);

      const skillsDir = path.join(testDir, '.claude', 'skills', 'openspec-explore');
      await fs.mkdir(skillsDir, { recursive: true });
      await fs.writeFile(path.join(skillsDir, 'SKILL.md'), 'old content');

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const consoleSpy = vi.spyOn(console, 'log');

      await updateCommand.execute(testDir);

      expect(await fs.readFile(configPath, 'utf-8')).toBe(originalConfig);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Project config default migration skipped')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Updated: Claude Code')
      );

      warnSpy.mockRestore();
      consoleSpy.mockRestore();
    });
```

2. Step 2: Run Test (Verify Fails) with command, expected failure, and "Test MUST fail"
   - Command: npm run test -- test/core/update.test.ts
   - Expected failure: no-tools update does not create openspec/config.yaml, and invalid config migration warning is missing.
   - Test MUST fail.

3. Step 3: Implement Minimal Code with complete implementation code
   - In src/core/update.ts, add:

```ts
import { migrateProjectConfigDefaults } from './project-config.js';
```

   - In UpdateCommand.execute(), immediately after the openspec directory existence check, call the helper and warn only for skipped results:

```ts
    const configMigration = migrateProjectConfigDefaults(resolvedProjectPath);
    if (configMigration.status === 'skipped') {
      console.warn(
        chalk.yellow(
          `Project config default migration skipped for ${path.relative(resolvedProjectPath, configMigration.path)} (${configMigration.reason})`
        )
      );
    }
```

   - Do not change update's tool detection, profile migration, or artifact sync behavior.

4. Step 4: Run Test (Verify Passes) with command, expected pass, and "Test MUST pass"
   - Command: npm run test -- test/core/update.test.ts
   - Expected pass: update tests pass.
   - Test MUST pass.

5. Step 5: Commit with git add and Conventional Commit git commit -m
   - Command: git add src/core/update.ts test/core/update.test.ts openspec/changes/migrate-project-config-defaults/.apply-steps/task-3-update-command-integration.md
   - Command: git commit -m "feat(update): migrate project config defaults"

Summary:
- Total cycles: 1
- Modified files: src/core/update.ts, test/core/update.test.ts
- Commit count: 1
