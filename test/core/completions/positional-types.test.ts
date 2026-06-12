import { describe, it, expect } from 'vitest';
import { POSITIONAL_TYPE_MAP } from '../../../src/core/completions/positional-types.js';

describe('positional-types', () => {
  it('MAP 条目格式：每个条目的值为合法 PositionalType', () => {
    const validTypes = ['change-id', 'spec-id', 'change-or-spec-id', 'path', 'shell', 'schema-name'];

    for (const [key, value] of Object.entries(POSITIONAL_TYPE_MAP)) {
      expect(validTypes).toContain(value);
      expect(typeof key).toBe('string');
      expect(key.length).toBeGreaterThan(0);
    }
  });

  it('MAP 包含预期的命令路径', () => {
    // 验证一些关键命令路径存在
    expect(POSITIONAL_TYPE_MAP['archive']).toBe('change-id');
    expect(POSITIONAL_TYPE_MAP['validate']).toBe('change-or-spec-id');
    expect(POSITIONAL_TYPE_MAP['spec.show']).toBe('spec-id');
    expect(POSITIONAL_TYPE_MAP['completion.generate']).toBe('shell');
    expect(POSITIONAL_TYPE_MAP['verify.phase1']).toBe('change-id');
  });
});
