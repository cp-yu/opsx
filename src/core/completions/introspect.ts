import type { Command, Option } from 'commander';
import type { CommandDefinition, FlagDefinition } from './types.js';
import { POSITIONAL_TYPE_MAP } from './positional-types.js';

/**
 * Introspect a Commander.js program and generate CommandDefinition array.
 *
 * Recursively walks the command tree and extracts:
 * - Command names and descriptions
 * - Flags (options) with their metadata
 * - Positional argument detection via registeredArguments
 * - Subcommands (recursively)
 *
 * Filters out:
 * - Hidden commands (experimental, __complete, etc.)
 * - Negate options (--no-xxx internal representations)
 * - Hidden options
 * - Auto-generated --help and --version
 *
 * @param program - Commander.js Command instance (root or subcommand)
 * @param parentPath - Dot-notation path from root (for positionalType lookup)
 * @returns Array of CommandDefinition objects
 */
export function introspectCommands(
  program: Command,
  parentPath: string = ''
): CommandDefinition[] {
  const results: CommandDefinition[] = [];

  for (const cmd of program.commands) {
    // Skip hidden commands
    if ((cmd as any)._hidden === true) {
      continue;
    }

    const name = cmd.name();
    const description = cmd.description();
    const commandPath = parentPath ? `${parentPath}.${name}` : name;

    // Extract flags from options
    const flags: FlagDefinition[] = [];
    for (const option of cmd.options) {
      // Skip negate options (internal Commander.js representation)
      if (option.negate) {
        continue;
      }

      // Skip hidden options
      if (option.hidden) {
        continue;
      }

      // Skip auto-generated help and version
      const longFlag = option.long;
      if (longFlag === '--help' || longFlag === '--version') {
        continue;
      }

      // Extract flag name from --flag-name format
      const flagName = longFlag?.replace(/^--/, '') || '';

      // Extract short flag from -x format
      const shortFlag = option.short?.replace(/^-/, '');

      // Determine if flag takes a value
      const takesValue = option.required || option.optional;

      // Extract possible values from argChoices
      const values = (option as any).argChoices as string[] | undefined;

      flags.push({
        name: flagName,
        short: shortFlag,
        description: option.description || '',
        takesValue,
        values,
      });
    }

    // Detect positional arguments
    const acceptsPositional = cmd.registeredArguments.length > 0;

    // Lookup positionalType from centralized map
    const positionalType = POSITIONAL_TYPE_MAP[commandPath];

    // Recursively extract subcommands
    const subcommands = cmd.commands.length > 0
      ? introspectCommands(cmd, commandPath)
      : undefined;

    results.push({
      name,
      description,
      flags,
      subcommands,
      acceptsPositional,
      positionalType,
    });
  }

  return results;
}
