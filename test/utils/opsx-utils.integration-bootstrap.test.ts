import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { randomUUID } from 'crypto';
import {
  OPSX_SCHEMA_VERSION,
  readProjectOpsx,
  writeProjectOpsx,
  validateReferentialIntegrity,
  validateCodeMapIntegrity,
  type ProjectOpsxBundle,
} from '../../src/utils/opsx-utils.js';

describe('Integration: Bootstrap Workflow', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = path.join(os.tmpdir(), `openspec-bootstrap-${randomUUID()}`);
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  const mkBundle = (overrides: Partial<ProjectOpsxBundle> = {}): ProjectOpsxBundle => ({
    schema_version: OPSX_SCHEMA_VERSION,
    project: { id: 'my-project', name: 'my-project' },
    domains: [],
    capabilities: [],
    relations: [],
    code_map: [],
    ...overrides,
  });

  describe('Bootstrap: Create initial OPSX structure', () => {
    it('should create minimal valid project.opsx.yaml', async () => {
      const bundle = mkBundle();
      await writeProjectOpsx(testDir, bundle);

      const result = await readProjectOpsx(testDir);
      expect(result).not.toBeNull();
      expect(result!.project.name).toBe('my-project');
      expect(result!.project.id).toBe('my-project');
    });

    it('should create OPSX with discovered domains', async () => {
      const bundle = mkBundle({
        domains: [
          { id: 'dom.core', type: 'domain', intent: 'Core domain' },
          { id: 'dom.auth', type: 'domain', intent: 'Authentication domain' },
          { id: 'dom.api', type: 'domain', intent: 'API domain' },
        ],
      });

      await writeProjectOpsx(testDir, bundle);

      const result = await readProjectOpsx(testDir);
      expect(result).not.toBeNull();
      expect(result!.domains).toHaveLength(3);
      expect(result!.domains.map(d => d.id)).toContain('dom.core');
      expect(result!.domains.map(d => d.id)).toContain('dom.auth');
      expect(result!.domains.map(d => d.id)).toContain('dom.api');
    });

    it('should create OPSX with discovered capabilities', async () => {
      const caps = [
        { id: 'cap.user.create', type: 'capability' as const, intent: 'Create user' },
        { id: 'cap.user.read', type: 'capability' as const, intent: 'Read user' },
        { id: 'cap.user.update', type: 'capability' as const, intent: 'Update user' },
        { id: 'cap.user.delete', type: 'capability' as const, intent: 'Delete user' },
      ];

      const bundle = mkBundle({
        domains: [{ id: 'dom.user', type: 'domain', intent: 'User management' }],
        capabilities: caps,
        relations: caps.map(cap => ({
          from: cap.id,
          to: 'dom.user',
          type: 'contains' as const,
        })),
      });

      await writeProjectOpsx(testDir, bundle);

      const result = await readProjectOpsx(testDir);
      expect(result).not.toBeNull();
      expect(result!.capabilities).toHaveLength(4);
      expect(result!.relations).toHaveLength(4);

      const integrityResult = validateReferentialIntegrity(result!);
      expect(integrityResult.valid).toBe(true);
    });

    it('should handle bootstrap with code_map entries', async () => {
      const bundle = mkBundle({
        domains: [{ id: 'dom.auth', type: 'domain', intent: 'Authentication' }],
        capabilities: [{ id: 'cap.auth.login', type: 'capability', intent: 'User login' }],
        code_map: [
          { id: 'dom.auth', refs: [{ path: 'src/auth/index.ts', line_start: 1 }, { path: 'src/auth/login.ts', line_start: 10 }] },
          { id: 'cap.auth.login', refs: [{ path: 'src/auth/login.ts', line_start: 15, line_end: 45 }] },
        ],
      });

      await writeProjectOpsx(testDir, bundle);

      const result = await readProjectOpsx(testDir);
      expect(result).not.toBeNull();
      expect(result!.code_map).toHaveLength(2);
      expect(result!.code_map.find(e => e.id === 'cap.auth.login')!.refs[0].path).toBe('src/auth/login.ts');

      const mapResult = validateCodeMapIntegrity(result!);
      expect(mapResult.valid).toBe(true);
    });

    it('should create valid structure for incremental bootstrap', async () => {
      // Phase 1: Minimal
      const phase1 = mkBundle({
        domains: [{ id: 'dom.core', type: 'domain' }],
      });
      await writeProjectOpsx(testDir, phase1);

      // Phase 2: Add capabilities
      const phase2 = await readProjectOpsx(testDir);
      expect(phase2).not.toBeNull();

      phase2!.capabilities = [
        { id: 'cap.core.init', type: 'capability', intent: 'Initialize system' },
      ];
      phase2!.relations = [
        { from: 'cap.core.init', to: 'dom.core', type: 'contains' },
      ];

      await writeProjectOpsx(testDir, phase2!);

      const final = await readProjectOpsx(testDir);
      expect(final).not.toBeNull();
      expect(final!.domains).toHaveLength(1);
      expect(final!.capabilities).toHaveLength(1);
      expect(final!.relations).toHaveLength(1);

      const integrityResult = validateReferentialIntegrity(final!);
      expect(integrityResult.valid).toBe(true);
    });
  });

  describe('Regression: Real repo file', () => {
    it('should read actual openspec/project.opsx.yaml from repo', async () => {
      const repoRoot = path.resolve(__dirname, '..', '..');
      const result = await readProjectOpsx(repoRoot);
      expect(result).not.toBeNull();
      expect(result!.project).toBeDefined();
      expect(result!.domains.length).toBeGreaterThan(0);
    });
  });

  describe('Bootstrap: Error handling', () => {
    it('should reject bootstrap with invalid node IDs', async () => {
      const bundle = mkBundle({
        domains: [{ id: 'invalid-id', type: 'domain' } as any],
      });

      await writeProjectOpsx(testDir, bundle);

      const result = await readProjectOpsx(testDir);
      expect(result).toBeNull();
    });

    it('should handle bootstrap with duplicate IDs', async () => {
      const bundle = mkBundle({
        domains: [
          { id: 'dom.core', type: 'domain' },
          { id: 'dom.core', type: 'domain' },
        ],
      });

      await writeProjectOpsx(testDir, bundle);

      const result = await readProjectOpsx(testDir);
      expect(result).not.toBeNull();
    });
  });
});
