import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { randomUUID } from 'crypto';
import * as fc from 'fast-check';
import {
  validateSpecRefs,
  type ProjectOpsx,
} from '../../src/utils/opsx-utils.js';

/**
 * Property-Based Tests for spec_refs Bidirectional Alignment
 *
 * These tests verify that spec_refs validation correctly handles:
 * - Valid file references
 * - Missing file references
 * - Empty spec_refs arrays
 * - Nodes without spec_refs
 */

describe('PBT: spec_refs Bidirectional Alignment', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = path.join(os.tmpdir(), `openspec-opsx-pbt-${randomUUID()}`);
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  const projectMetadataArb = fc.record({
    name: fc.string({ minLength: 1, maxLength: 50 }),
    version: fc.string({ minLength: 1, maxLength: 20 }),
  });

  const nodeIdArb = fc.oneof(
    fc.constantFrom('cap', 'dom')
      .chain(prefix => fc.string({ minLength: 1, maxLength: 20 })
        .map(suffix => `${prefix}.${suffix.replace(/[^a-z0-9-]/gi, '-')}`))
  );

  it('Property 1: Valid spec_refs always pass validation', async () => {
    await fc.assert(
      fc.asyncProperty(
        projectMetadataArb,
        fc.array(nodeIdArb.filter(id => id.startsWith('dom.')), { minLength: 1, maxLength: 5 }),
        fc.array(
          fc.string({ minLength: 1, maxLength: 20 })
            .map(s => `${s.replace(/[^a-z0-9]/gi, '-')}.md`)
            .filter(s => s.length > 3),
          { minLength: 1, maxLength: 3 }
        ),
        async (project, domainIds, specFiles) => {
          // Create spec files
          for (const specFile of specFiles) {
            await fs.writeFile(path.join(testDir, specFile), '# Spec');
          }

          const data: ProjectOpsx = {
            project,
            domains: domainIds.map(id => ({
              id,
              type: 'domain' as const,
              spec_refs: [{ path: specFiles[0] }],
            })),
          };

          const result = await validateSpecRefs(testDir, data);
          expect(result.valid).toBe(true);
          expect(result.errors).toHaveLength(0);
        }
      ),
      { numRuns: 30 }
    );
  });

  it('Property 2: Missing spec files always fail validation', async () => {
    await fc.assert(
      fc.asyncProperty(
        projectMetadataArb,
        fc.array(nodeIdArb.filter(id => id.startsWith('dom.')), { minLength: 1, maxLength: 5 }),
        fc.string({ minLength: 1, maxLength: 20 })
          .map(s => `missing-${s.replace(/[^a-z0-9]/gi, '-')}.md`)
          .filter(s => s.length > 10),
        async (project, domainIds, missingFile) => {
          const data: ProjectOpsx = {
            project,
            domains: domainIds.map(id => ({
              id,
              type: 'domain' as const,
              spec_refs: [{ path: missingFile }],
            })),
          };

          const result = await validateSpecRefs(testDir, data);
          expect(result.valid).toBe(false);
          expect(result.errors.length).toBeGreaterThan(0);
          expect(result.errors.some(e => e.includes(missingFile))).toBe(true);
        }
      ),
      { numRuns: 30 }
    );
  });

  it('Property 3: Nodes without spec_refs always pass validation', async () => {
    await fc.assert(
      fc.asyncProperty(
        projectMetadataArb,
        fc.array(nodeIdArb.filter(id => id.startsWith('dom.')), { minLength: 1, maxLength: 10 }),
        async (project, domainIds) => {
          const data: ProjectOpsx = {
            project,
            domains: domainIds.map(id => ({
              id,
              type: 'domain' as const,
            })),
          };

          const result = await validateSpecRefs(testDir, data);
          expect(result.valid).toBe(true);
          expect(result.errors).toHaveLength(0);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('Property 4: Mixed valid and invalid refs produce appropriate errors', async () => {
    await fc.assert(
      fc.asyncProperty(
        projectMetadataArb,
        fc.array(nodeIdArb.filter(id => id.startsWith('cap.')), { minLength: 2, maxLength: 5 }),
        fc.string({ minLength: 1, maxLength: 20 })
          .map(s => `valid-${s.replace(/[^a-z0-9]/gi, '-')}.md`)
          .filter(s => s.length > 8),
        fc.string({ minLength: 1, maxLength: 20 })
          .map(s => `invalid-${s.replace(/[^a-z0-9]/gi, '-')}.md`)
          .filter(s => s.length > 10),
        async (project, capIds, validFile, invalidFile) => {
          // Create only the valid file
          await fs.writeFile(path.join(testDir, validFile), '# Valid Spec');

          const data: ProjectOpsx = {
            project,
            capabilities: [
              {
                id: capIds[0],
                type: 'capability' as const,
                spec_refs: [{ path: validFile }],
              },
              {
                id: capIds[1],
                type: 'capability' as const,
                spec_refs: [{ path: invalidFile }],
              },
            ],
          };

          const result = await validateSpecRefs(testDir, data);
          expect(result.valid).toBe(false);
          expect(result.errors.length).toBeGreaterThan(0);
          // Should only report the invalid file
          expect(result.errors.some(e => e.includes(invalidFile))).toBe(true);
          expect(result.errors.some(e => e.includes(validFile))).toBe(false);
        }
      ),
      { numRuns: 30 }
    );
  });
});
