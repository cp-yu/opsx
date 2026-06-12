import type { CommandDefinition } from './types.js';

/**
 * Centralized mapping of command paths to their positional argument types.
 *
 * This map supplements Commander.js introspection with completion semantics
 * that cannot be derived from the command tree structure alone.
 *
 * Format: dot-notation path (e.g., 'validate', 'spec.show', 'verify.phase1')
 */
export const POSITIONAL_TYPE_MAP: Record<string, NonNullable<CommandDefinition['positionalType']>> = {
  // Top-level commands
  'init': 'path',
  'update': 'path',
  'validate': 'change-or-spec-id',
  'show': 'change-or-spec-id',
  'archive': 'change-id',
  'sync': 'change-id',
  'instructions': 'change-or-spec-id',

  // change subcommands
  'change.show': 'change-id',
  'change.validate': 'change-id',

  // spec subcommands
  'spec.show': 'spec-id',
  'spec.validate': 'spec-id',

  // completion subcommands
  'completion.generate': 'shell',
  'completion.install': 'shell',
  'completion.uninstall': 'shell',

  // schema subcommands
  'schema.which': 'schema-name',
  'schema.validate': 'schema-name',
  'schema.fork': 'schema-name',

  // new subcommands
  'new.change': 'change-or-spec-id',

  // bootstrap subcommands
  'bootstrap.instructions': 'change-or-spec-id',

  // verify subcommands
  'verify.phase1': 'change-id',
  'verify.phase2': 'change-id',
  'verify.seal': 'change-id',
  'verify.status': 'change-id',
} as const;
