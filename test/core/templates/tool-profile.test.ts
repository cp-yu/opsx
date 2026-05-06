import { describe, it, expect } from 'vitest';
import { ToolProfileRegistry } from '../../../src/core/templates/tool-profile/index.js';
import { CommandAdapterRegistry } from '../../../src/core/command-generation/index.js';
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

  describe('consistency', () => {
    it('should have command adapter ID match registered adapters', () => {
      for (const profile of ToolProfileRegistry.profiles) {
        if (profile.commandAdapterId) {
          expect(CommandAdapterRegistry.has(profile.commandAdapterId)).toBe(true);
        }
      }
    });

    it('should ensure tools with commands have a registered adapter', () => {
      const commandTools = ToolProfileRegistry.getToolsWithCommands();
      for (const toolId of commandTools) {
        expect(CommandAdapterRegistry.has(toolId)).toBe(true);
      }
    });

    it('should ensure codex has no command adapter', () => {
      const codex = ToolProfileRegistry.get('codex');
      expect(codex).toBeDefined();
      expect(codex!.commandAdapterId).toBeUndefined();
    });

    it('should ensure all tools with skillsDir have skills capability', () => {
      const skillTools = ToolProfileRegistry.getToolsWithSkills();
      for (const toolId of skillTools) {
        expect(ToolProfileRegistry.supportsSkills(toolId)).toBe(true);
      }
    });

    it('should expose correct capabilities for representative tools', () => {
      expect(ToolProfileRegistry.supportsSkills('claude')).toBe(true);
      expect(ToolProfileRegistry.supportsCommands('claude')).toBe(true);
      expect(ToolProfileRegistry.supportsSkills('cursor')).toBe(true);
      expect(ToolProfileRegistry.supportsCommands('cursor')).toBe(true);
      expect(ToolProfileRegistry.supportsSkills('codex')).toBe(true);
      expect(ToolProfileRegistry.supportsCommands('codex')).toBe(false);
    });

    it('should have at least 22 tools with command support', () => {
      expect(ToolProfileRegistry.getToolsWithCommands().length).toBeGreaterThanOrEqual(22);
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
