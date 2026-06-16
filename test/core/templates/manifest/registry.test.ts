import { describe, it, expect } from 'vitest';
import { WorkflowManifestRegistry } from '../../../../src/core/templates/manifest/registry.js';

describe('WorkflowManifestRegistry', () => {
  describe('固定的 6 个工作流', () => {
    it('should contain exactly 6 workflows', () => {
      const entries = WorkflowManifestRegistry.entries;
      expect(entries).toHaveLength(6);
    });

    it('should contain propose, explore, apply, archive, bootstrap-opsx, snack', () => {
      const workflowIds = WorkflowManifestRegistry.getAllWorkflowIds();
      expect(workflowIds).toEqual([
        'propose',
        'explore',
        'apply',
        'archive',
        'bootstrap-opsx',
        'snack',
      ]);
    });

    it('should not contain removed workflows', () => {
      const removedWorkflows = ['new', 'continue', 'ff', 'verify', 'sync', 'bulk-archive', 'onboard'];
      for (const workflowId of removedWorkflows) {
        expect(WorkflowManifestRegistry.has(workflowId)).toBe(false);
      }
    });
  });

  describe('modeMembership 作为标签系统', () => {
    it('core workflows should have ["core"] tag', () => {
      const coreWorkflows = ['propose', 'explore', 'apply', 'archive', 'snack'];
      for (const workflowId of coreWorkflows) {
        const entry = WorkflowManifestRegistry.get(workflowId);
        expect(entry?.modeMembership).toEqual(['core']);
      }
    });

    it('bootstrap-opsx should have empty modeMembership', () => {
      const entry = WorkflowManifestRegistry.get('bootstrap-opsx');
      expect(entry?.modeMembership).toEqual([]);
    });
  });

  describe('snack skill-only entry', () => {
    it('snack should register skill template but no command template', () => {
      const entry = WorkflowManifestRegistry.get('snack');
      expect(entry).toBeDefined();
      expect(entry?.getSkillTemplate).toBeDefined();
      expect(entry?.getCommandTemplate).toBeUndefined();
    });
  });

  describe('getSkillNames', () => {
    it('should return 6 skill names', () => {
      const skillNames = WorkflowManifestRegistry.getSkillNames();
      expect(skillNames).toHaveLength(6);
      expect(skillNames).toContain('openspec-propose');
      expect(skillNames).toContain('openspec-explore');
      expect(skillNames).toContain('openspec-apply-change');
      expect(skillNames).toContain('openspec-archive-change');
      expect(skillNames).toContain('openspec-bootstrap-opsx');
      expect(skillNames).toContain('openspec-snack');
    });
  });

  describe('getCommandSlugMap', () => {
    it('should map workflow IDs to command slugs', () => {
      const map = WorkflowManifestRegistry.getCommandSlugMap();
      expect(map).toEqual({
        'propose': 'propose',
        'explore': 'explore',
        'apply': 'apply',
        'archive': 'archive',
        'bootstrap-opsx': 'bootstrap',
        'snack': 'snack',
      });
    });
  });
});
