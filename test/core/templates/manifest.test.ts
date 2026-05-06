import { describe, it, expect } from 'vitest';
import { WorkflowManifestRegistry } from '../../../src/core/templates/manifest/index.js';

describe('Workflow Manifest', () => {
  describe('completeness', () => {
    it('should have entries for all core workflows', () => {
      const coreIds = WorkflowManifestRegistry.getWorkflowsForPreset('core');
      expect(coreIds).toContain('propose');
      expect(coreIds).toContain('explore');
      expect(coreIds).toContain('apply');
      expect(coreIds).toContain('archive');
      expect(coreIds.length).toBeGreaterThanOrEqual(4);
    });

    it('should have entries for all expanded workflows', () => {
      const expandedIds = WorkflowManifestRegistry.getWorkflowsForPreset('expanded');
      // Core workflows are also in expanded
      expect(expandedIds).toContain('new');
      expect(expandedIds).toContain('continue');
      expect(expandedIds).toContain('ff');
      expect(expandedIds).toContain('sync');
      expect(expandedIds).toContain('verify');
      expect(expandedIds).toContain('onboard');
      expect(expandedIds.length).toBeGreaterThanOrEqual(10);
    });

    it('should define skillDirName for every entry', () => {
      for (const entry of WorkflowManifestRegistry.entries) {
        expect(entry.skillDirName).toBeTruthy();
        expect(entry.skillDirName).toMatch(/^openspec-/);
      }
    });

    it('should define commandSlug for every entry', () => {
      for (const entry of WorkflowManifestRegistry.entries) {
        expect(entry.commandSlug).toBeTruthy();
        expect(typeof entry.commandSlug).toBe('string');
      }
    });

    it('should define promptMeta with name and description', () => {
      for (const entry of WorkflowManifestRegistry.entries) {
        expect(entry.promptMeta.name).toBeTruthy();
        expect(entry.promptMeta.description).toBeTruthy();
      }
    });

    it('should produce skill getter that returns required metadata', () => {
      for (const entry of WorkflowManifestRegistry.entries) {
        const skill = entry.getSkillTemplate();
        expect(skill.name).toBeTruthy();
        expect(skill.description).toBeTruthy();
        expect(skill.instructions).toBeTruthy();
        expect(skill.license || 'MIT').toBeTruthy();
        expect(skill.compatibility || 'Requires openspec CLI.').toBeTruthy();
      }
    });

    it('should produce command getter with required fields', () => {
      for (const entry of WorkflowManifestRegistry.entries) {
        const cmd = entry.getCommandTemplate();
        expect(cmd.name).toBeTruthy();
        expect(cmd.description).toBeTruthy();
        expect(cmd.category).toBeTruthy();
        expect(cmd.content).toBeTruthy();
        expect(Array.isArray(cmd.tags)).toBe(true);
      }
    });

    it('should have all workflow IDs as lowercase with hyphens', () => {
      for (const id of WorkflowManifestRegistry.getAllWorkflowIds()) {
        expect(id).toMatch(/^[a-z0-9-]+$/);
      }
    });

    it('should have consistent projections', () => {
      const commandSlugMap = WorkflowManifestRegistry.getCommandSlugMap();
      const skillDirMap = WorkflowManifestRegistry.getSkillDirMap();

      for (const entry of WorkflowManifestRegistry.entries) {
        expect(commandSlugMap[entry.workflowId]).toBe(entry.commandSlug);
        expect(skillDirMap[entry.workflowId]).toBe(entry.skillDirName);
      }
    });

    it('should produce at least 12 workflow entries', () => {
      expect(WorkflowManifestRegistry.entries.length).toBeGreaterThanOrEqual(12);
    });
  });

  describe('projection consistency', () => {
    it('should derive skill names from manifest', () => {
      const names = WorkflowManifestRegistry.getSkillNames();
      expect(names.length).toBe(WorkflowManifestRegistry.entries.length);
      for (const name of names) {
        expect(name).toMatch(/^openspec-/);
      }
    });

    it('should derive workflow IDs from manifest', () => {
      const ids = WorkflowManifestRegistry.getAllWorkflowIds();
      expect(ids.length).toBe(WorkflowManifestRegistry.entries.length);
      expect(new Set(ids).size).toBe(ids.length); // No duplicates
    });

    it('should be filterable by workflow IDs', () => {
      const filtered = WorkflowManifestRegistry.filterByWorkflowIds(['explore', 'apply']);
      expect(filtered.length).toBe(2);
      expect(filtered[0].workflowId).toMatch(/^(explore|apply)$/);
      expect(filtered[1].workflowId).toMatch(/^(explore|apply)$/);
    });

    it('should return all entries when no filter is provided', () => {
      const all = WorkflowManifestRegistry.filterByWorkflowIds(undefined);
      expect(all.length).toBe(WorkflowManifestRegistry.entries.length);
    });

    it('should return all entries when empty filter is provided', () => {
      const all = WorkflowManifestRegistry.filterByWorkflowIds([]);
      expect(all.length).toBe(WorkflowManifestRegistry.entries.length);
    });
  });
});
