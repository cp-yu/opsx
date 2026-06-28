import { describe, it, expect } from 'vitest';
import {
  renderWorkflowInvocation,
  transformToHyphenCommands,
  transformWorkflowReferences,
} from '../../src/utils/command-references.js';

describe('transformToHyphenCommands (opencode command surface)', () => {
  describe('basic transformations', () => {
    it('should transform single command reference to opencode command syntax', () => {
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
  });
});

describe('renderWorkflowInvocation', () => {
  it('renders precise codex skill names from the manifest', () => {
    expect(renderWorkflowInvocation('codex', 'propose')).toBe('$openspec-propose');
    expect(renderWorkflowInvocation('codex', 'explore')).toBe('$openspec-explore');
    expect(renderWorkflowInvocation('codex', 'apply')).toBe('$openspec-apply-change');
    expect(renderWorkflowInvocation('codex', 'archive')).toBe('$openspec-archive-change');
  });

  it('renders precise tool invocations from the manifest', () => {
    expect(renderWorkflowInvocation('claude', 'apply')).toBe('/openspec-apply-change');
    expect(renderWorkflowInvocation('pi', 'apply')).toBe('/skill:openspec-apply-change');
    expect(renderWorkflowInvocation('opencode', 'apply')).toBe('/opsx-apply');
  });

  it('uses neutral skill invocation for tools without precise metadata', () => {
    expect(renderWorkflowInvocation('cursor', 'explore')).toBe('invoke the openspec-explore skill');
  });

  it('SHALL NOT fall back to command syntax for tools without precise metadata', () => {
    expect(renderWorkflowInvocation('cursor', 'apply')).not.toContain('/opsx:');
    expect(renderWorkflowInvocation('cursor', 'apply')).not.toContain('/opsx-');
  });
});

describe('transformWorkflowReferences', () => {
  it('rewrites only registered workflow references for codex', () => {
    const input = 'Use /opsx:propose, /opsx:explore, and /opsx:apply. Leave /opsx:unknown alone.';
    expect(transformWorkflowReferences(input, 'codex')).toBe(
      'Use $openspec-propose, $openspec-explore, and $openspec-apply-change. Leave /opsx:unknown alone.'
    );
  });

  it('rewrites registered workflow references to precise invocation for claude', () => {
    const input = 'Use /opsx:propose, /opsx:explore, and /opsx:apply.';
    expect(transformWorkflowReferences(input, 'claude')).toBe(
      'Use /openspec-propose, /openspec-explore, and /openspec-apply-change.'
    );
  });

  it('rewrites registered workflow references to precise invocation for pi', () => {
    const input = 'Use /opsx:apply and /opsx:archive.';
    expect(transformWorkflowReferences(input, 'pi')).toBe(
      'Use /skill:openspec-apply-change and /skill:openspec-archive-change.'
    );
  });

  it('rewrites registered workflow references to opencode command syntax', () => {
    const input = 'Use /opsx:apply and /opsx:archive.';
    expect(transformWorkflowReferences(input, 'opencode')).toBe(
      'Use /opsx-apply and /opsx-archive.'
    );
  });

  it('rewrites registered workflow references to neutral skill invocation for unknown tools', () => {
    const input = 'Use /opsx:propose, /opsx:explore, and /opsx:apply. Leave /opsx:unknown alone.';
    expect(transformWorkflowReferences(input, 'cursor')).toBe(
      'Use invoke the openspec-propose skill, invoke the openspec-explore skill, and invoke the openspec-apply-change skill. Leave /opsx:unknown alone.'
    );
  });
});
