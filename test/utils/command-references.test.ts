import { describe, it, expect } from 'vitest';
import {
  renderWorkflowInvocation,
  transformToHyphenCommands,
  transformWorkflowReferences,
} from '../../src/utils/command-references.js';

describe('transformToHyphenCommands', () => {
  describe('basic transformations', () => {
    it('should transform single command reference', () => {
      expect(transformToHyphenCommands('/opsx:new')).toBe('/opsx-new');
    });

    it('should transform multiple command references', () => {
      const input = '/opsx:new and /opsx:apply';
      const expected = '/opsx-new and /opsx-apply';
      expect(transformToHyphenCommands(input)).toBe(expected);
    });

    it('should transform command reference in context', () => {
      const input = 'Use /opsx:apply to implement tasks';
      const expected = 'Use /opsx-apply to implement tasks';
      expect(transformToHyphenCommands(input)).toBe(expected);
    });

    it('should handle backtick-quoted commands', () => {
      const input = 'Run `/opsx:continue` to proceed';
      const expected = 'Run `/opsx-continue` to proceed';
      expect(transformToHyphenCommands(input)).toBe(expected);
    });
  });

  describe('edge cases', () => {
    it('should return unchanged text with no command references', () => {
      const input = 'This is plain text without commands';
      expect(transformToHyphenCommands(input)).toBe(input);
    });

    it('should return empty string unchanged', () => {
      expect(transformToHyphenCommands('')).toBe('');
    });

    it('should not transform similar but non-matching patterns', () => {
      const input = '/ops:new opsx: /other:command';
      expect(transformToHyphenCommands(input)).toBe(input);
    });

    it('should handle multiple occurrences on same line', () => {
      const input = '/opsx:new /opsx:continue /opsx:apply';
      const expected = '/opsx-new /opsx-continue /opsx-apply';
      expect(transformToHyphenCommands(input)).toBe(expected);
    });
  });

  describe('multiline content', () => {
    it('should transform references across multiple lines', () => {
      const input = `Use /opsx:new to start
Then /opsx:continue to proceed
Finally /opsx:apply to implement`;
      const expected = `Use /opsx-new to start
Then /opsx-continue to proceed
Finally /opsx-apply to implement`;
      expect(transformToHyphenCommands(input)).toBe(expected);
    });
  });

  describe('all known commands', () => {
    const commands = [
      'new',
      'continue',
      'apply',
      'ff',
      'sync',
      'archive',
      'bulk-archive',
      'verify',
      'explore',
      'onboard',
    ];

    for (const cmd of commands) {
      it(`should transform /opsx:${cmd}`, () => {
        expect(transformToHyphenCommands(`/opsx:${cmd}`)).toBe(`/opsx-${cmd}`);
      });
    }
  });
});

describe('renderWorkflowInvocation', () => {
  it('renders precise codex skill names from the manifest', () => {
    expect(renderWorkflowInvocation('codex', 'propose')).toBe('$openspec-propose');
    expect(renderWorkflowInvocation('codex', 'new')).toBe('$openspec-new-change');
    expect(renderWorkflowInvocation('codex', 'continue')).toBe('$openspec-continue-change');
    expect(renderWorkflowInvocation('codex', 'apply')).toBe('$openspec-apply-change');
    expect(renderWorkflowInvocation('codex', 'archive')).toBe('$openspec-archive-change');
  });

  it('keeps command-backed tools on their command syntax', () => {
    expect(renderWorkflowInvocation('claude', 'apply')).toBe('/opsx:apply');
    expect(renderWorkflowInvocation('opencode', 'apply')).toBe('/opsx-apply');
  });
});

describe('transformWorkflowReferences', () => {
  it('rewrites only registered workflow references for codex', () => {
    const input = 'Use /opsx:new, /opsx:continue, and /opsx:apply. Leave /opsx:unknown alone.';
    expect(transformWorkflowReferences(input, 'codex')).toBe(
      'Use $openspec-new-change, $openspec-continue-change, and $openspec-apply-change. Leave /opsx:unknown alone.'
    );
  });
});
