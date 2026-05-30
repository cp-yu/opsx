Task 4: Cross-platform and regression verification - Detailed TDD Steps

Context:
- Goal: Verify config migration behavior against cross-platform path rules and existing runtime config loading behavior.
- Files:
  - Test: test/core/project-config.test.ts
  - Test: test/core/update.test.ts
  - Test: test/core/init.test.ts
- Requirements:
  - Cover path construction through existing project-root-relative test directories.
  - Confirm runtime config parsing still returns the same defaults after disk materialization.
  - Confirm migration does not add propose or apply.
  - Keep tests focused on config behavior, not full CLI e2e.
- Related Spec:
  - openspec/changes/migrate-project-config-defaults/specs/config-loading/spec.md
  - openspec/changes/migrate-project-config-defaults/specs/cli-update/spec.md
  - openspec/changes/migrate-project-config-defaults/specs/cli-init/spec.md

TDD Cycle 1: Runtime round-trip regression

1. Step 1: Write Failing Test with complete test code
   - In test/core/project-config.test.ts, inside describe('migrateProjectConfigDefaults', ...), add:

```ts
    it('should preserve runtime defaults after disk materialization round trip', () => {
      fs.mkdirSync(path.join(tempDir, 'openspec'), { recursive: true });

      migrateProjectConfigDefaults(tempDir);
      const config = readProjectConfig(tempDir);
      const runtime = projectConfigForRuntime(config, { consumer: 'archive' });

      expect(config?.optimization).toEqual({
        enabled: true,
        optRetries: 2,
      });
      expect(runtime.git).toEqual({
        merge: {
          strategy: 'no-ff',
          messageFrom: 'artifacts',
        },
        branch: {
          deleteAfterArchive: false,
        },
      });
      expect(config).not.toHaveProperty('propose');
      expect(config).not.toHaveProperty('apply');
    });
```

2. Step 2: Run Test (Verify Fails) with command, expected failure, and "Test MUST fail"
   - Command: npm run test -- test/core/project-config.test.ts test/core/init.test.ts test/core/update.test.ts
   - Expected failure: if runtime round-trip behavior is missing, config.optimization or archive runtime git projection will not match the materialized defaults.
   - Test MUST fail.

3. Step 3: Implement Minimal Code with complete implementation code
   - If the test already passes because Tasks 1-3 fully implemented the contract, do not add production code. The regression evidence is the task output.
   - If it fails, minimally fix project config materialization, migration, or readProjectConfig runtime parsing so disk materialized defaults round-trip into projectConfigForRuntime().

4. Step 4: Run Test (Verify Passes) with command, expected pass, and "Test MUST pass"
   - Command: npm run test -- test/core/project-config.test.ts test/core/init.test.ts test/core/update.test.ts
   - Expected pass: combined focused suites pass.
   - Test MUST pass.

5. Step 5: Commit with git add and Conventional Commit git commit -m
   - Command: git add test/core/project-config.test.ts openspec/changes/migrate-project-config-defaults/.apply-steps/task-4-cross-platform-and-regression-verification.md
   - Command: git commit -m "test(config): verify project config defaults regression"

Summary:
- Total cycles: 1
- Modified files: test/core/project-config.test.ts
- Commit count: 1
