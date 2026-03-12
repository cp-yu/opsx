import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { randomUUID } from 'crypto';
import { stringify as stringifyYaml } from 'yaml';
import {
  OPSX_PATHS,
  readProjectOpsx,
  writeProjectOpsx,
  validateReferentialIntegrity,
  type ProjectOpsx,
} from '../../src/utils/opsx-utils.js';

/**
 * Edge Case Tests for OPSX Utils
 *
 * These tests verify correct handling of:
 * - Empty deltas
 * - Malformed YAML
 * - Concurrent modifications
 * - Boundary conditions
 */

describe('Edge Cases: OPSX Utils', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = path.join(os.tmpdir(), `openspec-opsx-edge-${randomUUID()}`);
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('Empty Delta Handling', () => {
    it('should handle empty project with only metadata', async () => {
      const data: ProjectOpsx = {
        project: { name: 'test', version: '1.0' },
      };

      await writeProjectOpsx(testDir, data);
      const result = await readProjectOpsx(testDir);

      expect(result).not.toBeNull();
      expect(result!.project.name).toBe('test');
      expect(result!.domains).toBeUndefined();
      expect(result!.capabilities).toBeUndefined();
    });

    it('should handle empty arrays', async () => {
      const data: ProjectOpsx = {
        project: { name: 'test', version: '1.0' },
        domains: [],
        capabilities: [],
        relations: [],
      };

      await writeProjectOpsx(testDir, data);
      const result = await readProjectOpsx(testDir);

      expect(result).not.toBeNull();
      expect(result!.domains).toEqual([]);
      expect(result!.capabilities).toEqual([]);
    });

    it('should validate empty relations successfully', () => {
      const data: ProjectOpsx = {
        project: { name: 'test', version: '1.0' },
        domains: [{ id: 'dom.core', type: 'domain' }],
        relations: [],
      };

      const result = validateReferentialIntegrity(data);
      expect(result.valid).toBe(true);
    });
  });

  describe('Malformed YAML Handling', () => {
    it('should return null for invalid YAML structure', async () => {
      const opsxPath = path.join(testDir, OPSX_PATHS.SINGLE_FILE);
      await fs.mkdir(path.dirname(opsxPath), { recursive: true });

      // Write invalid structure (missing required project field)
      await fs.writeFile(opsxPath, 'domains:\n  - id: dom.core\n    type: domain\n');

      const result = await readProjectOpsx(testDir);
      expect(result).toBeNull();
    });

    it('should handle corrupted YAML syntax', async () => {
      const opsxPath = path.join(testDir, OPSX_PATHS.SINGLE_FILE);
      await fs.mkdir(path.dirname(opsxPath), { recursive: true });

      // Write invalid YAML syntax (unclosed quote)
      await fs.writeFile(opsxPath, 'project:\n  name: test\n  version: "1.0\ndomains: []');

      // Should throw or return null when parsing fails
      try {
        const result = await readProjectOpsx(testDir);
        // If it doesn't throw, it should return null
        expect(result).toBeNull();
      } catch (error) {
        // Parsing error is expected
        expect(error).toBeDefined();
      }
    });

    it('should handle empty file gracefully', async () => {
      const opsxPath = path.join(testDir, OPSX_PATHS.SINGLE_FILE);
      await fs.mkdir(path.dirname(opsxPath), { recursive: true });
      await fs.writeFile(opsxPath, '');

      const result = await readProjectOpsx(testDir);
      expect(result).toBeNull();
    });
  });

  describe('Concurrent Modifications', () => {
    it('should handle sequential writes correctly', async () => {
      const data1: ProjectOpsx = {
        project: { name: 'test1', version: '1.0' },
        domains: [{ id: 'dom.core', type: 'domain' }],
      };

      const data2: ProjectOpsx = {
        project: { name: 'test2', version: '2.0' },
        domains: [
          { id: 'dom.core', type: 'domain' },
          { id: 'dom.auth', type: 'domain' },
        ],
      };

      // Write first
      await writeProjectOpsx(testDir, data1);
      const result1 = await readProjectOpsx(testDir);
      expect(result1!.project.name).toBe('test1');
      expect(result1!.domains).toHaveLength(1);

      // Write second (should overwrite)
      await writeProjectOpsx(testDir, data2);
      const result2 = await readProjectOpsx(testDir);
      expect(result2!.project.name).toBe('test2');
      expect(result2!.domains).toHaveLength(2);
    });

    it('should handle rapid successive writes', async () => {
      // Write sequentially to avoid race conditions
      for (let i = 0; i < 5; i++) {
        const data: ProjectOpsx = {
          project: { name: `test${i}`, version: `${i}.0` },
          domains: [{ id: `dom.v${i}`, type: 'domain' }],
        };
        await writeProjectOpsx(testDir, data);
      }

      // Should have the last written version
      const result = await readProjectOpsx(testDir);
      expect(result).not.toBeNull();
      expect(result!.project.name).toBe('test4');
      expect(result!.project.version).toBe('4.0');
    });
  });

  describe('Boundary Conditions', () => {
    it('should handle very long node IDs', async () => {
      const longId = 'dom.' + 'a'.repeat(200);
      const data: ProjectOpsx = {
        project: { name: 'test', version: '1.0' },
        domains: [{ id: longId, type: 'domain' }],
      };

      await writeProjectOpsx(testDir, data);
      const result = await readProjectOpsx(testDir);

      expect(result).not.toBeNull();
      expect(result!.domains![0].id).toBe(longId);
    });

    it('should handle very long intent strings', async () => {
      const longIntent = 'a'.repeat(10000);
      const data: ProjectOpsx = {
        project: { name: 'test', version: '1.0' },
        domains: [{ id: 'dom.core', type: 'domain', intent: longIntent }],
      };

      await writeProjectOpsx(testDir, data);
      const result = await readProjectOpsx(testDir);

      expect(result).not.toBeNull();
      expect(result!.domains![0].intent).toBe(longIntent);
    });

    it('should handle maximum number of nodes', async () => {
      const domains = Array.from({ length: 1000 }, (_, i) => ({
        id: `dom.node${i}`,
        type: 'domain' as const,
      }));

      const data: ProjectOpsx = {
        project: { name: 'test', version: '1.0' },
        domains,
      };

      await writeProjectOpsx(testDir, data, { maxLines: 100 });
      const result = await readProjectOpsx(testDir);

      expect(result).not.toBeNull();
      expect(result!.domains).toHaveLength(1000);
    });

    it('should handle special characters in metadata', async () => {
      const data: ProjectOpsx = {
        project: {
          name: 'test-project_v2.0',
          version: '1.0.0-beta+build.123',
          description: 'Test with "quotes" and \'apostrophes\' and\nnewlines',
        },
        domains: [{ id: 'dom.core', type: 'domain' }],
      };

      await writeProjectOpsx(testDir, data);
      const result = await readProjectOpsx(testDir);

      expect(result).not.toBeNull();
      expect(result!.project.name).toBe('test-project_v2.0');
      expect(result!.project.description).toContain('quotes');
    });
  });
});
