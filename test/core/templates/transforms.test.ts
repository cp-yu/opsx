import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  TransformRegistry,
  runTransforms,
} from '../../../src/core/templates/transforms/index.js';
import type { ArtifactTransform, GenerationContext } from '../../../src/core/templates/transforms/types.js';

describe('Transform Pipeline', () => {
  describe('builtin transforms', () => {
    it('should contain registered transforms for codex, opencode, pi', () => {
      const all = TransformRegistry.getAll();
      const ids = all.map((t) => t.id);
      expect(ids).toContain('codex-command-refs');
      expect(ids).toContain('opencode-command-refs');
      expect(ids).toContain('pi-command-refs');
    });

    it('should transform colon-based references for codex', () => {
      const result = runTransforms('Run /opsx:apply to implement',
        { toolId: 'codex', workflowId: 'apply', artifactType: 'skill' });
      expect(result).toBe('Run $openspec-apply-change to implement');
    });

    it('should transform colon-based references for opencode', () => {
      const result = runTransforms('Run /opsx:apply to implement',
        { toolId: 'opencode', workflowId: 'apply', artifactType: 'skill' });
      expect(result).toBe('Run /opsx-apply to implement');
    });
  });

  describe('ordering', () => {
    let registeredIds: string[] = [];

    afterEach(() => {
      for (const id of registeredIds) {
        TransformRegistry.remove(id);
      }
      registeredIds = [];
    });

    it('should execute preAdapter transforms before postAdapter', () => {
      const order: string[] = [];

      const preTransform: ArtifactTransform = {
        id: 'test-ordering-pre',
        scope: 'both',
        phase: 'preAdapter',
        priority: 0,
        applies: () => true,
        transform: (content) => { order.push('pre'); return content; },
      };

      const postTransform: ArtifactTransform = {
        id: 'test-ordering-post',
        scope: 'both',
        phase: 'postAdapter',
        priority: 0,
        applies: () => true,
        transform: (content) => { order.push('post'); return content; },
      };

      registeredIds = ['test-ordering-pre', 'test-ordering-post'];
      TransformRegistry.register(preTransform);
      TransformRegistry.register(postTransform);

      runTransforms('test', { toolId: 'test', workflowId: 'test', artifactType: 'skill' });

      expect(order).toEqual(['pre', 'post']);
    });

    it('should execute transforms with lower priority first within same phase', () => {
      const order: string[] = [];

      const lowPriority: ArtifactTransform = {
        id: 'test-prio-low',
        scope: 'both',
        phase: 'preAdapter',
        priority: 5,
        applies: () => true,
        transform: (content) => { order.push('low'); return content; },
      };

      const highPriority: ArtifactTransform = {
        id: 'test-prio-high',
        scope: 'both',
        phase: 'preAdapter',
        priority: 10,
        applies: () => true,
        transform: (content) => { order.push('high'); return content; },
      };

      registeredIds = ['test-prio-low', 'test-prio-high'];
      TransformRegistry.register(highPriority);
      TransformRegistry.register(lowPriority);

      runTransforms('test', { toolId: 'test', workflowId: 'test', artifactType: 'skill' });

      expect(order).toEqual(['low', 'high']);
    });
  });

  describe('applicability', () => {
    let registeredIds: string[] = [];

    afterEach(() => {
      for (const id of registeredIds) {
        TransformRegistry.remove(id);
      }
      registeredIds = [];
    });

    it('should only apply transforms matching scope', () => {
      const skillOnlyTransform: ArtifactTransform = {
        id: 'test-scope-skill',
        scope: 'skill',
        phase: 'preAdapter',
        priority: 0,
        applies: () => true,
        transform: (content) => content + ' [skill]',
      };

      const commandOnlyTransform: ArtifactTransform = {
        id: 'test-scope-command',
        scope: 'command',
        phase: 'preAdapter',
        priority: 0,
        applies: () => true,
        transform: (content) => content + ' [command]',
      };

      registeredIds = ['test-scope-skill', 'test-scope-command'];
      TransformRegistry.register(skillOnlyTransform);
      TransformRegistry.register(commandOnlyTransform);

      const skillResult = runTransforms('base', {
        toolId: 'test', workflowId: 'test', artifactType: 'skill',
      });
      expect(skillResult).toBe('base [skill]');

      const commandResult = runTransforms('base', {
        toolId: 'test', workflowId: 'test', artifactType: 'command',
      });
      expect(commandResult).toBe('base [command]');
    });

    it('should apply "both" scope transforms to both artifact types', () => {
      const bothTransform: ArtifactTransform = {
        id: 'test-scope-both',
        scope: 'both',
        phase: 'preAdapter',
        priority: 0,
        applies: () => true,
        transform: (content) => content + ' [both]',
      };

      registeredIds = ['test-scope-both'];
      TransformRegistry.register(bothTransform);

      const skillResult = runTransforms('base', {
        toolId: 'test', workflowId: 'test', artifactType: 'skill',
      });
      expect(skillResult).toBe('base [both]');

      const commandResult = runTransforms('base', {
        toolId: 'test', workflowId: 'test', artifactType: 'command',
      });
      expect(commandResult).toBe('base [both]');
    });

    it('should respect applies predicate', () => {
      const conditionalTransform: ArtifactTransform = {
        id: 'test-applies-cond',
        scope: 'both',
        phase: 'preAdapter',
        priority: 0,
        applies: (ctx: GenerationContext) => ctx.toolId === 'match',
        transform: (content) => content + ' [matched]',
      };

      registeredIds = ['test-applies-cond'];
      TransformRegistry.register(conditionalTransform);

      const matchResult = runTransforms('base', {
        toolId: 'match', workflowId: 'test', artifactType: 'skill',
      });
      expect(matchResult).toBe('base [matched]');

      const noMatchResult = runTransforms('base', {
        toolId: 'nomatch', workflowId: 'test', artifactType: 'skill',
      });
      expect(noMatchResult).toBe('base');
    });
  });

  describe('phase filtering', () => {
    let registeredIds: string[] = [];

    afterEach(() => {
      for (const id of registeredIds) {
        TransformRegistry.remove(id);
      }
      registeredIds = [];
    });

    it('should only apply specified phase when phase argument is provided', () => {
      const preTransform: ArtifactTransform = {
        id: 'test-phase-pre',
        scope: 'both',
        phase: 'preAdapter',
        priority: 0,
        applies: () => true,
        transform: (content) => content + ' [pre]',
      };

      const postTransform: ArtifactTransform = {
        id: 'test-phase-post',
        scope: 'both',
        phase: 'postAdapter',
        priority: 0,
        applies: () => true,
        transform: (content) => content + ' [post]',
      };

      registeredIds = ['test-phase-pre', 'test-phase-post'];
      TransformRegistry.register(preTransform);
      TransformRegistry.register(postTransform);

      const preResult = runTransforms('base', {
        toolId: 'test', workflowId: 'test', artifactType: 'skill',
      }, 'preAdapter');
      expect(preResult).toBe('base [pre]');

      const postResult = runTransforms('base', {
        toolId: 'test', workflowId: 'test', artifactType: 'skill',
      }, 'postAdapter');
      expect(postResult).toBe('base [post]');
    });
  });
});
