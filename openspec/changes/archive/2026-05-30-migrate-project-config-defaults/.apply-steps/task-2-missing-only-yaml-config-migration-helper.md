Task 2: Missing-only YAML config migration helper - Detailed TDD Steps

Context:
- Goal: Add a focused helper that creates or migrates project config defaults without overwriting user values.
- Files:
  - Modify: src/core/project-config.ts
  - Test: test/core/project-config.test.ts
- Requirements:
  - Create openspec/config.yaml when neither .yaml nor .yml config exists.
  - Prefer openspec/config.yaml; fall back to mutating openspec/config.yml when only .yml exists.
  - Use YAML Document mutation for existing config files.
  - Add only missing mapping keys at nested levels.
  - Leave invalid YAML and non-object YAML unchanged.
- Related Spec:
  - openspec/changes/migrate-project-config-defaults/specs/cli-update/spec.md
  - openspec/changes/migrate-project-config-defaults/specs/config-loading/spec.md

TDD Cycle 1: Missing-only config defaults migration

1. Step 1: Write Failing Test with complete test code
   - In test/core/project-config.test.ts, update the import from ../../src/core/project-config.js to include migrateProjectConfigDefaults.
   - Add this import:

```ts
import { parse as parseYaml } from 'yaml';
```

   - Add this describe block after describe('materializeProjectConfigDefaults', ...):

```ts
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
      expect(parsed.git.merge.strategy).toBe('squash');
      expect(parsed.git.merge.messageFrom).toBe('artifacts');
      expect(parsed.git.branch.deleteAfterArchive).toBe(false);
      expect(parsed).not.toHaveProperty('propose');
      expect(parsed).not.toHaveProperty('apply');
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
  });
```

2. Step 2: Run Test (Verify Fails) with command, expected failure, and "Test MUST fail"
   - Command: npm run test -- test/core/project-config.test.ts
   - Expected failure: TypeScript/Vitest reports migrateProjectConfigDefaults is not exported.
   - Test MUST fail.

3. Step 3: Implement Minimal Code with complete implementation code
   - In src/core/project-config.ts:
     - Add writeFileSync to the fs import.
     - Change the yaml import to:

```ts
import {
  isMap,
  parse as parseYaml,
  parseDocument,
  stringify as stringifyYaml,
  type Document,
} from 'yaml';
```

     - Add constants and result type near PROJECT_CONFIG_FUNCTIONAL_DEFAULTS:

```ts
const DEFAULT_PROJECT_SCHEMA = 'spec-driven';

export type ProjectConfigDefaultsMigrationResult =
  | { status: 'created'; path: string }
  | { status: 'updated'; path: string }
  | { status: 'unchanged'; path: string }
  | { status: 'skipped'; path: string; reason: 'invalid-yaml' | 'non-object' };
```

     - Add these helpers after materializeProjectConfigDefaults:

```ts
function findProjectConfigPath(projectRoot: string): { path: string; exists: boolean } {
  const yamlPath = path.join(projectRoot, 'openspec', 'config.yaml');
  if (existsSync(yamlPath)) {
    return { path: yamlPath, exists: true };
  }

  const ymlPath = path.join(projectRoot, 'openspec', 'config.yml');
  if (existsSync(ymlPath)) {
    return { path: ymlPath, exists: true };
  }

  return { path: yamlPath, exists: false };
}

function setMissingPath(document: Document, keys: readonly string[], value: unknown): boolean {
  let current = document.contents;
  for (const key of keys.slice(0, -1)) {
    if (!current || !isMap(current)) {
      return false;
    }
    if (!current.has(key)) {
      current.set(key, {});
    }
    current = current.get(key, true);
  }

  if (!current || !isMap(current)) {
    return false;
  }

  const leaf = keys[keys.length - 1];
  if (current.has(leaf)) {
    return false;
  }

  current.set(leaf, value);
  return true;
}

export function migrateProjectConfigDefaults(projectRoot: string): ProjectConfigDefaultsMigrationResult {
  const configPath = findProjectConfigPath(projectRoot);
  if (!configPath.exists) {
    const defaults = materializeProjectConfigDefaults({ schema: DEFAULT_PROJECT_SCHEMA });
    writeFileSync(configPath.path, stringifyYaml(defaults), 'utf-8');
    return { status: 'created', path: configPath.path };
  }

  const content = readFileSync(configPath.path, 'utf-8');
  const document = parseDocument(content);
  if (document.errors.length > 0) {
    return { status: 'skipped', path: configPath.path, reason: 'invalid-yaml' };
  }
  if (!document.contents || !isMap(document.contents)) {
    return { status: 'skipped', path: configPath.path, reason: 'non-object' };
  }

  const defaults = materializeProjectConfigDefaults({ schema: DEFAULT_PROJECT_SCHEMA });
  let changed = false;
  changed = setMissingPath(document, ['schema'], defaults.schema) || changed;
  changed = setMissingPath(document, ['optimization'], {}) || changed;
  changed = setMissingPath(document, ['optimization', 'enabled'], defaults.optimization.enabled) || changed;
  changed = setMissingPath(document, ['optimization', 'optRetries'], defaults.optimization.optRetries) || changed;
  changed = setMissingPath(document, ['git'], {}) || changed;
  changed = setMissingPath(document, ['git', 'merge'], {}) || changed;
  changed = setMissingPath(document, ['git', 'merge', 'strategy'], defaults.git.merge.strategy) || changed;
  changed = setMissingPath(document, ['git', 'merge', 'messageFrom'], defaults.git.merge.messageFrom) || changed;
  changed = setMissingPath(document, ['git', 'branch'], {}) || changed;
  changed = setMissingPath(document, ['git', 'branch', 'deleteAfterArchive'], defaults.git.branch.deleteAfterArchive) || changed;

  if (!changed) {
    return { status: 'unchanged', path: configPath.path };
  }

  writeFileSync(configPath.path, String(document), 'utf-8');
  return { status: 'updated', path: configPath.path };
}
```

   - Keep all path construction through path.join().
   - Do not touch src/core/update.ts in this task.

4. Step 4: Run Test (Verify Passes) with command, expected pass, and "Test MUST pass"
   - Command: npm run test -- test/core/project-config.test.ts
   - Expected pass: project config tests pass.
   - Test MUST pass.

5. Step 5: Commit with git add and Conventional Commit git commit -m
   - Command: git add src/core/project-config.ts test/core/project-config.test.ts openspec/changes/migrate-project-config-defaults/.apply-steps/task-2-missing-only-yaml-config-migration-helper.md
   - Command: git commit -m "feat(config): add missing-only config migration"

Summary:
- Total cycles: 1
- Modified files: src/core/project-config.ts, test/core/project-config.test.ts
- Commit count: 1
