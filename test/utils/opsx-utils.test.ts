import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { randomUUID } from 'crypto';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import {
  OPSX_PATHS,
  OPSX_CONFIG,
  ProjectOpsxSchema,
  validateReferentialIntegrity,
  validateSpecRefs,
  readProjectOpsx,
  writeProjectOpsx,
  type ProjectOpsx,
} from '../../src/utils/opsx-utils.js';

describe('opsx-utils', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = path.join(os.tmpdir(), `openspec-opsx-test-${randomUUID()}`);
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('YAML parse/serialize', () => {
    it('should parse valid YAML', () => {
      const yaml = `
project:
  name: test
  version: "1.0"
domains:
  - id: dom.core
    type: domain
    intent: Core domain
`;
      const data = parseYaml(yaml);
      const result = ProjectOpsxSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.domains).toHaveLength(1);
        expect(result.data.domains![0].id).toBe('dom.core');
      }
    });

    it('should reject invalid YAML structure', () => {
      const yaml = `
domains:
  - id: invalid-id
    type: domain
`;
      const data = parseYaml(yaml);
      const result = ProjectOpsxSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should serialize to valid YAML', () => {
      const data: ProjectOpsx = {
        project: { name: 'test', version: '1.0' },
        domains: [
          { id: 'dom.core', type: 'domain', intent: 'Core domain' },
        ],
      };
      const yaml = stringifyYaml(data);
      expect(yaml).toContain('domains:');
      expect(yaml).toContain('id: dom.core');
    });

    it('should round-trip parse and serialize', () => {
      const original: ProjectOpsx = {
        project: { name: 'test', version: '1.0' },
        domains: [
          { id: 'dom.core', type: 'domain', intent: 'Core' },
        ],
        capabilities: [
          { id: 'cap.auth', type: 'capability', intent: 'Auth' },
        ],
      };
      const yaml = stringifyYaml(original);
      const data = parseYaml(yaml);
      const result = ProjectOpsxSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.domains).toHaveLength(1);
        expect(result.data.capabilities).toHaveLength(1);
      }
    });
  });

  describe('referential integrity validation', () => {
    it('should pass with valid references', () => {
      const data: ProjectOpsx = {
        project: { name: 'test', version: '1.0' },
        domains: [
          { id: 'dom.core', type: 'domain' },
        ],
        capabilities: [
          { id: 'cap.auth', type: 'capability' },
        ],
        relations: [
          { from: 'cap.auth', to: 'dom.core', type: 'belongs_to' },
        ],
      };
      const result = validateReferentialIntegrity(data);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail with missing from reference', () => {
      const data: ProjectOpsx = {
        project: { name: 'test', version: '1.0' },
        domains: [
          { id: 'dom.core', type: 'domain' },
        ],
        relations: [
          { from: 'cap.missing', to: 'dom.core', type: 'belongs_to' },
        ],
      };
      const result = validateReferentialIntegrity(data);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('cap.missing');
    });

    it('should fail with missing to reference', () => {
      const data: ProjectOpsx = {
        project: { name: 'test', version: '1.0' },
        capabilities: [
          { id: 'cap.auth', type: 'capability' },
        ],
        relations: [
          { from: 'cap.auth', to: 'dom.missing', type: 'belongs_to' },
        ],
      };
      const result = validateReferentialIntegrity(data);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('dom.missing');
    });

    it('should handle empty relations', () => {
      const data: ProjectOpsx = {
        project: { name: 'test', version: '1.0' },
        domains: [
          { id: 'dom.core', type: 'domain' },
        ],
      };
      const result = validateReferentialIntegrity(data);
      expect(result.valid).toBe(true);
    });
  });

  describe('spec_refs validation', () => {
    it('should pass with existing spec files', async () => {
      const specPath = path.join(testDir, 'spec.md');
      await fs.writeFile(specPath, '# Spec');

      const data: ProjectOpsx = {
        project: { name: 'test', version: '1.0' },
        domains: [
          {
            id: 'dom.core',
            type: 'domain',
            spec_refs: [{ path: 'spec.md' }],
          },
        ],
      };
      const result = await validateSpecRefs(testDir, data);
      expect(result.valid).toBe(true);
    });

    it('should fail with non-existent spec files', async () => {
      const data: ProjectOpsx = {
        project: { name: 'test', version: '1.0' },
        domains: [
          {
            id: 'dom.core',
            type: 'domain',
            spec_refs: [{ path: 'missing.md' }],
          },
        ],
      };
      const result = await validateSpecRefs(testDir, data);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('missing.md');
    });

    it('should handle nodes without spec_refs', async () => {
      const data: ProjectOpsx = {
        project: { name: 'test', version: '1.0' },
        domains: [
          { id: 'dom.core', type: 'domain' },
        ],
      };
      const result = await validateSpecRefs(testDir, data);
      expect(result.valid).toBe(true);
    });
  });

  describe('readProjectOpsx', () => {
    it('should read single file', async () => {
      const opsxPath = path.join(testDir, OPSX_PATHS.SINGLE_FILE);
      await fs.mkdir(path.dirname(opsxPath), { recursive: true });
      const data: ProjectOpsx = {
        project: { name: 'test', version: '1.0' },
        domains: [{ id: 'dom.core', type: 'domain' }],
      };
      await fs.writeFile(opsxPath, stringifyYaml(data));

      const result = await readProjectOpsx(testDir);
      expect(result).not.toBeNull();
      expect(result?.domains).toHaveLength(1);
    });

    it('should return null if file does not exist', async () => {
      const result = await readProjectOpsx(testDir);
      expect(result).toBeNull();
    });

    it('should handle sharded files', async () => {
      const shardedDir = path.join(testDir, OPSX_PATHS.SHARDED_DIR);
      await fs.mkdir(shardedDir, { recursive: true });

      const meta = {
        project: { name: 'test' },
        shard_manifest: ['dom.core.yaml'],
      };
      await fs.writeFile(
        path.join(shardedDir, '_meta.yaml'),
        stringifyYaml(meta)
      );

      const shard: ProjectOpsx = {
        domains: [{ id: 'dom.core', type: 'domain' }],
      };
      await fs.writeFile(
        path.join(shardedDir, 'dom.core.yaml'),
        stringifyYaml(shard)
      );

      const result = await readProjectOpsx(testDir);
      expect(result).not.toBeNull();
      expect(result?.domains).toHaveLength(1);
    });
  });

  describe('writeProjectOpsx', () => {
    it('should write single file when under threshold', async () => {
      const data: ProjectOpsx = {
        project: { name: 'test', version: '1.0' },
        domains: [{ id: 'dom.core', type: 'domain' }],
      };

      await writeProjectOpsx(testDir, data);

      const opsxPath = path.join(testDir, OPSX_PATHS.SINGLE_FILE);
      const exists = await fs.access(opsxPath).then(() => true).catch(() => false);
      expect(exists).toBe(true);

      const content = await fs.readFile(opsxPath, 'utf-8');
      expect(content).toContain('dom.core');
    });

    it('should use atomic write pattern', async () => {
      const data: ProjectOpsx = {
        project: { name: 'test', version: '1.0' },
        domains: [{ id: 'dom.core', type: 'domain' }],
      };

      await writeProjectOpsx(testDir, data);

      const opsxPath = path.join(testDir, OPSX_PATHS.SINGLE_FILE);
      const tempFiles = await fs.readdir(path.dirname(opsxPath));
      const hasTempFile = tempFiles.some(f => f.includes('.tmp'));
      expect(hasTempFile).toBe(false);
    });

    it('should create shards when exceeding threshold', async () => {
      const largeDomains = Array.from({ length: 50 }, (_, i) => ({
        id: `dom.domain${i}`,
        type: 'domain' as const,
        intent: `Domain ${i} with some description to increase line count`,
      }));

      const data: ProjectOpsx = {
        project: { name: 'test', version: '1.0' },
        domains: largeDomains,
      };

      await writeProjectOpsx(testDir, data, { maxLines: 100 });

      const shardedDir = path.join(testDir, OPSX_PATHS.SHARDED_DIR);
      const exists = await fs.access(shardedDir).then(() => true).catch(() => false);
      expect(exists).toBe(true);
    });
  });

  describe('path constants', () => {
    it('should have correct single file path', () => {
      expect(OPSX_PATHS.SINGLE_FILE).toBe('openspec/project.opsx.yaml');
    });

    it('should have correct sharded dir path', () => {
      expect(OPSX_PATHS.SHARDED_DIR).toBe('openspec/project.opsx');
    });

    it('should generate correct delta path', () => {
      const deltaPath = OPSX_PATHS.deltaPath('my-change');
      expect(deltaPath).toBe('openspec/changes/my-change/opsx-delta.yaml');
    });
  });

  describe('config constants', () => {
    it('should have default max lines', () => {
      expect(OPSX_CONFIG.MAX_LINES).toBe(1000);
    });
  });
});
