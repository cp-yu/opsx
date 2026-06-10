import type { ProjectConfig } from './project-config.js';

export interface NormalizedProjectConfig {
  schema?: string;
  proseLanguage?: string;
  context?: string;
  optimization?: {
    enabled: boolean;
    optRetries: number;
  };
  propose?: {
    smartRouting: boolean;
    requireExplore?: boolean;
  };
  apply?: {
    defaultIsolation: 'ask' | 'branch' | 'worktree' | 'none';
  };
  git?: {
    commitMessage?: {
      boundary?: string;
      archive?: string;
      merge?: string;
    };
    merge: {
      strategy: 'no-ff' | 'ff-only' | 'squash';
    };
    branch: {
      deleteAfterArchive: boolean;
    };
  };
  rules: Record<string, string[]>;
}

export interface CanonicalTokenPolicy {
  preserveNormativeKeywords: true;
  preserveSectionHeaders: true;
  preserveScenarioKeywords: true;
  preserveIds: true;
  preserveSchemaKeys: true;
  preservePaths: true;
  preserveCommands: true;
  preserveCodeIdentifiers: true;
}

export interface ProjectionScope {
  surface: string;
  artifactId?: string;
  runtimeConsumer?: string;
}

export interface ProjectionFragment {
  key: 'proseLanguage' | 'context' | 'rules' | 'git' | 'apply';
  scope: 'global' | 'artifact';
  lines: string[];
}

export interface PromptProjection {
  surface: string;
  artifactId?: string;
  fragments: ProjectionFragment[];
  compiledLines: string[];
  canonicalTokenPolicy: CanonicalTokenPolicy;
}

export interface RuntimeProjection {
  consumer: string;
  artifactId?: string;
  fragments: ProjectionFragment[];
  git?: NormalizedProjectConfig['git'];
  proseLanguage?: string;
  preserveCanonicalTokens: true;
  forbidHardcodedEnglishBoilerplate: boolean;
  affectsFingerprint: boolean;
  canonicalTokenPolicy: CanonicalTokenPolicy;
}

export interface ConfigProjectionBundle {
  normalized: NormalizedProjectConfig;
  prompt: PromptProjection;
}

const CANONICAL_TOKEN_POLICY: CanonicalTokenPolicy = {
  preserveNormativeKeywords: true,
  preserveSectionHeaders: true,
  preserveScenarioKeywords: true,
  preserveIds: true,
  preserveSchemaKeys: true,
  preservePaths: true,
  preserveCommands: true,
  preserveCodeIdentifiers: true,
};

interface ProjectionRule {
  key: ProjectionFragment['key'];
  buildPrompt: (config: NormalizedProjectConfig, scope: ProjectionScope) => ProjectionFragment | null;
  buildRuntime: (config: NormalizedProjectConfig, scope: ProjectionScope) => ProjectionFragment | null;
  affectsFingerprint: (config: NormalizedProjectConfig, scope: ProjectionScope) => boolean;
}

function normalizeString(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function normalizeProjectConfig(config: ProjectConfig | null): NormalizedProjectConfig {
  if (!config) {
    return { rules: {} };
  }

  const rules = Object.fromEntries(
    Object.entries(config.rules ?? {})
      .map(([artifactId, items]) => {
        const normalizedItems = items
          .map((item) => item.trim())
          .filter((item) => item.length > 0);
        return [artifactId.trim(), normalizedItems] as const;
      })
      .filter(([artifactId, items]) => artifactId.length > 0 && items.length > 0)
  );

  return {
    schema: normalizeString(config.schema),
    proseLanguage: normalizeString(config.proseLanguage),
    context: normalizeString(config.context),
    optimization: config.optimization
      ? {
          enabled: config.optimization.enabled !== false,
          optRetries: config.optimization.optRetries ?? 2,
        }
      : undefined,
    propose: config.propose
      ? {
          smartRouting: config.propose.smartRouting !== false,
          requireExplore: config.propose.requireExplore,
        }
      : undefined,
    apply: config.apply
      ? {
          defaultIsolation: config.apply.defaultIsolation ?? 'ask',
        }
      : undefined,
    git: config.git
      ? {
          ...(config.git.commitMessage ? { commitMessage: config.git.commitMessage } : {}),
          merge: {
            strategy: config.git.merge.strategy,
          },
          branch: {
            deleteAfterArchive: config.git.branch.deleteAfterArchive,
          },
        }
      : undefined,
    rules,
  };
}

function buildProseLanguageLines(proseLanguage: string): string[] {
  return [
    `Use ${proseLanguage} for natural-language prose that you newly write or revise.`,
    'Natural-language prose includes task titles, check names, Requirement titles, Scenario titles, bullet descriptions, Expect/Evidence descriptions, rationale, goals, risks, and summaries.',
    'Preserve canonical tokens unchanged: SHALL, MUST, template headings, section headers, scenario headers, BDD keywords, IDs, schema keys, relation types, paths, commands, and code identifiers.',
    'Preserve exact existing Requirement titles required for MODIFIED matching.',
    'English project terminology may remain embedded in prose, but ordinary English sentences and titles still follow proseLanguage.',
  ];
}

function buildArtifactRulesFragment(
  config: NormalizedProjectConfig,
  scope: ProjectionScope
): ProjectionFragment | null {
  if (!scope.artifactId) {
    return null;
  }

  const rules = config.rules[scope.artifactId];
  if (!rules || rules.length === 0) {
    return null;
  }

  return {
    key: 'rules',
    scope: 'artifact',
    lines: rules,
  };
}

function buildGitProjectionLines(git: NonNullable<NormalizedProjectConfig['git']>): string[] {
  const lines: string[] = [];
  if (git.commitMessage?.boundary) {
    lines.push(`git.commitMessage.boundary: ${git.commitMessage.boundary}`);
  }
  if (git.commitMessage?.archive) {
    lines.push(`git.commitMessage.archive: ${git.commitMessage.archive}`);
  }
  if (git.commitMessage?.merge) {
    lines.push(`git.commitMessage.merge: ${git.commitMessage.merge}`);
  }
  lines.push(`git.merge.strategy: ${git.merge.strategy}`);
  lines.push(`git.branch.deleteAfterArchive: ${git.branch.deleteAfterArchive}`);
  return lines;
}

const projectionRules: ProjectionRule[] = [
  {
    key: 'proseLanguage',
    buildPrompt(config) {
      if (!config.proseLanguage) {
        return null;
      }

      return {
        key: 'proseLanguage',
        scope: 'global',
        lines: buildProseLanguageLines(config.proseLanguage),
      };
    },
    buildRuntime(config) {
      if (!config.proseLanguage) {
        return null;
      }

      return {
        key: 'proseLanguage',
        scope: 'global',
        lines: buildProseLanguageLines(config.proseLanguage),
      };
    },
    affectsFingerprint(config) {
      return Boolean(config.proseLanguage);
    },
  },
  {
    key: 'context',
    buildPrompt(config) {
      if (!config.context) {
        return null;
      }

      return {
        key: 'context',
        scope: 'global',
        lines: [config.context],
      };
    },
    buildRuntime(config) {
      if (!config.context) {
        return null;
      }

      return {
        key: 'context',
        scope: 'global',
        lines: [config.context],
      };
    },
    affectsFingerprint() {
      return false;
    },
  },
  {
    key: 'rules',
    buildPrompt(config, scope) {
      return buildArtifactRulesFragment(config, scope);
    },
    buildRuntime(config, scope) {
      return buildArtifactRulesFragment(config, scope);
    },
    affectsFingerprint() {
      return false;
    },
  },
  {
    key: 'git',
    buildPrompt(config, scope) {
      if (scope.surface !== 'archive' || !config.git) {
        return null;
      }

      return {
        key: 'git',
        scope: 'global',
        lines: buildGitProjectionLines(config.git),
      };
    },
    buildRuntime(config, scope) {
      if (scope.runtimeConsumer !== 'archive' || !config.git) {
        return null;
      }

      return {
        key: 'git',
        scope: 'global',
        lines: buildGitProjectionLines(config.git),
      };
    },
    affectsFingerprint() {
      return false;
    },
  },
  {
    key: 'apply',
    buildPrompt(config, scope) {
      if (scope.surface !== 'apply' || !config.apply) {
        return null;
      }

      return {
        key: 'apply',
        scope: 'global',
        lines: [
          `apply.defaultIsolation: ${config.apply.defaultIsolation}`,
        ],
      };
    },
    buildRuntime() {
      return null;
    },
    affectsFingerprint() {
      return false;
    },
  },
];

export function projectConfigForPrompt(
  config: ProjectConfig | null,
  scope: { surface: string; artifactId?: string }
): PromptProjection {
  const normalized = normalizeProjectConfig(config);
  const fragments = projectionRules
    .map((rule) => rule.buildPrompt(normalized, scope))
    .filter((fragment): fragment is ProjectionFragment => fragment !== null);

  return {
    surface: scope.surface,
    artifactId: scope.artifactId,
    fragments,
    compiledLines: fragments.flatMap((fragment) => fragment.lines),
    canonicalTokenPolicy: CANONICAL_TOKEN_POLICY,
  };
}

export function projectConfigForRuntime(
  config: ProjectConfig | null,
  scope: { consumer: string; artifactId?: string }
): RuntimeProjection {
  const normalized = normalizeProjectConfig(config);
  const runtimeScope: ProjectionScope = {
    surface: 'runtime',
    artifactId: scope.artifactId,
    runtimeConsumer: scope.consumer,
  };
  const fragments = projectionRules
    .map((rule) => rule.buildRuntime(normalized, runtimeScope))
    .filter((fragment): fragment is ProjectionFragment => fragment !== null);

  return {
    consumer: scope.consumer,
    artifactId: scope.artifactId,
    fragments,
    git: scope.consumer === 'archive' ? normalized.git : undefined,
    proseLanguage: normalized.proseLanguage,
    preserveCanonicalTokens: true,
    forbidHardcodedEnglishBoilerplate: Boolean(normalized.proseLanguage),
    affectsFingerprint: projectionRules.some((rule) => rule.affectsFingerprint(normalized, runtimeScope)),
    canonicalTokenPolicy: CANONICAL_TOKEN_POLICY,
  };
}

export function buildConfigProjectionBundle(
  config: ProjectConfig | null,
  scope: { surface: string; artifactId?: string }
): ConfigProjectionBundle {
  return {
    normalized: normalizeProjectConfig(config),
    prompt: projectConfigForPrompt(config, scope),
  };
}

export function isChineseProseLanguage(proseLanguage: string | undefined): boolean {
  if (!proseLanguage) {
    return false;
  }

  const normalized = proseLanguage.trim().toLowerCase();
  return normalized === 'zh'
    || normalized === 'zh-cn'
    || normalized === 'zh-hans'
    || normalized === '中文';
}

export function getRuntimeFingerprintInput(projection: RuntimeProjection): Record<string, unknown> {
  return {
    consumer: projection.consumer,
    artifactId: projection.artifactId,
    proseLanguage: projection.proseLanguage,
    forbidHardcodedEnglishBoilerplate: projection.forbidHardcodedEnglishBoilerplate,
    fragments: projection.fragments.map((fragment) => ({
      key: fragment.key,
      scope: fragment.scope,
      lines: fragment.lines,
    })),
  };
}
