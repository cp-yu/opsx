import { describe, it, expect } from 'vitest';
import {
  renderWorkflowInvocation,
  transformToHyphenCommands,
  transformWorkflowReferences,
} from '../../src/utils/command-references.js';

describe('transformToHyphenCommands', () => {
  describe('basic transformations', () => {
    it('should transform single command reference', () => {
      expect(transformToHyphenCommands('/opsx:apply')).toBe('/opsx-apply');
    });

    it('should transform multiple command references', () => {
      const input = '/opsx:propose and /opsx:apply';
      const expected = '/opsx-propose and /opsx-apply';
      expect(transformToHyphenCommands(input)).toBe(expected);
    });

    it('should transform command reference in context', () => {
      const input = 'Use /opsx:apply to implement tasks';
      const expected = 'Use /opsx-apply to implement tasks';
      expect(transformToHyphenCommands(input)).toBe(expected);
    });

    it('should handle backtick-quoted commands', () => {
      const input = 'Run `/opsx:explore` to proceed';
      const expected = 'Run `/opsx-explore` to proceed';
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
      const input = '/opsx:propose /opsx:explore /opsx:apply';
      const expected = '/opsx-propose /opsx-explore /opsx-apply';
      expect(transformToHyphenCommands(input)).toBe(expected);
    });
  });

  describe('multiline content', () => {
    it('should transform references across multiple lines', () => {
      const input = `Use /opsx:propose to start
Then /opsx:explore to investigate
Finally /opsx:apply to implement`;
      const expected = `Use /opsx-propose to start
Then /opsx-explore to investigate
Finally /opsx-apply to implement`;
      expect(transformToHyphenCommands(input)).toBe(expected);
    });
  });

  describe('all current registry commands', () => {
    const commands = [
      'propose',
      'explore',
      'apply',
      'archive',
      'bootstrap',
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
    expect(renderWorkflowInvocation('codex', 'explore')).toBe('$openspec-explore');
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
    const input = 'Use /opsx:propose, /opsx:explore, and /opsx:apply. Leave /opsx:unknown alone.';
    expect(transformWorkflowReferences(input, 'codex')).toBe(
      'Use $openspec-propose, $openspec-explore, and $openspec-apply-change. Leave /opsx:unknown alone.'
    );
  });
});
