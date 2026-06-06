import {
  materializeProjectConfigDefaults,
  type ProjectConfig,
} from './project-config.js';

/**
 * Serialize config to YAML string with helpful comments.
 *
 * @param config - Partial config object (schema required, context/rules optional)
 * @returns YAML string ready to write to file
 */
export function serializeConfig(config: Partial<ProjectConfig>): string {
  const lines: string[] = [];
  const materialized = config.schema
    ? materializeProjectConfigDefaults({
        schema: config.schema,
        proseLanguage: config.proseLanguage,
      })
    : config;

  // Schema (required)
  lines.push(`schema: ${materialized.schema}`);
  lines.push('');

  // Document language with comments
  lines.push('# OpenSpec document prose language (optional)');
  lines.push('# Applies only to natural-language body text in artifacts.');
  lines.push('# Keep template headings, IDs, schema keys, commands, and code tokens unchanged.');
  lines.push('# Example:');
  lines.push('#   proseLanguage: zh-CN');
  if (materialized.proseLanguage) {
    lines.push(`proseLanguage: ${materialized.proseLanguage}`);
  }
  lines.push('');

  // Context section with comments
  lines.push('# Project context (optional)');
  lines.push('# This is shown to AI when creating artifacts.');
  lines.push('# Add your tech stack, conventions, style guides, domain knowledge, etc.');
  lines.push('# Example:');
  lines.push('#   context: |');
  lines.push('#     Tech stack: TypeScript, React, Node.js');
  lines.push('#     We use conventional commits');
  lines.push('#     Domain: e-commerce platform');
  lines.push('');

  // Optimization section with comments
  lines.push('# Verify Phase 2 optimization policy (optional)');
  lines.push('# Set enabled: false to keep verify in Phase 1 conformance-only mode.');
  lines.push('# Example:');
  lines.push('#   optimization:');
  lines.push('#     enabled: true');
  lines.push('#     optRetries: 2');
  if (materialized.optimization) {
    lines.push('optimization:');
    lines.push(`  enabled: ${materialized.optimization.enabled !== false}`);
    if (materialized.optimization.optRetries !== undefined) {
      lines.push(`  optRetries: ${materialized.optimization.optRetries}`);
    }
  }
  lines.push('');

  // Apply isolation policy
  lines.push('# Apply-stage implementation policy (optional)');
  lines.push('# Example:');
  lines.push('#   apply:');
  lines.push('#     defaultIsolation: ask  # ask / branch / worktree / none');
  if (materialized.apply) {
    lines.push('apply:');
    lines.push(`  defaultIsolation: ${materialized.apply.defaultIsolation}  # ask / branch / worktree / none`);
  }
  lines.push('');

  // Git archive and merge policy
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

  // Rules section with comments
  lines.push('# Per-artifact rules (optional)');
  lines.push('# Add custom rules for specific artifacts.');
  lines.push('# Example:');
  lines.push('#   rules:');
  lines.push('#     proposal:');
  lines.push('#       - Keep proposals under 500 words');
  lines.push('#       - Always include a "Non-goals" section');
  lines.push('#     tasks:');
  lines.push('#       - Break tasks into chunks of max 2 hours');

  return lines.join('\n') + '\n';
}
