# Task 1: 加载并校验 git 配置节点 - Detailed TDD Steps

## Context

Goal: 在项目配置加载链路中加入 `git` 顶层节点，含 `merge.strategy`、`merge.messageFrom`、`branch.deleteAfterArchive` 三个字段，缺失时填默认值，非法值降级并 warning。

Files:
- `src/core/config-schema.ts`
- `src/core/project-config.ts`
- `src/core/config-projection.ts`
- `test/core/config-schema.test.ts`
- `test/core/project-config.test.ts`

Requirements:
- `git.merge.strategy`: `no-ff | ff-only | squash`
- `git.merge.messageFrom`: `artifacts | manual`
- `git.branch.deleteAfterArchive`: boolean
- Missing `git` or nested fields use defaults: `no-ff`, `artifacts`, `false`
- Invalid nested values warn field-by-field and fall back only that field
- Normalized projection exposes `git`
- Archive prompt projection renders a `git` fragment for archive consumers

Related Spec:
- `openspec/changes/add-branch-aware-archive-merge/specs/config-loading/spec.md`

## TDD Cycle 1: Project config loads and normalizes git settings

### Step 1: Write Failing Test with complete test code

Patch `test/core/project-config.test.ts`.

In the existing `readProjectConfig` resilient parsing tests, add these tests near the existing workflow policy tests:

```ts
      it('should parse complete git archive policy when present', () => {
        const configDir = path.join(tempDir, 'openspec');
        fs.mkdirSync(configDir, { recursive: true });
        fs.writeFileSync(
          path.join(configDir, 'config.yaml'),
          `schema: spec-driven
git:
  merge:
    strategy: squash
    messageFrom: manual
  branch:
    deleteAfterArchive: true
`
        );

        const config = readProjectConfig(tempDir);

        expect(config).toEqual({
          schema: 'spec-driven',
          git: {
            merge: {
              strategy: 'squash',
              messageFrom: 'manual',
            },
            branch: {
              deleteAfterArchive: true,
            },
          },
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

        expect(config?.git).toEqual({
          merge: {
            strategy: 'ff-only',
            messageFrom: 'artifacts',
          },
          branch: {
            deleteAfterArchive: false,
          },
        });
        expect(consoleWarnSpy).not.toHaveBeenCalled();
      });

      it('should warn per invalid git field and keep valid siblings', () => {
        const configDir = path.join(tempDir, 'openspec');
        fs.mkdirSync(configDir, { recursive: true });
        fs.writeFileSync(
          path.join(configDir, 'config.yaml'),
          `schema: spec-driven
git:
  merge:
    strategy: rebase
    messageFrom: manual
  branch:
    deleteAfterArchive: "true"
`
        );

        const config = readProjectConfig(tempDir);

        expect(config?.git).toEqual({
          merge: {
            strategy: 'no-ff',
            messageFrom: 'manual',
          },
          branch: {
            deleteAfterArchive: false,
          },
        });
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          'git.merge.strategy must be one of: no-ff, ff-only, squash'
        );
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          'git.branch.deleteAfterArchive must be boolean'
        );
      });
```

In the existing `config projection` tests, update `normalizes whitespace while preserving whitelist fields` input to include:

```ts
        git: {
          merge: {
            strategy: 'squash',
            messageFrom: 'manual',
          },
          branch: {
            deleteAfterArchive: true,
          },
        },
```

and update the expected normalized object with the same `git` value.

Add this projection test in the same describe block:

```ts
    it('projects git settings for archive prompt consumers', () => {
      const bundle = buildConfigProjectionBundle(
        {
          schema: 'spec-driven',
          git: {
            merge: {
              strategy: 'no-ff',
              messageFrom: 'artifacts',
            },
            branch: {
              deleteAfterArchive: false,
            },
          },
          rules: {},
        },
        { surface: 'archive' }
      );

      expect(bundle.normalized.git).toEqual({
        merge: {
          strategy: 'no-ff',
          messageFrom: 'artifacts',
        },
        branch: {
          deleteAfterArchive: false,
        },
      });
      expect(bundle.prompt.fragments).toEqual([
        expect.objectContaining({
          key: 'git',
          scope: 'global',
          lines: [
            'git.merge.strategy: no-ff',
            'git.merge.messageFrom: artifacts',
            'git.branch.deleteAfterArchive: false',
          ],
        }),
      ]);
    });
```

Patch `test/core/config-schema.test.ts`.

Add these tests in `GlobalConfigSchema`:

```ts
    it('should provide default git archive policy', () => {
      const result = GlobalConfigSchema.parse({});
      expect(result.git).toEqual({
        merge: {
          strategy: 'no-ff',
          messageFrom: 'artifacts',
        },
        branch: {
          deleteAfterArchive: false,
        },
      });
    });

    it('should accept valid git archive policy', () => {
      const result = GlobalConfigSchema.safeParse({
        git: {
          merge: {
            strategy: 'squash',
            messageFrom: 'manual',
          },
          branch: {
            deleteAfterArchive: true,
          },
        },
      });
      expect(result.success).toBe(true);
    });
```

Add these tests in `DEFAULT_CONFIG`:

```ts
    it('should default git archive policy conservatively', () => {
      expect(DEFAULT_CONFIG.git).toEqual({
        merge: {
          strategy: 'no-ff',
          messageFrom: 'artifacts',
        },
        branch: {
          deleteAfterArchive: false,
        },
      });
    });
```

Add these tests in `validateConfigKeyPath`:

```ts
    it('allows git archive policy keys', () => {
      expect(validateConfigKeyPath('git').valid).toBe(true);
      expect(validateConfigKeyPath('git.merge').valid).toBe(true);
      expect(validateConfigKeyPath('git.merge.strategy').valid).toBe(true);
      expect(validateConfigKeyPath('git.merge.messageFrom').valid).toBe(true);
      expect(validateConfigKeyPath('git.branch').valid).toBe(true);
      expect(validateConfigKeyPath('git.branch.deleteAfterArchive').valid).toBe(true);
    });

    it('rejects unknown nested git keys', () => {
      expect(validateConfigKeyPath('git.merge.mode').valid).toBe(false);
      expect(validateConfigKeyPath('git.branch.forceDelete').valid).toBe(false);
      expect(validateConfigKeyPath('git.push.afterMerge').valid).toBe(false);
    });
```

### Step 2: Run Test (Verify Fails) with command, expected failure, and "Test MUST fail"

Command:

```bash
pnpm test -- project-config config-schema
```

Expected failure: TypeScript/test failures because `ProjectConfig` and `GlobalConfigSchema` do not yet include `git`, and archive prompt projection does not emit a `git` fragment.

Test MUST fail.

### Step 3: Implement Minimal Code with complete implementation code

Patch `src/core/config-schema.ts`:

- Add a reusable git schema near the top:

```ts
const GitConfigSchema = z
  .object({
    merge: z
      .object({
        strategy: z.enum(['no-ff', 'ff-only', 'squash']).optional().default('no-ff'),
        messageFrom: z.enum(['artifacts', 'manual']).optional().default('artifacts'),
      })
      .optional()
      .default({ strategy: 'no-ff', messageFrom: 'artifacts' }),
    branch: z
      .object({
        deleteAfterArchive: z.boolean().optional().default(false),
      })
      .optional()
      .default({ deleteAfterArchive: false }),
  })
  .optional()
  .default({
    merge: { strategy: 'no-ff', messageFrom: 'artifacts' },
    branch: { deleteAfterArchive: false },
  });
```

- Add `git: GitConfigSchema,` to `GlobalConfigSchema`.
- Add this to `DEFAULT_CONFIG`:

```ts
  git: {
    merge: {
      strategy: 'no-ff',
      messageFrom: 'artifacts',
    },
    branch: {
      deleteAfterArchive: false,
    },
  },
```

- Extend `validateConfigKeyPath()` with a `git` branch that accepts only:
  - `git`
  - `git.merge`
  - `git.merge.strategy`
  - `git.merge.messageFrom`
  - `git.branch`
  - `git.branch.deleteAfterArchive`

Patch `src/core/project-config.ts`:

- Add shared constants/types:

```ts
const GIT_DEFAULTS = {
  merge: {
    strategy: 'no-ff' as const,
    messageFrom: 'artifacts' as const,
  },
  branch: {
    deleteAfterArchive: false,
  },
};

const gitMergeStrategyField = z.enum(['no-ff', 'ff-only', 'squash']);
const gitMergeMessageFromField = z.enum(['artifacts', 'manual']);
const gitDeleteAfterArchiveField = z.boolean();
```

- Add `git` to `ProjectConfigSchema` with the same shape/defaults.
- In `readProjectConfig`, initialize `config.git` to a deep copy of `GIT_DEFAULTS` before optional `raw.git` parsing, so missing `git` receives defaults without warning.
- If `raw.git` exists and is a non-array object, validate each nested field independently:
  - invalid `merge.strategy`: `console.warn('git.merge.strategy must be one of: no-ff, ff-only, squash')`
  - invalid `merge.messageFrom`: `console.warn('git.merge.messageFrom must be one of: artifacts, manual')`
  - invalid `branch.deleteAfterArchive`: `console.warn('git.branch.deleteAfterArchive must be boolean')`
  - valid siblings must be preserved.
- If `raw.git` exists but is not an object, warn `Invalid 'git' field in config (must be an object)` and keep defaults.

Patch `src/core/config-projection.ts`:

- Extend `NormalizedProjectConfig` with:

```ts
  git?: {
    merge: {
      strategy: 'no-ff' | 'ff-only' | 'squash';
      messageFrom: 'artifacts' | 'manual';
    };
    branch: {
      deleteAfterArchive: boolean;
    };
  };
```

- Extend `ProjectionFragment['key']` to include `'git'`.
- In `normalizeProjectConfig`, copy `config.git` when present.
- Add a projection rule that returns a prompt fragment only when `scope.surface === 'archive'` and `config.git` exists, with lines exactly:

```ts
[
  `git.merge.strategy: ${config.git.merge.strategy}`,
  `git.merge.messageFrom: ${config.git.merge.messageFrom}`,
  `git.branch.deleteAfterArchive: ${config.git.branch.deleteAfterArchive}`,
]
```

Do not add `git` to runtime projection unless current tests require it.

### Step 4: Run Test (Verify Passes) with command, expected pass, and "Test MUST pass"

Command:

```bash
pnpm test -- project-config config-schema
```

Expected pass: project config and global config schema tests pass.

Test MUST pass.

### Step 5: Commit with `git add` and Conventional Commit `git commit -m`

Commands:

```bash
git add src/core/config-schema.ts src/core/project-config.ts src/core/config-projection.ts test/core/config-schema.test.ts test/core/project-config.test.ts openspec/changes/add-branch-aware-archive-merge/.apply-isolation.json openspec/changes/add-branch-aware-archive-merge/.apply-steps/task-1-git-config-loading.md
git commit -m "feat(config): add archive git policy config" -- src/core/config-schema.ts src/core/project-config.ts src/core/config-projection.ts test/core/config-schema.test.ts test/core/project-config.test.ts openspec/changes/add-branch-aware-archive-merge/.apply-isolation.json openspec/changes/add-branch-aware-archive-merge/.apply-steps/task-1-git-config-loading.md
```

## Summary

Total cycles: 1

Modified files:
- `src/core/config-schema.ts`
- `src/core/project-config.ts`
- `src/core/config-projection.ts`
- `test/core/config-schema.test.ts`
- `test/core/project-config.test.ts`
- `openspec/changes/add-branch-aware-archive-merge/.apply-isolation.json`
- `openspec/changes/add-branch-aware-archive-merge/.apply-steps/task-1-git-config-loading.md`

Commit count: 1
