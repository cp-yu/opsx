import { describe, it, expect } from 'vitest';
import { WorkflowManifestRegistry } from '../../../../src/core/templates/manifest/registry.js';

describe('WorkflowManifestRegistry', () => {
  describe('固定的 5 个工作流', () => {
    it('should contain exactly 5 workflows', () => {
      const entries = WorkflowManifestRegistry.entries;
      expect(entries).toHaveLength(5);
    });

    it('should contain propose, explore, apply, archive, bootstrap-opsx', () => {
      const workflowIds = WorkflowManifestRegistry.getAllWorkflowIds();
      expect(workflowIds).toEqual([
        'propose',
        'explore',
        'apply',
        'archive',
        'bootstrap-opsx',
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
      const coreWorkflows = ['propose', 'explore', 'apply', 'archive'];
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

  describe('getSkillNames', () => {
    it('should return 5 skill names', () => {
      const skillNames = WorkflowManifestRegistry.getSkillNames();
      expect(skillNames).toHaveLength(5);
      expect(skillNames).toContain('openspec-propose');
      expect(skillNames).toContain('openspec-explore');
      expect(skillNames).toContain('openspec-apply-change');
      expect(skillNames).toContain('openspec-archive-change');
      expect(skillNames).toContain('openspec-bootstrap-opsx');
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
      });
    });
  });
});
