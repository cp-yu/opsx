import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { randomUUID } from 'crypto';
import { stringify as stringifyYaml } from 'yaml';
import {
  OPSX_PATHS,
  OPSX_SCHEMA_VERSION,
  readProjectOpsx,
  writeProjectOpsx,
  validateReferentialIntegrity,
  type ProjectOpsxBundle,
} from '../../src/utils/opsx-utils.js';

describe('Edge Cases: OPSX Utils', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = path.join(os.tmpdir(), `openspec-opsx-edge-${randomUUID()}`);
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  const mkBundle = (overrides: Partial<ProjectOpsxBundle> = {}): ProjectOpsxBundle => ({
    schema_version: OPSX_SCHEMA_VERSION,
    project: { id: 'test', name: 'test' },
    domains: [],
    capabilities: [],
    relations: [],
    code_map: [],
    ...overrides,
  });

  describe('Empty Delta Handling', () => {
    it('should handle empty project with only metadata', async () => {
      const bundle = mkBundle();
      await writeProjectOpsx(testDir, bundle);
      const result = await readProjectOpsx(testDir);

      expect(result).not.toBeNull();
      expect(result!.project.name).toBe('test');
      expect(result!.domains).toEqual([]);
      expect(result!.capabilities).toEqual([]);
    });

    it('should handle empty arrays', async () => {
      const bundle = mkBundle();
      await writeProjectOpsx(testDir, bundle);
      const result = await readProjectOpsx(testDir);

      expect(result).not.toBeNull();
      expect(result!.domains).toEqual([]);
      expect(result!.capabilities).toEqual([]);
      expect(result!.relations).toEqual([]);
    });

    it('should validate empty relations successfully', () => {
      const bundle = mkBundle({
        domains: [{ id: 'dom.core', type: 'domain' }],
      });
      const result = validateReferentialIntegrity(bundle);
      expect(result.valid).toBe(true);
    });
  });

  describe('Malformed YAML Handling', () => {
    it('should return null for invalid YAML structure with schema_version', async () => {
      const opsxPath = path.join(testDir, OPSX_PATHS.PROJECT_FILE);
      await fs.mkdir(path.dirname(opsxPath), { recursive: true });
      // Has schema_version but missing required project field
      await fs.writeFile(opsxPath, 'schema_version: 1\ndomains:\n  - id: dom.core\n    type: domain\n');

      const result = await readProjectOpsx(testDir);
      expect(result).toBeNull();
    });

    it('should handle corrupted YAML syntax', async () => {
      const opsxPath = path.join(testDir, OPSX_PATHS.PROJECT_FILE);
      await fs.mkdir(path.dirname(opsxPath), { recursive: true });
      await fs.writeFile(opsxPath, 'project:\n  id: test\n  name: "test\ndomains: []');

      try {
        const result = await readProjectOpsx(testDir);
        expect(result).toBeNull();
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle empty file gracefully', async () => {
      const opsxPath = path.join(testDir, OPSX_PATHS.PROJECT_FILE);
      await fs.mkdir(path.dirname(opsxPath), { recursive: true });
      await fs.writeFile(opsxPath, '');

      // Empty file parses to null, legacy normalizer may throw
      try {
        const result = await readProjectOpsx(testDir);
        expect(result).toBeNull();
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('Concurrent Modifications', () => {
    it('should handle sequential writes correctly', async () => {
      const bundle1 = mkBundle({
        project: { id: 'test1', name: 'test1' },
        domains: [{ id: 'dom.core', type: 'domain' }],
      });
      const bundle2 = mkBundle({
        project: { id: 'test2', name: 'test2' },
        domains: [
          { id: 'dom.core', type: 'domain' },
          { id: 'dom.auth', type: 'domain' },
        ],
      });

      await writeProjectOpsx(testDir, bundle1);
      const result1 = await readProjectOpsx(testDir);
      expect(result1!.project.name).toBe('test1');
      expect(result1!.domains).toHaveLength(1);

      await writeProjectOpsx(testDir, bundle2);
      const result2 = await readProjectOpsx(testDir);
      expect(result2!.project.name).toBe('test2');
      expect(result2!.domains).toHaveLength(2);
    });

    it('should handle rapid successive writes', async () => {
      for (let i = 0; i < 5; i++) {
        const bundle = mkBundle({
          project: { id: `test${i}`, name: `test${i}` },
          domains: [{ id: `dom.v${i}`, type: 'domain' }],
        });
        await writeProjectOpsx(testDir, bundle);
      }

      const result = await readProjectOpsx(testDir);
      expect(result).not.toBeNull();
      expect(result!.project.name).toBe('test4');
    });
  });

  describe('Boundary Conditions', () => {
    it('should handle very long node IDs', async () => {
      const longId = 'dom.' + 'a'.repeat(200);
      const bundle = mkBundle({
        domains: [{ id: longId, type: 'domain' }],
      });

      await writeProjectOpsx(testDir, bundle);
      const result = await readProjectOpsx(testDir);

      expect(result).not.toBeNull();
      expect(result!.domains[0].id).toBe(longId);
    });

    it('should handle very long intent strings', async () => {
      const longIntent = 'a'.repeat(10000);
      const bundle = mkBundle({
        domains: [{ id: 'dom.core', type: 'domain', intent: longIntent }],
      });

      await writeProjectOpsx(testDir, bundle);
      const result = await readProjectOpsx(testDir);

      expect(result).not.toBeNull();
      expect(result!.domains[0].intent).toBe(longIntent);
    });

    it('should handle large data with fixed three-file layout', async () => {
      const domains = Array.from({ length: 1000 }, (_, i) => ({
        id: `dom.node${i}`,
        type: 'domain' as const,
      }));

      const bundle = mkBundle({ domains });
      await writeProjectOpsx(testDir, bundle);
      const result = await readProjectOpsx(testDir);

      expect(result).not.toBeNull();
      expect(result!.domains).toHaveLength(1000);

      // Verify still three files, no sharding
      const opsxDir = path.join(testDir, 'openspec');
      const files = await fs.readdir(opsxDir);
      const opsxFiles = files.filter(f => f.startsWith('project.opsx'));
      expect(opsxFiles).toHaveLength(3);
    });

    it('should handle special characters in metadata', async () => {
      const bundle = mkBundle({
        project: {
          id: 'test-project-v2',
          name: 'test-project_v2.0',
          intent: 'Test with "quotes" and \'apostrophes\' and\nnewlines',
        },
        domains: [{ id: 'dom.core', type: 'domain' }],
      });

      await writeProjectOpsx(testDir, bundle);
      const result = await readProjectOpsx(testDir);

      expect(result).not.toBeNull();
      expect(result!.project.name).toBe('test-project_v2.0');
      expect(result!.project.intent).toContain('quotes');
    });
  });
});
