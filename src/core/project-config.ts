import { existsSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';
import {
  isMap,
  parse as parseYaml,
  parseDocument,
  stringify as stringifyYaml,
  type Document,
  type Node,
} from 'yaml';
import { z } from 'zod';

export const PROJECT_CONFIG_FUNCTIONAL_DEFAULTS = {
  optimization: {
    enabled: true,
    optRetries: 2,
  },
  apply: {
    defaultIsolation: 'ask' as const,
  },
  git: {
    autoCommit: 'auto' as const,
    archive: {
      commitMessage: {
        convention: 'openspec-archive' as const,
      },
    },
    merge: {
      strategy: 'no-ff' as const,
      commitMessage: {
        convention: 'openspec-merge-summary' as const,
      },
    },
    branch: {
      deleteAfterArchive: false,
    },
  },
};

const DEFAULT_PROJECT_SCHEMA = 'spec-driven';

export type ProjectConfigDefaultsMigrationResult =
  | { status: 'created'; path: string }
  | { status: 'updated'; path: string }
  | { status: 'unchanged'; path: string }
  | { status: 'skipped'; path: string; reason: 'invalid-yaml' | 'non-object' };

const gitMergeStrategyField = z.enum(['no-ff', 'ff-only', 'squash']);
const gitAutoCommitField = z.enum(['auto', 'manual']);
const gitArchiveCommitConventionField = z.enum(['openspec-archive']);
const gitMergeCommitConventionField = z.enum(['openspec-merge-summary']);
const gitDeleteAfterArchiveField = z.boolean();

/**
 * Zod schema for project configuration.
 *
 * Purpose:
 * 1. Documentation - clearly defines the config file structure
 * 2. Type safety - TypeScript infers ProjectConfig type from schema
 * 3. Runtime validation - uses safeParse() for resilient field-by-field validation
 *
 * Why Zod over manual validation:
 * - Helps understand OpenSpec's data interfaces at a glance
 * - Single source of truth for type and validation
 * - Consistent with other OpenSpec schemas
 */
export const ProjectConfigSchema = z.object({
  // Required: which schema to use (e.g., "spec-driven", or project-local schema name)
  schema: z
    .string()
    .min(1)
    .describe('The workflow schema to use (e.g., "spec-driven")'),

  // Optional: natural-language prose language for OpenSpec artifacts
  proseLanguage: z
    .string()
    .min(1)
    .optional()
    .describe('Language for natural-language prose in OpenSpec artifacts'),
  docLanguage: z
    .string()
    .min(1)
    .optional()
    .describe('Deprecated alias for proseLanguage'),

  // Optional: project context (injected into all artifact instructions)
  // Max size: 50KB (enforced during parsing)
  context: z
    .string()
    .optional()
    .describe('Project context injected into all artifact instructions'),

  // Optional: verify Phase 2 optimization policy
  optimization: z
    .object({
      enabled: z.boolean().optional().default(true),
      optRetries: z.number().int().min(0).max(10).optional().default(2),
    })
    .optional()
    .describe('Project-level Phase 2 optimization policy for verify workflows'),

  // Optional: propose-stage smart routing policy
  propose: z
    .object({
      smartRouting: z.boolean().optional().default(true),
      requireExplore: z.boolean().optional(),
    })
    .optional()
    .describe('Propose-stage explore routing policy'),

  // Optional: apply-stage implementation policy
  apply: z
    .object({
      defaultIsolation: z.enum(['ask', 'branch', 'worktree', 'none']).optional().default('ask'),
    })
    .optional()
    .describe('Apply-stage branch/worktree isolation policy'),

  // Optional: git archive/merge policy
  git: z
    .object({
      autoCommit: z.enum(['auto', 'manual']).optional().default('auto'),
      archive: z
        .object({
          commitMessage: z
            .object({
              convention: z.enum(['openspec-archive']).optional().default('openspec-archive'),
            })
            .optional()
            .default({ convention: 'openspec-archive' }),
        })
        .optional()
        .default({ commitMessage: { convention: 'openspec-archive' } }),
      merge: z
        .object({
          strategy: z.enum(['no-ff', 'ff-only', 'squash']).optional().default('no-ff'),
          commitMessage: z
            .object({
              convention: z.enum(['openspec-merge-summary']).optional().default('openspec-merge-summary'),
            })
            .optional()
            .default({ convention: 'openspec-merge-summary' }),
        })
        .optional()
        .default({ strategy: 'no-ff', commitMessage: { convention: 'openspec-merge-summary' } }),
      branch: z
        .object({
          deleteAfterArchive: z.boolean().optional().default(false),
        })
        .optional()
        .default({ deleteAfterArchive: false }),
    })
    .optional()
    .describe('Git archive and merge policy'),

  // Optional: per-artifact rules (additive to schema's built-in guidance)
  rules: z
    .record(
      z.string(), // artifact ID
      z.array(z.string()) // list of rules
    )
    .optional()
    .describe('Per-artifact rules, keyed by artifact ID'),
});

export type ProjectConfig = z.infer<typeof ProjectConfigSchema>;

const MAX_CONTEXT_SIZE = 50 * 1024; // 50KB hard limit

type MaterializedProjectConfigDefaults = Pick<ProjectConfig, 'schema'> &
  Partial<Pick<ProjectConfig, 'proseLanguage'>> & {
    optimization: typeof PROJECT_CONFIG_FUNCTIONAL_DEFAULTS.optimization;
    apply: typeof PROJECT_CONFIG_FUNCTIONAL_DEFAULTS.apply;
    git: typeof PROJECT_CONFIG_FUNCTIONAL_DEFAULTS.git;
  };

function cloneFunctionalDefaults() {
  return {
    optimization: {
      ...PROJECT_CONFIG_FUNCTIONAL_DEFAULTS.optimization,
    },
    apply: {
      ...PROJECT_CONFIG_FUNCTIONAL_DEFAULTS.apply,
    },
    git: {
      autoCommit: PROJECT_CONFIG_FUNCTIONAL_DEFAULTS.git.autoCommit,
      archive: {
        commitMessage: {
          ...PROJECT_CONFIG_FUNCTIONAL_DEFAULTS.git.archive.commitMessage,
        },
      },
      merge: {
        ...PROJECT_CONFIG_FUNCTIONAL_DEFAULTS.git.merge,
        commitMessage: {
          ...PROJECT_CONFIG_FUNCTIONAL_DEFAULTS.git.merge.commitMessage,
        },
      },
      branch: {
        ...PROJECT_CONFIG_FUNCTIONAL_DEFAULTS.git.branch,
      },
    },
  };
}

export function materializeProjectConfigDefaults(
  config: Pick<ProjectConfig, 'schema'> & Partial<Pick<ProjectConfig, 'proseLanguage'>>
): MaterializedProjectConfigDefaults {
  const defaults = cloneFunctionalDefaults();
  return config.proseLanguage
    ? { schema: config.schema, proseLanguage: config.proseLanguage, ...defaults }
    : { schema: config.schema, ...defaults };
}

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
  let current: Node | null | undefined = document.contents;
  for (const key of keys.slice(0, -1)) {
    if (!current || !isMap(current)) {
      return false;
    }
    if (!current.has(key)) {
      current.set(key, document.createNode({}));
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

function deletePath(document: Document, keys: readonly string[]): boolean {
  let current: Node | null | undefined = document.contents;
  for (const key of keys.slice(0, -1)) {
    if (!current || !isMap(current)) {
      return false;
    }
    current = current.get(key, true);
  }

  if (!current || !isMap(current)) {
    return false;
  }

  const leaf = keys[keys.length - 1];
  if (!current.has(leaf)) {
    return false;
  }

  current.delete(leaf);
  return true;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
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
  changed = setMissingPath(document, ['optimization', 'enabled'], defaults.optimization.enabled) || changed;
  changed = setMissingPath(document, ['optimization', 'optRetries'], defaults.optimization.optRetries) || changed;
  changed = setMissingPath(document, ['apply', 'defaultIsolation'], defaults.apply.defaultIsolation) || changed;
  changed = setMissingPath(document, ['git', 'autoCommit'], defaults.git.autoCommit) || changed;
  changed = setMissingPath(document, ['git', 'archive', 'commitMessage', 'convention'], defaults.git.archive.commitMessage.convention) || changed;
  changed = setMissingPath(document, ['git', 'merge', 'strategy'], defaults.git.merge.strategy) || changed;
  changed = deletePath(document, ['git', 'merge', 'messageFrom']) || changed;
  changed = setMissingPath(document, ['git', 'merge', 'commitMessage', 'convention'], defaults.git.merge.commitMessage.convention) || changed;
  changed = setMissingPath(document, ['git', 'branch', 'deleteAfterArchive'], defaults.git.branch.deleteAfterArchive) || changed;

  if (!changed) {
    return { status: 'unchanged', path: configPath.path };
  }

  writeFileSync(configPath.path, String(document), 'utf-8');
  return { status: 'updated', path: configPath.path };
}

/**
 * Read and parse openspec/config.yaml from project root.
 * Uses resilient parsing - validates each field independently using Zod safeParse.
 * Returns null if file doesn't exist.
 * Returns partial config if some fields are invalid (with warnings).
 *
 * Performance note (Jan 2025):
 * Benchmarks showed direct file reads are fast enough without caching:
 * - Typical config (1KB): ~0.5ms per read
 * - Large config (50KB): ~1.6ms per read
 * - Missing config: ~0.01ms per read
 * Config is read 1-2 times per command (schema resolution + instruction loading),
 * adding ~1-3ms total overhead. Caching would add complexity (mtime checks,
 * invalidation logic) for negligible benefit. Direct reads also ensure config
 * changes are reflected immediately without stale cache issues.
 *
 * @param projectRoot - The root directory of the project (where `openspec/` lives)
 * @returns Parsed config or null if file doesn't exist
 */
export function readProjectConfig(projectRoot: string): ProjectConfig | null {
  // Try both .yaml and .yml, prefer .yaml
  let configPath = path.join(projectRoot, 'openspec', 'config.yaml');
  if (!existsSync(configPath)) {
    configPath = path.join(projectRoot, 'openspec', 'config.yml');
    if (!existsSync(configPath)) {
      return null; // No config is OK
    }
  }

  try {
    const content = readFileSync(configPath, 'utf-8');
    const raw = parseYaml(content);

    if (!raw || typeof raw !== 'object') {
      console.warn(`openspec/config.yaml is not a valid YAML object`);
      return null;
    }

    const config: Partial<ProjectConfig> = {};

    // Parse schema field using Zod
    const schemaField = z.string().min(1);
    const schemaResult = schemaField.safeParse(raw.schema);
    if (schemaResult.success) {
      config.schema = schemaResult.data;
    } else if (raw.schema !== undefined) {
      console.warn(`Invalid 'schema' field in config (must be non-empty string)`);
    }

    // Parse proseLanguage field using Zod, with docLanguage as a legacy fallback.
    if (raw.proseLanguage !== undefined) {
      const proseLanguageField = z.string().min(1);
      const proseLanguageResult = proseLanguageField.safeParse(raw.proseLanguage);

      if (proseLanguageResult.success) {
        config.proseLanguage = proseLanguageResult.data;
      } else {
        console.warn(`Invalid 'proseLanguage' field in config (must be non-empty string)`);
      }
    } else if (raw.docLanguage !== undefined) {
      const proseLanguageField = z.string().min(1);
      const proseLanguageResult = proseLanguageField.safeParse(raw.docLanguage);

      if (proseLanguageResult.success) {
        config.proseLanguage = proseLanguageResult.data;
      } else {
        console.warn(`Invalid 'docLanguage' field in config (must be non-empty string)`);
      }
    }

    // Parse context field with size limit
    if (raw.context !== undefined) {
      const contextField = z.string();
      const contextResult = contextField.safeParse(raw.context);

      if (contextResult.success) {
        const contextSize = Buffer.byteLength(contextResult.data, 'utf-8');
        if (contextSize > MAX_CONTEXT_SIZE) {
          console.warn(
            `Context too large (${(contextSize / 1024).toFixed(1)}KB, limit: ${MAX_CONTEXT_SIZE / 1024}KB)`
          );
          console.warn(`Ignoring context field`);
        } else {
          config.context = contextResult.data;
        }
      } else {
        console.warn(`Invalid 'context' field in config (must be string)`);
      }
    }

    // Parse optimization field using Zod
    if (raw.optimization !== undefined) {
      const optimizationField = z.object({
        enabled: z.boolean().optional().default(true),
        optRetries: z.number().int().min(0).max(10).optional().default(2),
      });
      const optimizationResult = optimizationField.safeParse(raw.optimization);

      if (optimizationResult.success) {
        config.optimization = optimizationResult.data;
      } else {
        console.warn(`Invalid 'optimization' field in config (must be an object with boolean 'enabled' and optional integer 'optRetries')`);
      }
    }

    // Parse propose field using Zod
    if (raw.propose !== undefined) {
      const proposeField = z.object({
        smartRouting: z.boolean().optional().default(true),
        requireExplore: z.boolean().optional(),
      });
      const proposeResult = proposeField.safeParse(raw.propose);

      if (proposeResult.success) {
        config.propose = proposeResult.data;
      } else {
        console.warn(`Invalid 'propose' field in config (must be an object with boolean 'smartRouting' and optional boolean 'requireExplore')`);
      }
    }

    // Parse apply field using Zod
    if (raw.apply !== undefined) {
      const applyField = z.object({
        defaultIsolation: z.enum(['ask', 'branch', 'worktree', 'none']).optional().default('ask'),
      });
      const applyResult = applyField.safeParse(raw.apply);

      if (applyResult.success) {
        config.apply = applyResult.data;
      } else {
        console.warn(`Invalid 'apply' field in config (must be an object with defaultIsolation: ask | branch | worktree | none)`);
      }
    }

    config.git = cloneFunctionalDefaults().git;
    const gitConfig = config.git!;
    if (raw.git !== undefined) {
      if (!isPlainRecord(raw.git)) {
        console.warn(`Invalid 'git' field in config (must be an object)`);
      } else {
        const rawGit = raw.git;

        if (rawGit.autoCommit !== undefined) {
          const autoCommitResult = gitAutoCommitField.safeParse(rawGit.autoCommit);
          if (autoCommitResult.success) {
            gitConfig.autoCommit = autoCommitResult.data;
          } else {
            console.warn('git.autoCommit must be one of: auto, manual');
          }
        }

        if (rawGit.archive !== undefined) {
          if (isPlainRecord(rawGit.archive)) {
            const rawArchive = rawGit.archive;
            const rawCommitMessage = rawArchive.commitMessage;
            if (rawCommitMessage !== undefined) {
              if (isPlainRecord(rawCommitMessage)) {
                const conventionResult = gitArchiveCommitConventionField.safeParse(rawCommitMessage.convention);
                if (conventionResult.success) {
                  gitConfig.archive.commitMessage.convention = conventionResult.data;
                } else if (rawCommitMessage.convention !== undefined) {
                  console.warn('git.archive.commitMessage.convention must be one of: openspec-archive');
                }
              } else {
                console.warn(`Invalid 'git.archive.commitMessage' field in config (must be an object)`);
              }
            }
          } else {
            console.warn(`Invalid 'git.archive' field in config (must be an object)`);
          }
        }

        if (rawGit.merge !== undefined) {
          if (isPlainRecord(rawGit.merge)) {
            const rawMerge = rawGit.merge;

            if (rawMerge.strategy !== undefined) {
              const strategyResult = gitMergeStrategyField.safeParse(rawMerge.strategy);
              if (strategyResult.success) {
                gitConfig.merge.strategy = strategyResult.data;
              } else {
                console.warn('git.merge.strategy must be one of: no-ff, ff-only, squash');
              }
            }

            const rawCommitMessage = rawMerge.commitMessage;
            if (rawCommitMessage !== undefined) {
              if (isPlainRecord(rawCommitMessage)) {
                const conventionResult = gitMergeCommitConventionField.safeParse(rawCommitMessage.convention);
                if (conventionResult.success) {
                  gitConfig.merge.commitMessage.convention = conventionResult.data;
                } else if (rawCommitMessage.convention !== undefined) {
                  console.warn('git.merge.commitMessage.convention must be one of: openspec-merge-summary');
                }
              } else {
                console.warn(`Invalid 'git.merge.commitMessage' field in config (must be an object)`);
              }
            }
          } else {
            console.warn(`Invalid 'git.merge' field in config (must be an object)`);
          }
        }

        if (rawGit.branch !== undefined) {
          if (isPlainRecord(rawGit.branch)) {
            const rawBranch = rawGit.branch;

            if (rawBranch.deleteAfterArchive !== undefined) {
              const deleteAfterArchiveResult = gitDeleteAfterArchiveField.safeParse(rawBranch.deleteAfterArchive);
              if (deleteAfterArchiveResult.success) {
                gitConfig.branch.deleteAfterArchive = deleteAfterArchiveResult.data;
              } else {
                console.warn('git.branch.deleteAfterArchive must be boolean');
              }
            }
          } else {
            console.warn(`Invalid 'git.branch' field in config (must be an object)`);
          }
        }
      }
    }

    // Parse rules field using Zod
    if (raw.rules !== undefined) {
      // First check if it's an object structure (guard against null since typeof null === 'object')
      if (isPlainRecord(raw.rules)) {
        const parsedRules: Record<string, string[]> = {};
        let hasValidRules = false;

        for (const [artifactId, rules] of Object.entries(raw.rules)) {
          const rulesArrayResult = z.array(z.string()).safeParse(rules);

          if (rulesArrayResult.success) {
            // Filter out empty strings
            const validRules = rulesArrayResult.data.filter((r) => r.length > 0);
            if (validRules.length > 0) {
              parsedRules[artifactId] = validRules;
              hasValidRules = true;
            }
            if (validRules.length < rulesArrayResult.data.length) {
              console.warn(
                `Some rules for '${artifactId}' are empty strings, ignoring them`
              );
            }
          } else {
            console.warn(
              `Rules for '${artifactId}' must be an array of strings, ignoring this artifact's rules`
            );
          }
        }

        if (hasValidRules) {
          config.rules = parsedRules;
        }
      } else {
        console.warn(`Invalid 'rules' field in config (must be object)`);
      }
    }

    // Return partial config even if some fields failed
    return Object.keys(config).length > 0 ? (config as ProjectConfig) : null;
  } catch (error) {
    console.warn(`Failed to parse openspec/config.yaml:`, error);
    return null;
  }
}

/**
 * Validate artifact IDs in rules against a schema's artifacts.
 * Called during instruction loading (when schema is known).
 * Returns warnings for unknown artifact IDs.
 *
 * @param rules - The rules object from config
 * @param validArtifactIds - Set of valid artifact IDs from the schema
 * @param schemaName - Name of the schema for error messages
 * @returns Array of warning messages for unknown artifact IDs
 */
export function validateConfigRules(
  rules: Record<string, string[]>,
  validArtifactIds: Set<string>,
  schemaName: string
): string[] {
  const warnings: string[] = [];

  for (const artifactId of Object.keys(rules)) {
    if (!validArtifactIds.has(artifactId)) {
      const validIds = Array.from(validArtifactIds).sort().join(', ');
      warnings.push(
        `Unknown artifact ID in rules: "${artifactId}". ` +
          `Valid IDs for schema "${schemaName}": ${validIds}`
      );
    }
  }

  return warnings;
}

/**
 * Suggest valid schema names when user provides invalid schema.
 * Uses fuzzy matching to find similar names.
 *
 * @param invalidSchemaName - The invalid schema name from config
 * @param availableSchemas - List of available schemas with their type (built-in or project-local)
 * @returns Error message with suggestions and available schemas
 */
export function suggestSchemas(
  invalidSchemaName: string,
  availableSchemas: { name: string; isBuiltIn: boolean }[]
): string {
  // Simple fuzzy match: Levenshtein distance
  function levenshtein(a: string, b: string): number {
    const matrix: number[][] = [];
    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    return matrix[b.length][a.length];
  }

  // Find closest matches (distance <= 3)
  const suggestions = availableSchemas
    .map((s) => ({ ...s, distance: levenshtein(invalidSchemaName, s.name) }))
    .filter((s) => s.distance <= 3)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 3);

  const builtIn = availableSchemas.filter((s) => s.isBuiltIn).map((s) => s.name);
  const projectLocal = availableSchemas.filter((s) => !s.isBuiltIn).map((s) => s.name);

  let message = `Schema '${invalidSchemaName}' not found in openspec/config.yaml\n\n`;

  if (suggestions.length > 0) {
    message += `Did you mean one of these?\n`;
    suggestions.forEach((s) => {
      const type = s.isBuiltIn ? 'built-in' : 'project-local';
      message += `  - ${s.name} (${type})\n`;
    });
    message += '\n';
  }

  message += `Available schemas:\n`;
  if (builtIn.length > 0) {
    message += `  Built-in: ${builtIn.join(', ')}\n`;
  }
  if (projectLocal.length > 0) {
    message += `  Project-local: ${projectLocal.join(', ')}\n`;
  } else {
    message += `  Project-local: (none found)\n`;
  }

  message += `\nFix: Edit openspec/config.yaml and change 'schema: ${invalidSchemaName}' to a valid schema name`;

  return message;
}
