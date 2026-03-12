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
  validateSpecRefs,
  type ProjectOpsx,
  type OpsxDelta,
} from '../../src/utils/opsx-utils.js';

/**
 * Integration Tests for Full Workflow
 *
 * Tests the complete workflow: propose → sync → verify → apply
 * These tests simulate the core functions used by CLI commands.
 */

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

  describe('Workflow: propose → sync → verify', () => {
    it('should complete full workflow successfully', async () => {
      // ============================================================
      // Step 1: PROPOSE - Create change structure and delta
      // ============================================================
      const changeDir = path.join(testDir, 'openspec', 'changes', changeName);
      await fs.mkdir(changeDir, { recursive: true });

      // Create proposal
      await fs.writeFile(
        path.join(changeDir, 'proposal.md'),
        '# Add Auth Feature\n\nAdd authentication capabilities.'
      );

      // Create spec
      const specsDir = path.join(changeDir, 'specs', 'auth');
      await fs.mkdir(specsDir, { recursive: true });
      await fs.writeFile(
        path.join(specsDir, 'spec.md'),
        '# Auth Spec\n\n## Capabilities\n- cap.auth.login\n- cap.auth.logout'
      );

      // Generate opsx-delta.yaml (simulating what propose workflow does)
      const delta: OpsxDelta = {
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

      // Verify delta was created
      const deltaExists = await fs.access(deltaPath).then(() => true).catch(() => false);
      expect(deltaExists).toBe(true);

      // ============================================================
      // Step 2: SYNC - Merge delta into project.opsx.yaml
      // ============================================================

      // Read existing project.opsx.yaml (or create initial one)
      let projectOpsx = await readProjectOpsx(testDir);
      if (!projectOpsx) {
        projectOpsx = {
          project: { name: 'test-project', version: '1.0.0' },
          domains: [],
          capabilities: [],
          relations: [],
        };
      }

      // Read delta
      const deltaContent = await fs.readFile(deltaPath, 'utf-8');
      const parsedDelta = stringifyYaml(deltaContent);

      // Merge ADDED nodes
      if (delta.ADDED) {
        if (delta.ADDED.domains) {
          projectOpsx.domains = [...(projectOpsx.domains || []), ...delta.ADDED.domains];
        }
        if (delta.ADDED.capabilities) {
          projectOpsx.capabilities = [...(projectOpsx.capabilities || []), ...delta.ADDED.capabilities];
        }
        if (delta.ADDED.relations) {
          projectOpsx.relations = [...(projectOpsx.relations || []), ...delta.ADDED.relations];
        }
      }

      // Write merged project.opsx.yaml
      await writeProjectOpsx(testDir, projectOpsx);

      // Verify merge
      const mergedOpsx = await readProjectOpsx(testDir);
      expect(mergedOpsx).not.toBeNull();
      expect(mergedOpsx!.domains).toHaveLength(1);
      expect(mergedOpsx!.capabilities).toHaveLength(2);
      expect(mergedOpsx!.relations).toHaveLength(2);

      // ============================================================
      // Step 3: VERIFY - Validate referential integrity
      // ============================================================

      // Validate referential integrity
      const integrityResult = validateReferentialIntegrity(mergedOpsx!);
      expect(integrityResult.valid).toBe(true);
      expect(integrityResult.errors).toHaveLength(0);

      // Validate spec_refs (if any)
      const specRefsResult = await validateSpecRefs(testDir, mergedOpsx!);
      expect(specRefsResult.valid).toBe(true);

      // ============================================================
      // Step 4: Verify final state
      // ============================================================

      // Check that all nodes are present
      expect(mergedOpsx!.domains!.find(d => d.id === 'dom.auth')).toBeDefined();
      expect(mergedOpsx!.capabilities!.find(c => c.id === 'cap.auth.login')).toBeDefined();
      expect(mergedOpsx!.capabilities!.find(c => c.id === 'cap.auth.logout')).toBeDefined();

      // Check relations
      const loginRelation = mergedOpsx!.relations!.find(
        r => r.from === 'cap.auth.login' && r.to === 'dom.auth'
      );
      expect(loginRelation).toBeDefined();
      expect(loginRelation!.type).toBe('contains');
    });

    it('should handle MODIFIED nodes in delta', async () => {
      // ============================================================
      // Setup: Create initial project.opsx.yaml
      // ============================================================
      const initialOpsx: ProjectOpsx = {
        project: { name: 'test-project', version: '1.0.0' },
        domains: [
          { id: 'dom.auth', type: 'domain', intent: 'Old intent' },
        ],
        capabilities: [
          { id: 'cap.auth.login', type: 'capability', intent: 'Old login' },
        ],
      };
      await writeProjectOpsx(testDir, initialOpsx);

      // ============================================================
      // Step 1: Create delta with MODIFIED nodes
      // ============================================================
      const changeDir = path.join(testDir, 'openspec', 'changes', changeName);
      await fs.mkdir(changeDir, { recursive: true });

      const delta: OpsxDelta = {
        MODIFIED: {
          domains: [
            { id: 'dom.auth', type: 'domain', intent: 'Updated authentication domain' },
          ],
          capabilities: [
            { id: 'cap.auth.login', type: 'capability', intent: 'Updated user login' },
          ],
        },
      };

      const deltaPath = path.join(changeDir, 'opsx-delta.yaml');
      await fs.writeFile(deltaPath, stringifyYaml(delta));

      // ============================================================
      // Step 2: Merge MODIFIED nodes
      // ============================================================
      let projectOpsx = await readProjectOpsx(testDir);
      expect(projectOpsx).not.toBeNull();

      if (delta.MODIFIED) {
        // Update domains
        if (delta.MODIFIED.domains) {
          delta.MODIFIED.domains.forEach(modifiedDomain => {
            const index = projectOpsx!.domains!.findIndex(d => d.id === modifiedDomain.id);
            if (index !== -1) {
              projectOpsx!.domains![index] = modifiedDomain;
            }
          });
        }

        // Update capabilities
        if (delta.MODIFIED.capabilities) {
          delta.MODIFIED.capabilities.forEach(modifiedCap => {
            const index = projectOpsx!.capabilities!.findIndex(c => c.id === modifiedCap.id);
            if (index !== -1) {
              projectOpsx!.capabilities![index] = modifiedCap;
            }
          });
        }
      }

      await writeProjectOpsx(testDir, projectOpsx!);

      // ============================================================
      // Step 3: Verify modifications
      // ============================================================
      const mergedOpsx = await readProjectOpsx(testDir);
      expect(mergedOpsx).not.toBeNull();

      const updatedDomain = mergedOpsx!.domains!.find(d => d.id === 'dom.auth');
      expect(updatedDomain!.intent).toBe('Updated authentication domain');

      const updatedCap = mergedOpsx!.capabilities!.find(c => c.id === 'cap.auth.login');
      expect(updatedCap!.intent).toBe('Updated user login');
    });

    it('should handle REMOVED nodes in delta', async () => {
      // ============================================================
      // Setup: Create initial project.opsx.yaml
      // ============================================================
      const initialOpsx: ProjectOpsx = {
        project: { name: 'test-project', version: '1.0.0' },
        domains: [
          { id: 'dom.auth', type: 'domain' },
          { id: 'dom.core', type: 'domain' },
        ],
        capabilities: [
          { id: 'cap.auth.login', type: 'capability' },
          { id: 'cap.core.init', type: 'capability' },
        ],
      };
      await writeProjectOpsx(testDir, initialOpsx);

      // ============================================================
      // Step 1: Create delta with REMOVED nodes
      // ============================================================
      const changeDir = path.join(testDir, 'openspec', 'changes', changeName);
      await fs.mkdir(changeDir, { recursive: true });

      const delta: OpsxDelta = {
        REMOVED: {
          domains: [
            { id: 'dom.auth', type: 'domain' },
          ],
          capabilities: [
            { id: 'cap.auth.login', type: 'capability' },
          ],
        },
      };

      const deltaPath = path.join(changeDir, 'opsx-delta.yaml');
      await fs.writeFile(deltaPath, stringifyYaml(delta));

      // ============================================================
      // Step 2: Remove nodes
      // ============================================================
      let projectOpsx = await readProjectOpsx(testDir);
      expect(projectOpsx).not.toBeNull();

      if (delta.REMOVED) {
        // Remove domains
        if (delta.REMOVED.domains) {
          const idsToRemove = new Set(delta.REMOVED.domains.map(d => d.id));
          projectOpsx!.domains = projectOpsx!.domains!.filter(d => !idsToRemove.has(d.id));
        }

        // Remove capabilities
        if (delta.REMOVED.capabilities) {
          const idsToRemove = new Set(delta.REMOVED.capabilities.map(c => c.id));
          projectOpsx!.capabilities = projectOpsx!.capabilities!.filter(c => !idsToRemove.has(c.id));
        }
      }

      await writeProjectOpsx(testDir, projectOpsx!);

      // ============================================================
      // Step 3: Verify removals
      // ============================================================
      const mergedOpsx = await readProjectOpsx(testDir);
      expect(mergedOpsx).not.toBeNull();

      expect(mergedOpsx!.domains).toHaveLength(1);
      expect(mergedOpsx!.domains!.find(d => d.id === 'dom.auth')).toBeUndefined();
      expect(mergedOpsx!.domains!.find(d => d.id === 'dom.core')).toBeDefined();

      expect(mergedOpsx!.capabilities).toHaveLength(1);
      expect(mergedOpsx!.capabilities!.find(c => c.id === 'cap.auth.login')).toBeUndefined();
      expect(mergedOpsx!.capabilities!.find(c => c.id === 'cap.core.init')).toBeDefined();
    });
  });
});
