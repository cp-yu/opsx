import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { randomUUID } from 'crypto';
import { stringify as stringifyYaml } from 'yaml';
import {
  OPSX_SCHEMA_VERSION,
  readProjectOpsx,
  writeProjectOpsx,
  validateReferentialIntegrity,
  type ProjectOpsxBundle,
  type OpsxDelta,
} from '../../src/utils/opsx-utils.js';

describe('Integration: Full Workflow', () => {
  let testDir: string;
  let changeName: string;

  beforeEach(async () => {
    testDir = path.join(os.tmpdir(), `openspec-integration-${randomUUID()}`);
    changeName = 'add-auth-feature';
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  const mkBundle = (overrides: Partial<ProjectOpsxBundle> = {}): ProjectOpsxBundle => ({
    schema_version: OPSX_SCHEMA_VERSION,
    project: { id: 'test-project', name: 'test-project' },
    domains: [],
    capabilities: [],
    relations: [],
    code_map: [],
    ...overrides,
  });

  describe('Workflow: propose → sync → verify', () => {
    it('should complete full workflow successfully', async () => {
      // Step 1: PROPOSE
      const changeDir = path.join(testDir, 'openspec', 'changes', changeName);
      await fs.mkdir(changeDir, { recursive: true });

      await fs.writeFile(
        path.join(changeDir, 'proposal.md'),
        '# Add Auth Feature\n\nAdd authentication capabilities.',
      );

      const specsDir = path.join(changeDir, 'specs', 'auth');
      await fs.mkdir(specsDir, { recursive: true });
      await fs.writeFile(
        path.join(specsDir, 'spec.md'),
        '# Auth Spec\n\n## Capabilities\n- cap.auth.login\n- cap.auth.logout',
      );

      const delta: OpsxDelta = {
        schema_version: OPSX_SCHEMA_VERSION,
        ADDED: {
          domains: [
            { id: 'dom.auth', type: 'domain', intent: 'Authentication domain' },
          ],
          capabilities: [
            { id: 'cap.auth.login', type: 'capability', intent: 'User login' },
            { id: 'cap.auth.logout', type: 'capability', intent: 'User logout' },
          ],
          relations: [
            { from: 'cap.auth.login', to: 'dom.auth', type: 'contains' },
            { from: 'cap.auth.logout', to: 'dom.auth', type: 'contains' },
          ],
        },
      };

      const deltaPath = path.join(changeDir, 'opsx-delta.yaml');
      await fs.writeFile(deltaPath, stringifyYaml(delta));

      // Step 2: SYNC
      let bundle = await readProjectOpsx(testDir);
      if (!bundle) {
        bundle = mkBundle();
      }

      if (delta.ADDED) {
        if (delta.ADDED.domains) {
          bundle.domains = [...bundle.domains, ...delta.ADDED.domains];
        }
        if (delta.ADDED.capabilities) {
          bundle.capabilities = [...bundle.capabilities, ...delta.ADDED.capabilities];
        }
        if (delta.ADDED.relations) {
          bundle.relations = [...bundle.relations, ...delta.ADDED.relations];
        }
      }

      await writeProjectOpsx(testDir, bundle);

      // Step 3: VERIFY
      const merged = await readProjectOpsx(testDir);
      expect(merged).not.toBeNull();
      expect(merged!.domains).toHaveLength(1);
      expect(merged!.capabilities).toHaveLength(2);
      expect(merged!.relations).toHaveLength(2);

      const integrityResult = validateReferentialIntegrity(merged!);
      expect(integrityResult.valid).toBe(true);

      expect(merged!.domains.find(d => d.id === 'dom.auth')).toBeDefined();
      expect(merged!.capabilities.find(c => c.id === 'cap.auth.login')).toBeDefined();
      expect(merged!.capabilities.find(c => c.id === 'cap.auth.logout')).toBeDefined();

      const loginRel = merged!.relations.find(
        r => r.from === 'cap.auth.login' && r.to === 'dom.auth',
      );
      expect(loginRel).toBeDefined();
      expect(loginRel!.type).toBe('contains');
    });

    it('should handle MODIFIED nodes in delta', async () => {
      const initial = mkBundle({
        domains: [{ id: 'dom.auth', type: 'domain', intent: 'Old intent' }],
        capabilities: [{ id: 'cap.auth.login', type: 'capability', intent: 'Old login' }],
      });
      await writeProjectOpsx(testDir, initial);

      const changeDir = path.join(testDir, 'openspec', 'changes', changeName);
      await fs.mkdir(changeDir, { recursive: true });

      const delta: OpsxDelta = {
        schema_version: OPSX_SCHEMA_VERSION,
        MODIFIED: {
          domains: [
            { id: 'dom.auth', type: 'domain', intent: 'Updated authentication domain' },
          ],
          capabilities: [
            { id: 'cap.auth.login', type: 'capability', intent: 'Updated user login' },
          ],
        },
      };

      await fs.writeFile(path.join(changeDir, 'opsx-delta.yaml'), stringifyYaml(delta));

      let bundle = await readProjectOpsx(testDir);
      expect(bundle).not.toBeNull();

      if (delta.MODIFIED?.domains) {
        for (const mod of delta.MODIFIED.domains) {
          const idx = bundle!.domains.findIndex(d => d.id === mod.id);
          if (idx !== -1) bundle!.domains[idx] = mod;
        }
      }
      if (delta.MODIFIED?.capabilities) {
        for (const mod of delta.MODIFIED.capabilities) {
          const idx = bundle!.capabilities.findIndex(c => c.id === mod.id);
          if (idx !== -1) bundle!.capabilities[idx] = mod;
        }
      }

      await writeProjectOpsx(testDir, bundle!);

      const merged = await readProjectOpsx(testDir);
      expect(merged).not.toBeNull();
      expect(merged!.domains.find(d => d.id === 'dom.auth')!.intent).toBe('Updated authentication domain');
      expect(merged!.capabilities.find(c => c.id === 'cap.auth.login')!.intent).toBe('Updated user login');
    });

    it('should handle REMOVED nodes in delta', async () => {
      const initial = mkBundle({
        domains: [
          { id: 'dom.auth', type: 'domain' },
          { id: 'dom.core', type: 'domain' },
        ],
        capabilities: [
          { id: 'cap.auth.login', type: 'capability' },
          { id: 'cap.core.init', type: 'capability' },
        ],
      });
      await writeProjectOpsx(testDir, initial);

      const changeDir = path.join(testDir, 'openspec', 'changes', changeName);
      await fs.mkdir(changeDir, { recursive: true });

      const delta: OpsxDelta = {
        schema_version: OPSX_SCHEMA_VERSION,
        REMOVED: {
          domains: [{ id: 'dom.auth', type: 'domain' }],
          capabilities: [{ id: 'cap.auth.login', type: 'capability' }],
        },
      };

      await fs.writeFile(path.join(changeDir, 'opsx-delta.yaml'), stringifyYaml(delta));

      let bundle = await readProjectOpsx(testDir);
      expect(bundle).not.toBeNull();

      if (delta.REMOVED?.domains) {
        const ids = new Set(delta.REMOVED.domains.map(d => d.id));
        bundle!.domains = bundle!.domains.filter(d => !ids.has(d.id));
      }
      if (delta.REMOVED?.capabilities) {
        const ids = new Set(delta.REMOVED.capabilities.map(c => c.id));
        bundle!.capabilities = bundle!.capabilities.filter(c => !ids.has(c.id));
      }

      await writeProjectOpsx(testDir, bundle!);

      const merged = await readProjectOpsx(testDir);
      expect(merged).not.toBeNull();
      expect(merged!.domains).toHaveLength(1);
      expect(merged!.domains.find(d => d.id === 'dom.auth')).toBeUndefined();
      expect(merged!.domains.find(d => d.id === 'dom.core')).toBeDefined();
      expect(merged!.capabilities).toHaveLength(1);
      expect(merged!.capabilities.find(c => c.id === 'cap.auth.login')).toBeUndefined();
      expect(merged!.capabilities.find(c => c.id === 'cap.core.init')).toBeDefined();
    });
  });
});
