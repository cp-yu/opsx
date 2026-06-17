import { describe, it, expect } from 'vitest';
import { parse as parseYaml } from 'yaml';
import {
  getSkillTemplates,
  generateSkillContent,
} from '../../../src/core/shared/skill-generation.js';
import { transformWorkflowReferences } from '../../../src/utils/command-references.js';

describe('skill-generation', () => {
  describe('getSkillTemplates', () => {
    it('should return all 9 skill templates', () => {
      const templates = getSkillTemplates();
      expect(templates).toHaveLength(9);
    });

    it('should have unique directory names', () => {
      const templates = getSkillTemplates();
      const dirNames = templates.map(t => t.dirName);
      const uniqueDirNames = new Set(dirNames);
      expect(uniqueDirNames.size).toBe(templates.length);
    });

    it('should include all expected skills', () => {
      const templates = getSkillTemplates();
      const dirNames = templates.map(t => t.dirName);

      expect(dirNames).toContain('openspec-explore');
      expect(dirNames).toContain('openspec-apply-change');
      expect(dirNames).toContain('openspec-archive-change');
      expect(dirNames).toContain('openspec-propose');
      expect(dirNames).toContain('openspec-bootstrap-opsx');
      expect(dirNames).toContain('openspec-reviewer');
      expect(dirNames).toContain('openspec-optimizer');
      expect(dirNames).toContain('openspec-impact-sweeper');
      expect(dirNames).not.toContain('openspec-implementer');
    });

    it('should have valid template structure', () => {
      const templates = getSkillTemplates();

      for (const { template, dirName, workflowId } of templates) {
        expect(template.name).toBeTruthy();
        expect(template.description).toBeTruthy();
        expect(template.instructions).toBeTruthy();
        expect(dirName).toBeTruthy();
        expect(workflowId).toBeTruthy();
      }
    });

    it('should have unique workflow IDs', () => {
      const templates = getSkillTemplates();
      const ids = templates.map(t => t.workflowId);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(templates.length);
    });

    it('should filter by workflow IDs when provided — internal skills always included', () => {
      const filtered = getSkillTemplates(['propose', 'explore', 'apply', 'archive']);
      expect(filtered).toHaveLength(7);
      const ids = filtered.map(t => t.workflowId);
      expect(ids).toContain('propose');
      expect(ids).toContain('explore');
      expect(ids).toContain('apply');
      expect(ids).toContain('archive');
    });

    it('should return all templates when filter is undefined', () => {
      const all = getSkillTemplates();
      const noFilter = getSkillTemplates(undefined);
      expect(noFilter).toHaveLength(all.length);
    });

    it('should return internal skills when filter matches nothing', () => {
      const filtered = getSkillTemplates(['nonexistent']);
      expect(filtered).toHaveLength(3);
      // Only internal skills, no workflow surfaces
      expect(filtered.every(e => e.workflowId.startsWith('openspec-'))).toBe(true);
    });

    it('should return single workflow template plus internal skills when filter has one workflow', () => {
      const filtered = getSkillTemplates(['propose']);
      expect(filtered).toHaveLength(4);
      expect(filtered[0].workflowId).toBe('propose');
      expect(filtered[0].dirName).toBe('openspec-propose');
    });

    it('should use tool-specific archive skill templates when available', () => {
      const defaultArchive = getSkillTemplates(['archive'])[0];
      const claudeArchive = getSkillTemplates(['archive'], 'claude')[0];
      const codexArchive = getSkillTemplates(['archive'], 'codex')[0];

      expect(defaultArchive.template.instructions).toContain('current-agent-reread');
      expect(claudeArchive.template.instructions).toContain('subagent-orchestrated');
      expect(codexArchive.template.instructions).toContain('subagent-orchestrated');
    });
  });

  describe('getSkillTemplates (skills-only surface)', () => {
    it('should not expose command templates or contents as active surface', async () => {
      const mod = await import('../../../src/core/shared/skill-generation.js');
      expect((mod as Partial<typeof mod>).getCommandTemplates).toBeUndefined();
      expect((mod as Partial<typeof mod>).getCommandContents).toBeUndefined();
    });
  });

  describe('generateSkillContent', () => {
    it('should generate valid YAML frontmatter', () => {
      const template = {
        name: 'test-skill',
        description: 'Test description',
        instructions: 'Test instructions',
        license: 'MIT',
        compatibility: 'Test compatibility',
        metadata: {
          author: 'test-author',
          version: '2.0',
        },
      };

      const content = generateSkillContent(template, '0.23.0');

      expect(content).toMatch(/^---\n/);
      expect(content).toContain('name: "test-skill"');
      expect(content).toContain('description: "Test description"');
      expect(content).toContain('license: "MIT"');
      expect(content).toContain('compatibility: "Test compatibility"');
      expect(content).toContain('author: "test-author"');
      expect(content).toContain('version: "2.0"');
      expect(content).toContain('generatedBy: "0.23.0"');
      expect(content).toContain('Test instructions');
    });

    it('should escape YAML-sensitive frontmatter values', () => {
      const template = {
        name: 'test-skill',
        description: 'Quick code-first sync: generate specs from "git diff"',
        instructions: 'Test instructions',
        compatibility: 'Line 1\nLine 2',
      };

      const content = generateSkillContent(template, '0.23.0');
      const frontmatter = content.match(/^---\n([\s\S]*?)\n---\n/)?.[1];

      expect(frontmatter).toBeDefined();
      expect(parseYaml(frontmatter!)).toMatchObject({
        name: 'test-skill',
        description: 'Quick code-first sync: generate specs from "git diff"',
        compatibility: 'Line 1\nLine 2',
      });
    });

    it('should use default values for optional fields', () => {
      const template = {
        name: 'minimal-skill',
        description: 'Minimal description',
        instructions: 'Minimal instructions',
      };

      const content = generateSkillContent(template, '0.24.0');

      expect(content).toContain('license: "MIT"');
      expect(content).toContain('compatibility: "Requires openspec CLI."');
      expect(content).toContain('author: "openspec"');
      expect(content).toContain('version: "1.0"');
      expect(content).toContain('generatedBy: "0.24.0"');
    });

    it('should embed the provided version in generatedBy field', () => {
      const template = {
        name: 'version-test',
        description: 'Test version embedding',
        instructions: 'Instructions',
      };

      const content1 = generateSkillContent(template, '0.23.0');
      expect(content1).toContain('generatedBy: "0.23.0"');

      const content2 = generateSkillContent(template, '1.0.0');
      expect(content2).toContain('generatedBy: "1.0.0"');

      const content3 = generateSkillContent(template, '0.24.0-beta.1');
      expect(content3).toContain('generatedBy: "0.24.0-beta.1"');
    });

    it('should end frontmatter with separator and blank line', () => {
      const template = {
        name: 'test',
        description: 'Test',
        instructions: 'Body content',
      };

      const content = generateSkillContent(template, '0.23.0');

      expect(content).toMatch(/---\n\nBody content\n$/);
    });

    it('should apply transformInstructions callback when provided', () => {
      const template = {
        name: 'transform-test',
        description: 'Test transform callback',
        instructions: 'Use /opsx:new to start and /opsx:apply to implement.',
      };

      const transformer = (text: string) => text.replace(/\/opsx:/g, '/opsx-');
      const content = generateSkillContent(template, '0.23.0', transformer);

      expect(content).toContain('/opsx-new');
      expect(content).toContain('/opsx-apply');
      expect(content).not.toContain('/opsx:new');
      expect(content).not.toContain('/opsx:apply');
    });

    it('should not transform instructions when callback is undefined', () => {
      const template = {
        name: 'no-transform-test',
        description: 'Test without transform',
        instructions: 'Use /opsx:new to start.',
      };

      const content = generateSkillContent(template, '0.23.0', undefined);

      expect(content).toContain('/opsx:new');
    });

    it('should support custom transformInstructions logic', () => {
      const template = {
        name: 'custom-transform',
        description: 'Test custom transform',
        instructions: 'Some PLACEHOLDER text here.',
      };

      const customTransformer = (text: string) => text.replace('PLACEHOLDER', 'REPLACED');
      const content = generateSkillContent(template, '0.23.0', customTransformer);

      expect(content).toContain('Some REPLACED text here.');
      expect(content).not.toContain('PLACEHOLDER');
    });

    it('does not inline reference files into SKILL.md content', () => {
      const template = {
        name: 'reference-test',
        description: 'Test references',
        instructions: 'Read references/details.md when needed.',
        referenceFiles: [
          {
            path: 'references/details.md',
            content: 'Detailed protocol',
          },
        ],
      };

      const content = generateSkillContent(template, '0.23.0');

      expect(content).toContain('Read references/details.md when needed.');
      expect(content).not.toContain('Detailed protocol');
    });

    it('should transform workflow references to precise codex skill names', () => {
      const template = {
        name: 'codex-transform',
        description: 'Test codex transform',
        instructions: 'Use /opsx:propose, then /opsx:explore, then /opsx:apply.',
      };

      const content = generateSkillContent(
        template,
        '0.23.0',
        (text: string) => transformWorkflowReferences(text, 'codex')
      );

      expect(content).toContain('$openspec-propose');
      expect(content).toContain('$openspec-explore');
      expect(content).toContain('$openspec-apply-change');
      expect(content).not.toContain('/opsx:propose');
      expect(content).not.toContain('/opsx:explore');
      expect(content).not.toContain('/opsx:apply');
    });
  });
});
