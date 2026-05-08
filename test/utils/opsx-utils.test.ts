import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { randomUUID } from 'crypto';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import {
  OPSX_PATHS,
  OPSX_SCHEMA_VERSION,
  ProjectOpsxFileSchema,
  OpsxDeltaSchema,
  validateReferentialIntegrity,
  validateCodeMapIntegrity,
  normalizeFromLegacy,
  applyOpsxDelta,
  readProjectOpsx,
  readProjectOpsxFile,
  readProjectOpsxRelations,
  readProjectOpsxCodeMap,
  writeProjectOpsx,
  readOpsxDelta,
  type ProjectOpsxBundle,
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

  const mkBundle = (overrides: Partial<ProjectOpsxBundle> = {}): ProjectOpsxBundle => ({
    schema_version: OPSX_SCHEMA_VERSION,
    project: { id: 'test', name: 'test' },
    domains: [],
    capabilities: [],
    relations: [],
    code_map: [],
    ...overrides,
  });

  describe('YAML parse/serialize', () => {
    it('should parse valid YAML with new schema', () => {
      const yaml = `
schema_version: 1
project:
  id: test
  name: test
domains:
  - id: dom.core
    type: domain
    intent: Core domain
`;
      const data = parseYaml(yaml);
      const result = ProjectOpsxFileSchema.safeParse(data);
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
      const result = ProjectOpsxFileSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should serialize to valid YAML', () => {
      const data = {
        schema_version: 1,
        project: { id: 'test', name: 'test' },
        domains: [
          { id: 'dom.core', type: 'domain' as const, intent: 'Core domain' },
        ],
      };
      const yaml = stringifyYaml(data);
      expect(yaml).toContain('domains:');
      expect(yaml).toContain('id: dom.core');
    });

    it('should round-trip parse and serialize', () => {
      const original = {
        schema_version: 1,
        project: { id: 'test', name: 'test' },
        domains: [
          { id: 'dom.core', type: 'domain' as const, intent: 'Core' },
        ],
        capabilities: [
          { id: 'cap.auth', type: 'capability' as const, intent: 'Auth' },
        ],
      };
      const yaml = stringifyYaml(original);
      const data = parseYaml(yaml);
      const result = ProjectOpsxFileSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.domains).toHaveLength(1);
        expect(result.data.capabilities).toHaveLength(1);
      }
    });
  });

  describe('referential integrity validation', () => {
    it('should pass with valid references', () => {
      const bundle = mkBundle({
        domains: [{ id: 'dom.core', type: 'domain' }],
        capabilities: [{ id: 'cap.auth', type: 'capability' }],
        relations: [{ from: 'cap.auth', to: 'dom.core', type: 'contains' }],
      });
      const result = validateReferentialIntegrity(bundle);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail with missing from reference', () => {
      const bundle = mkBundle({
        domains: [{ id: 'dom.core', type: 'domain' }],
        relations: [{ from: 'cap.missing', to: 'dom.core', type: 'contains' }],
      });
      const result = validateReferentialIntegrity(bundle);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('cap.missing');
    });

    it('should fail with missing to reference', () => {
      const bundle = mkBundle({
        capabilities: [{ id: 'cap.auth', type: 'capability' }],
        relations: [{ from: 'cap.auth', to: 'dom.missing', type: 'contains' }],
      });
      const result = validateReferentialIntegrity(bundle);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('dom.missing');
    });

    it('should handle empty relations', () => {
      const bundle = mkBundle({
        domains: [{ id: 'dom.core', type: 'domain' }],
      });
      const result = validateReferentialIntegrity(bundle);
      expect(result.valid).toBe(true);
    });
  });

  describe('code-map integrity validation', () => {
    it('should pass with valid code_map references', () => {
      const bundle = mkBundle({
        capabilities: [{ id: 'cap.auth', type: 'capability' }],
        code_map: [{ id: 'cap.auth', refs: [{ path: 'src/auth.ts' }] }],
      });
      const result = validateCodeMapIntegrity(bundle);
      expect(result.valid).toBe(true);
    });

    it('should fail with dangling code_map reference', () => {
      const bundle = mkBundle({
        code_map: [{ id: 'cap.missing', refs: [{ path: 'src/missing.ts' }] }],
      });
      const result = validateCodeMapIntegrity(bundle);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('cap.missing');
    });
  });

  describe('legacy normalization', () => {
    it('should convert implemented status to active', () => {
      const legacy = {
        project: { id: 'test', name: 'test' },
        domains: [{ id: 'dom.core', type: 'domain', status: 'implemented' }],
        capabilities: [{ id: 'cap.auth', type: 'capability', status: 'implemented' }],
      };
      const bundle = normalizeFromLegacy(legacy);
      expect(bundle.schema_version).toBe(OPSX_SCHEMA_VERSION);
      expect(bundle.domains[0].status).toBe('active');
      expect(bundle.capabilities[0].status).toBe('active');
    });

    it('should extract code_refs into code_map', () => {
      const legacy = {
        project: { id: 'test', name: 'test' },
        capabilities: [{
          id: 'cap.auth',
          type: 'capability',
          code_refs: [{ path: 'src/auth.ts', line_start: 10, line_end: 50 }],
        }],
      };
      const bundle = normalizeFromLegacy(legacy);
      expect(bundle.code_map).toHaveLength(1);
      expect(bundle.code_map[0].id).toBe('cap.auth');
      expect(bundle.code_map[0].refs[0].path).toBe('src/auth.ts');
    });

    it('should strip spec_refs from nodes', () => {
      const legacy = {
        project: { id: 'test', name: 'test' },
        domains: [{
          id: 'dom.core',
          type: 'domain',
          spec_refs: [{ path: 'docs/spec.md' }],
        }],
      };
      const bundle = normalizeFromLegacy(legacy);
      expect((bundle.domains[0] as any).spec_refs).toBeUndefined();
    });
  });

  describe('readProjectOpsx', () => {
    it('should read three-file bundle', async () => {
      const bundle = mkBundle({
        domains: [{ id: 'dom.core', type: 'domain' }],
        relations: [{ from: 'dom.core', to: 'dom.core', type: 'relates_to' }],
        code_map: [{ id: 'dom.core', refs: [{ path: 'src/core/' }] }],
      });
      await writeProjectOpsx(testDir, bundle);

      const result = await readProjectOpsx(testDir);
      expect(result).not.toBeNull();
      expect(result!.domains).toHaveLength(1);
      expect(result!.relations).toHaveLength(1);
      expect(result!.code_map).toHaveLength(1);
    });

    it('should return null if file does not exist', async () => {
      const result = await readProjectOpsx(testDir);
      expect(result).toBeNull();
    });

    it('should handle legacy format via normalizer', async () => {
      const legacyData = {
        project: { id: 'test', name: 'test' },
        domains: [{ id: 'dom.core', type: 'domain', status: 'implemented' }],
      };
      const opsxDir = path.join(testDir, 'openspec');
      await fs.mkdir(opsxDir, { recursive: true });
      await fs.writeFile(
        path.join(testDir, OPSX_PATHS.PROJECT_FILE),
        stringifyYaml(legacyData),
      );

      const result = await readProjectOpsx(testDir);
      expect(result).not.toBeNull();
      expect(result!.schema_version).toBe(OPSX_SCHEMA_VERSION);
      expect(result!.domains[0].status).toBe('active');
    });

    it('should return empty arrays for missing companion files', async () => {
      const mainData = {
        schema_version: 1,
        project: { id: 'test', name: 'test' },
        domains: [{ id: 'dom.core', type: 'domain' }],
      };
      const opsxDir = path.join(testDir, 'openspec');
      await fs.mkdir(opsxDir, { recursive: true });
      await fs.writeFile(
        path.join(testDir, OPSX_PATHS.PROJECT_FILE),
        stringifyYaml(mainData),
      );

      const result = await readProjectOpsx(testDir);
      expect(result).not.toBeNull();
      expect(result!.relations).toEqual([]);
      expect(result!.code_map).toEqual([]);
    });
  });

  describe('writeProjectOpsx', () => {
    it('should write three files', async () => {
      const bundle = mkBundle({
        domains: [{ id: 'dom.core', type: 'domain' }],
      });
      await writeProjectOpsx(testDir, bundle);

      const mainExists = await fs.access(path.join(testDir, OPSX_PATHS.PROJECT_FILE)).then(() => true).catch(() => false);
      const relExists = await fs.access(path.join(testDir, OPSX_PATHS.RELATIONS_FILE)).then(() => true).catch(() => false);
      const mapExists = await fs.access(path.join(testDir, OPSX_PATHS.CODE_MAP_FILE)).then(() => true).catch(() => false);
      expect(mainExists).toBe(true);
      expect(relExists).toBe(true);
      expect(mapExists).toBe(true);
    });

    it('should use atomic write pattern (no tmp files remain)', async () => {
      const bundle = mkBundle({
        domains: [{ id: 'dom.core', type: 'domain' }],
      });
      await writeProjectOpsx(testDir, bundle);

      const opsxDir = path.join(testDir, 'openspec');
      const files = await fs.readdir(opsxDir);
      const hasTmpFile = files.some(f => f.includes('.tmp'));
      expect(hasTmpFile).toBe(false);
    });
  });

  describe('applyOpsxDelta', () => {
    it('should not report unchanged MODIFIED nodes as changed', () => {
      const capability = {
        id: 'cap.verify.gate',
        type: 'capability' as const,
        intent: 'Verify gate',
        status: 'active' as const,
      };
      const relation = { from: 'cap.verify.gate', to: 'dom.verify', type: 'contains' };
      const bundle = mkBundle({
        domains: [{ id: 'dom.verify', type: 'domain', intent: 'Verify domain' }],
        capabilities: [capability],
        relations: [relation],
      });

      const result = applyOpsxDelta(bundle, {
        schema_version: OPSX_SCHEMA_VERSION,
        MODIFIED: {
          capabilities: [{ status: 'active', intent: 'Verify gate', type: 'capability', id: 'cap.verify.gate' }],
          relations: [{ type: 'contains', to: 'dom.verify', from: 'cap.verify.gate' }],
        },
      });

      expect(result.changed).toBe(false);
      expect(result.counts.modified).toEqual({ domains: 0, capabilities: 0, relations: 0 });
    });

    it('should shallow merge MODIFIED capability (only intent)', () => {
      const bundle = mkBundle({
        capabilities: [{ id: 'cap.cli.init', type: 'capability', intent: '原始描述', status: 'active' as const, domain: 'dom.cli' }],
      });

      const result = applyOpsxDelta(bundle, {
        MODIFIED: { capabilities: [{ id: 'cap.cli.init', intent: '修改后的描述' }] },
      });

      expect(result.changed).toBe(true);
      expect(result.counts.modified.capabilities).toBe(1);
      expect(result.bundle.capabilities[0].intent).toBe('修改后的描述');
      expect(result.bundle.capabilities[0].type).toBe('capability');
      expect(result.bundle.capabilities[0].status).toBe('active');
      expect(result.bundle.capabilities[0].domain).toBe('dom.cli');
    });

    it('should shallow merge MODIFIED domain (only boundary)', () => {
      const bundle = mkBundle({
        domains: [{ id: 'dom.cli', type: 'domain', intent: 'CLI domain', boundary: 'old boundary' }],
      });

      const result = applyOpsxDelta(bundle, {
        MODIFIED: { domains: [{ id: 'dom.cli', boundary: 'new boundary' }] },
      });

      expect(result.changed).toBe(true);
      expect(result.bundle.domains[0].boundary).toBe('new boundary');
      expect(result.bundle.domains[0].type).toBe('domain');
      expect(result.bundle.domains[0].intent).toBe('CLI domain');
    });

    it('should shallow merge MODIFIED capability (multiple fields)', () => {
      const bundle = mkBundle({
        capabilities: [{ id: 'cap.x', type: 'capability', intent: 'old', status: 'draft' as const }],
      });

      const result = applyOpsxDelta(bundle, {
        MODIFIED: { capabilities: [{ id: 'cap.x', intent: 'new', status: 'active' as const }] },
      });

      expect(result.changed).toBe(true);
      expect(result.bundle.capabilities[0].intent).toBe('new');
      expect(result.bundle.capabilities[0].status).toBe('active');
      expect(result.bundle.capabilities[0].type).toBe('capability');
    });

    it('should throw on MODIFIED non-existent node', () => {
      const bundle = mkBundle({ capabilities: [] });

      expect(() => applyOpsxDelta(bundle, {
        MODIFIED: { capabilities: [{ id: 'cap.nonexistent', intent: 'x' }] },
      })).toThrow("OPSX MODIFIED failed for capability 'cap.nonexistent' - not found");
    });

    it('should shallow merge MODIFIED relation (preserve from/to/type)', () => {
      const bundle = mkBundle({
        domains: [{ id: 'dom.x', type: 'domain' }],
        capabilities: [{ id: 'cap.y', type: 'capability' }],
        relations: [{ from: 'cap.y', to: 'dom.x', type: 'contains', metadata: { key: 'old' } }],
      });

      const result = applyOpsxDelta(bundle, {
        MODIFIED: { relations: [{ from: 'cap.y', to: 'dom.x', type: 'contains', metadata: { key: 'new' } }] },
      });

      expect(result.changed).toBe(true);
      expect(result.bundle.relations[0].metadata).toEqual({ key: 'new' });
    });
  });

  describe('OpsxDeltaSchema validation', () => {
    it('should pass MODIFIED without type field', () => {
      const data = parseYaml(`
        MODIFIED:
          capabilities:
            - id: cap.xxx
              intent: some intent
      `);
      const result = OpsxDeltaSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should fail MODIFIED without id field', () => {
      const data = parseYaml(`
        MODIFIED:
          capabilities:
            - intent: missing id
      `);
      const result = OpsxDeltaSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should pass REMOVED with only id field', () => {
      const data = parseYaml(`
        REMOVED:
          capabilities:
            - id: cap.xxx
      `);
      const result = OpsxDeltaSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should fail ADDED without type field', () => {
      const data = parseYaml(`
        ADDED:
          capabilities:
            - id: cap.xxx
              intent: missing type
      `);
      const result = OpsxDeltaSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should pass ADDED with complete fields', () => {
      const data = parseYaml(`
        ADDED:
          capabilities:
            - id: cap.xxx
              type: capability
              intent: complete node
      `);
      const result = OpsxDeltaSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });

  describe('readOpsxDelta error messages', () => {
    it('should produce diagnostic message when ADDED capability has no type', async () => {
      const changeDir = path.join(testDir, 'openspec', 'changes', 'test-change');
      await fs.mkdir(changeDir, { recursive: true });
      await fs.writeFile(path.join(changeDir, 'opsx-delta.yaml'), stringifyYaml({
        ADDED: { capabilities: [{ id: 'cap.xxx', intent: 'no type' }] },
      }));

      await expect(readOpsxDelta(testDir, 'test-change')).rejects.toThrow('field is missing');
    });

    it('should include section/index/path info in error output', async () => {
      const changeDir = path.join(testDir, 'openspec', 'changes', 'test-change2');
      await fs.mkdir(changeDir, { recursive: true });
      await fs.writeFile(path.join(changeDir, 'opsx-delta.yaml'), stringifyYaml({
        ADDED: { capabilities: [{ id: 'cap.xxx', intent: 'no type' }] },
      }));

      await expect(readOpsxDelta(testDir, 'test-change2')).rejects.toThrow('ADDED');
    });
  });

  describe('path constants', () => {
    it('should have correct project file path', () => {
      expect(OPSX_PATHS.PROJECT_FILE).toBe('openspec/project.opsx.yaml');
    });

    it('should have correct relations file path', () => {
      expect(OPSX_PATHS.RELATIONS_FILE).toBe('openspec/project.opsx.relations.yaml');
    });

    it('should have correct code-map file path', () => {
      expect(OPSX_PATHS.CODE_MAP_FILE).toBe('openspec/project.opsx.code-map.yaml');
    });

    it('should generate correct delta path', () => {
      const deltaPath = OPSX_PATHS.deltaPath('my-change');
      expect(deltaPath).toBe('openspec/changes/my-change/opsx-delta.yaml');
    });
  });
});
