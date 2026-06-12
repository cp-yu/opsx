import { describe, it, expect } from 'vitest';
import { POSITIONAL_TYPE_MAP } from '../../../src/core/completions/positional-types.js';
import { COMMAND_REGISTRY } from '../../../src/core/completions/command-registry.js';
import type { CommandDefinition } from '../../../src/core/completions/types.js';

describe('positional-types', () => {
  it('MAP 条目格式：每个条目的值为合法 PositionalType', () => {
    const validTypes = ['change-id', 'spec-id', 'change-or-spec-id', 'path', 'shell', 'schema-name'];

    for (const [key, value] of Object.entries(POSITIONAL_TYPE_MAP)) {
      expect(validTypes).toContain(value);
      expect(typeof key).toBe('string');
      expect(key.length).toBeGreaterThan(0);
    }
  });

  it('防漏守护：COMMAND_REGISTRY 中所有 positionalType 条目在 MAP 中均存在', () => {
    const missing: string[] = [];

    function collectPositionalCommands(
      commands: CommandDefinition[],
      prefix: string = ''
    ): void {
      for (const cmd of commands) {
        const path = prefix ? `${prefix}.${cmd.name}` : cmd.name;

        if (cmd.acceptsPositional && cmd.positionalType) {
          if (!(path in POSITIONAL_TYPE_MAP)) {
            missing.push(path);
          }
        }

        if (cmd.subcommands) {
          collectPositionalCommands(cmd.subcommands, path);
        }
      }
    }

    collectPositionalCommands(COMMAND_REGISTRY);

    if (missing.length > 0) {
      throw new Error(
        `以下命令在 COMMAND_REGISTRY 中声明了 positionalType，但未在 POSITIONAL_TYPE_MAP 中注册：\n${missing.join('\n')}`
      );
    }
  });
});
