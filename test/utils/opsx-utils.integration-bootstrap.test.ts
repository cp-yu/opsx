import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { randomUUID } from 'crypto';
import {
  readProjectOpsx,
  writeProjectOpsx,
  validateReferentialIntegrity,
  type ProjectOpsx,
} from '../../src/utils/opsx-utils.js';

/**
 * Integration Tests for Bootstrap Workflow
 *
 * Tests the bootstrap workflow that creates initial project.opsx.yaml
 * from existing codebase structure.
 */

describe('Integration: Bootstrap Workflow', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = path.join(os.tmpdir(), `openspec-bootstrap-${randomUUID()}`);
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('Bootstrap: Create initial OPSX structure', () => {
    it('should create minimal valid project.opsx.yaml', async () => {
      // Simulate bootstrap creating initial structure
      const initialOpsx: ProjectOpsx = {
        project: {
          name: 'my-project',
          version: '0.1.0',
          description: 'Initial OPSX structure',
        },
      };

      await writeProjectOpsx(testDir, initialOpsx);

      // Verify file was created
      const result = await readProjectOpsx(testDir);
      expect(result).not.toBeNull();
      expect(result!.project.name).toBe('my-project');
      expect(result!.project.version).toBe('0.1.0');
    });

    it('should create OPSX with discovered domains', async () => {
      // Simulate discovering domains from codebase structure
      // (e.g., from src/domains/* directories)
      const discoveredDomains = [
        { id: 'dom.core', type: 'domain' as const, intent: 'Core domain' },
        { id: 'dom.auth', type: 'domain' as const, intent: 'Authentication domain' },
        { id: 'dom.api', type: 'domain' as const, intent: 'API domain' },
      ];

      const bootstrappedOpsx: ProjectOpsx = {
        project: {
          name: 'my-project',
          version: '0.1.0',
        },
        domains: discoveredDomains,
      };

      await writeProjectOpsx(testDir, bootstrappedOpsx);

      // Verify structure
      const result = await readProjectOpsx(testDir);
      expect(result).not.toBeNull();
      expect(result!.domains).toHaveLength(3);
      expect(result!.domains!.map(d => d.id)).toContain('dom.core');
      expect(result!.domains!.map(d => d.id)).toContain('dom.auth');
      expect(result!.domains!.map(d => d.id)).toContain('dom.api');
    });

    it('should create OPSX with discovered capabilities', async () => {
      // Simulate discovering capabilities from code
      // (e.g., from function exports, class methods, API endpoints)
      const discoveredCapabilities = [
        { id: 'cap.user.create', type: 'capability' as const, intent: 'Create user' },
        { id: 'cap.user.read', type: 'capability' as const, intent: 'Read user' },
        { id: 'cap.user.update', type: 'capability' as const, intent: 'Update user' },
        { id: 'cap.user.delete', type: 'capability' as const, intent: 'Delete user' },
      ];

      const bootstrappedOpsx: ProjectOpsx = {
        project: {
          name: 'my-project',
          version: '0.1.0',
        },
        domains: [
          { id: 'dom.user', type: 'domain', intent: 'User management' },
        ],
        capabilities: discoveredCapabilities,
        relations: discoveredCapabilities.map(cap => ({
          from: cap.id,
          to: 'dom.user',
          type: 'contains' as const,
        })),
      };

      await writeProjectOpsx(testDir, bootstrappedOpsx);

      // Verify structure
      const result = await readProjectOpsx(testDir);
      expect(result).not.toBeNull();
      expect(result!.capabilities).toHaveLength(4);
      expect(result!.relations).toHaveLength(4);

      // Verify referential integrity
      const integrityResult = validateReferentialIntegrity(result!);
      expect(integrityResult.valid).toBe(true);
    });

    it('should handle bootstrap with code_refs', async () => {
      // Simulate discovering code references
      const bootstrappedOpsx: ProjectOpsx = {
        project: {
          name: 'my-project',
          version: '0.1.0',
        },
        domains: [
          {
            id: 'dom.auth',
            type: 'domain',
            intent: 'Authentication',
            code_refs: [
              { path: 'src/auth/index.ts', line_start: 1 },
              { path: 'src/auth/login.ts', line_start: 10 },
            ],
          },
        ],
        capabilities: [
          {
            id: 'cap.auth.login',
            type: 'capability',
            intent: 'User login',
            code_refs: [
              { path: 'src/auth/login.ts', line_start: 15, line_end: 45 },
            ],
          },
        ],
      };

      await writeProjectOpsx(testDir, bootstrappedOpsx);

      // Verify code_refs are preserved
      const result = await readProjectOpsx(testDir);
      expect(result).not.toBeNull();
      expect(result!.domains![0].code_refs).toHaveLength(2);
      expect(result!.capabilities![0].code_refs).toHaveLength(1);
      expect(result!.capabilities![0].code_refs![0].path).toBe('src/auth/login.ts');
    });

    it('should handle bootstrap with spec_refs', async () => {
      // Create spec files
      const specsDir = path.join(testDir, 'docs', 'specs');
      await fs.mkdir(specsDir, { recursive: true });
      await fs.writeFile(path.join(specsDir, 'auth.md'), '# Auth Spec');
      await fs.writeFile(path.join(specsDir, 'api.md'), '# API Spec');

      // Bootstrap with spec_refs
      const bootstrappedOpsx: ProjectOpsx = {
        project: {
          name: 'my-project',
          version: '0.1.0',
        },
        domains: [
          {
            id: 'dom.auth',
            type: 'domain',
            intent: 'Authentication',
            spec_refs: [{ path: 'docs/specs/auth.md' }],
          },
          {
            id: 'dom.api',
            type: 'domain',
            intent: 'API',
            spec_refs: [{ path: 'docs/specs/api.md' }],
          },
        ],
      };

      await writeProjectOpsx(testDir, bootstrappedOpsx);

      // Verify spec_refs
      const result = await readProjectOpsx(testDir);
      expect(result).not.toBeNull();
      expect(result!.domains![0].spec_refs).toHaveLength(1);
      expect(result!.domains![1].spec_refs).toHaveLength(1);
    });

    it('should create valid structure for incremental bootstrap', async () => {
      // Phase 1: Bootstrap with minimal structure
      const phase1: ProjectOpsx = {
        project: {
          name: 'my-project',
          version: '0.1.0',
        },
        domains: [
          { id: 'dom.core', type: 'domain' },
        ],
      };

      await writeProjectOpsx(testDir, phase1);

      // Phase 2: Add more discovered elements
      const phase2 = await readProjectOpsx(testDir);
      expect(phase2).not.toBeNull();

      phase2!.capabilities = [
        { id: 'cap.core.init', type: 'capability', intent: 'Initialize system' },
      ];
      phase2!.relations = [
        { from: 'cap.core.init', to: 'dom.core', type: 'contains' },
      ];

      await writeProjectOpsx(testDir, phase2!);

      // Verify incremental update
      const final = await readProjectOpsx(testDir);
      expect(final).not.toBeNull();
      expect(final!.domains).toHaveLength(1);
      expect(final!.capabilities).toHaveLength(1);
      expect(final!.relations).toHaveLength(1);

      // Verify integrity
      const integrityResult = validateReferentialIntegrity(final!);
      expect(integrityResult.valid).toBe(true);
    });
  });

  describe('Bootstrap: Error handling', () => {
    it('should reject bootstrap with invalid node IDs', async () => {
      const invalidOpsx: ProjectOpsx = {
        project: {
          name: 'my-project',
          version: '0.1.0',
        },
        domains: [
          { id: 'invalid-id', type: 'domain' }, // Should start with 'dom.'
        ],
      };

      await writeProjectOpsx(testDir, invalidOpsx);

      // Should fail validation when reading back
      const result = await readProjectOpsx(testDir);
      expect(result).toBeNull(); // Invalid structure
    });

    it('should handle bootstrap with duplicate IDs', async () => {
      const duplicateOpsx: ProjectOpsx = {
        project: {
          name: 'my-project',
          version: '0.1.0',
        },
        domains: [
          { id: 'dom.core', type: 'domain' },
          { id: 'dom.core', type: 'domain' }, // Duplicate
        ],
      };

      await writeProjectOpsx(testDir, duplicateOpsx);

      // Should write successfully (validation doesn't check duplicates yet)
      const result = await readProjectOpsx(testDir);
      expect(result).not.toBeNull();
      // Note: Duplicate detection could be added as future enhancement
    });
  });
});
