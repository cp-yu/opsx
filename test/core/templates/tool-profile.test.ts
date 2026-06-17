import { describe, it, expect } from 'vitest';
import { ToolProfileRegistry } from '../../../src/core/templates/tool-profile/index.js';
import { AI_TOOLS } from '../../../src/core/config.js';

describe('Tool Profile Registry', () => {
  describe('completeness', () => {
    it('should have a profile for every available AI tool', () => {
      const availableTools = AI_TOOLS.filter((t) => t.available);
      for (const tool of availableTools) {
        expect(ToolProfileRegistry.has(tool.value)).toBe(true);
      }
    });

    it('should not have profiles for unavailable tools', () => {
      const unavailableTools = AI_TOOLS.filter((t) => !t.available);
      for (const tool of unavailableTools) {
        expect(ToolProfileRegistry.has(tool.value)).toBe(false);
      }
    });

    it('should map skillsDir correctly for all tools', () => {
      for (const tool of AI_TOOLS.filter((t) => t.available)) {
        const profile = ToolProfileRegistry.get(tool.value);
        expect(profile).toBeDefined();
        expect(profile!.skillsDir).toBe(tool.skillsDir);
      }
    });
  });

  describe('consistency (skills-only)', () => {
    it('should not track command adapter IDs', () => {
      for (const profile of ToolProfileRegistry.profiles) {
        expect((profile as Record<string, unknown>).commandAdapterId).toBeUndefined();
      }
    });

    it('should not expose command capability helpers', () => {
      expect((ToolProfileRegistry as Record<string, unknown>).supportsCommands).toBeUndefined();
      expect((ToolProfileRegistry as Record<string, unknown>).getToolsWithCommands).toBeUndefined();
    });

    it('should ensure all tools with skillsDir have skills capability', () => {
      const skillTools = ToolProfileRegistry.getToolsWithSkills();
      for (const toolId of skillTools) {
        expect(ToolProfileRegistry.supportsSkills(toolId)).toBe(true);
      }
    });

    it('should expose skills capability for representative tools', () => {
      expect(ToolProfileRegistry.supportsSkills('claude')).toBe(true);
      expect(ToolProfileRegistry.supportsSkills('cursor')).toBe(true);
      expect(ToolProfileRegistry.supportsSkills('codex')).toBe(true);
    });

    it('should have at least 24 tools with skills support', () => {
      expect(ToolProfileRegistry.getToolsWithSkills().length).toBeGreaterThanOrEqual(24);
    });
  });

  describe('profile alignment', () => {
    it('should match transforms to declared transform IDs in tool profiles', () => {
      for (const profile of ToolProfileRegistry.profiles) {
        for (const transformId of profile.transforms) {
          expect(['codex-command-refs', 'opencode-command-refs', 'pi-command-refs']).toContain(transformId);
        }
      }
    });

    it('should associate codex, opencode, pi with their respective transforms', () => {
      expect(ToolProfileRegistry.get('codex')!.transforms).toContain('codex-command-refs');
      expect(ToolProfileRegistry.get('opencode')!.transforms).toContain('opencode-command-refs');
      expect(ToolProfileRegistry.get('pi')!.transforms).toContain('pi-command-refs');
    });

    it('should not have transforms for majority of tools', () => {
      const nonTransformTools = ToolProfileRegistry.profiles.filter((p) => p.transforms.length === 0);
      expect(nonTransformTools.length).toBeGreaterThanOrEqual(21);
    });
  });
});
