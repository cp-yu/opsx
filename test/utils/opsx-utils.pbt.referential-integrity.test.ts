import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  validateReferentialIntegrity,
  type ProjectOpsx,
} from '../../src/utils/opsx-utils.js';

/**
 * Property-Based Tests for Relation Referential Integrity
 *
 * These tests verify that referential integrity validation correctly
 * identifies valid and invalid references in relations.
 */

// Arbitraries
const nodeIdArb = fc.oneof(
  fc.constantFrom('cap', 'dom', 'inv', 'ifc', 'dec', 'evd')
    .chain(prefix => fc.string({ minLength: 1, maxLength: 20 })
      .map(suffix => `${prefix}.${suffix.replace(/[^a-z0-9-]/gi, '-')}`))
);

const projectMetadataArb = fc.record({
  name: fc.string({ minLength: 1, maxLength: 50 }),
  version: fc.string({ minLength: 1, maxLength: 20 }),
});

describe('PBT: Relation Referential Integrity', () => {
  it('Property 1: Valid references always pass validation', () => {
    fc.assert(
      fc.property(
        projectMetadataArb,
        fc.array(nodeIdArb.filter(id => id.startsWith('dom.')), { minLength: 1, maxLength: 5 }),
        fc.array(nodeIdArb.filter(id => id.startsWith('cap.')), { minLength: 1, maxLength: 5 }),
        (project, domainIds, capIds) => {
          const allIds = [...domainIds, ...capIds];

          const data: ProjectOpsx = {
            project,
            domains: domainIds.map(id => ({ id, type: 'domain' as const })),
            capabilities: capIds.map(id => ({ id, type: 'capability' as const })),
            relations: [
              { from: capIds[0], to: domainIds[0], type: 'belongs_to' },
            ],
          };

          const result = validateReferentialIntegrity(data);
          expect(result.valid).toBe(true);
          expect(result.errors).toHaveLength(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 2: Invalid from reference always fails validation', () => {
    fc.assert(
      fc.property(
        projectMetadataArb,
        fc.array(nodeIdArb.filter(id => id.startsWith('dom.')), { minLength: 1, maxLength: 5 }),
        nodeIdArb.filter(id => id.startsWith('cap.')),
        (project, domainIds, invalidCapId) => {
          // Ensure invalidCapId is not in the capabilities list
          const data: ProjectOpsx = {
            project,
            domains: domainIds.map(id => ({ id, type: 'domain' as const })),
            relations: [
              { from: invalidCapId, to: domainIds[0], type: 'belongs_to' },
            ],
          };

          const result = validateReferentialIntegrity(data);
          expect(result.valid).toBe(false);
          expect(result.errors.length).toBeGreaterThan(0);
          expect(result.errors[0]).toContain(invalidCapId);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 3: Invalid to reference always fails validation', () => {
    fc.assert(
      fc.property(
        projectMetadataArb,
        fc.array(nodeIdArb.filter(id => id.startsWith('cap.')), { minLength: 1, maxLength: 5 }),
        nodeIdArb.filter(id => id.startsWith('dom.')),
        (project, capIds, invalidDomId) => {
          // Ensure invalidDomId is not in the domains list
          const data: ProjectOpsx = {
            project,
            capabilities: capIds.map(id => ({ id, type: 'capability' as const })),
            relations: [
              { from: capIds[0], to: invalidDomId, type: 'belongs_to' },
            ],
          };

          const result = validateReferentialIntegrity(data);
          expect(result.valid).toBe(false);
          expect(result.errors.length).toBeGreaterThan(0);
          expect(result.errors[0]).toContain(invalidDomId);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 4: Empty relations always pass validation', () => {
    fc.assert(
      fc.property(
        projectMetadataArb,
        fc.array(nodeIdArb, { minLength: 0, maxLength: 10 }),
        (project, nodeIds) => {
          const data: ProjectOpsx = {
            project,
            domains: nodeIds.filter(id => id.startsWith('dom.')).map(id => ({ id, type: 'domain' as const })),
            capabilities: nodeIds.filter(id => id.startsWith('cap.')).map(id => ({ id, type: 'capability' as const })),
          };

          const result = validateReferentialIntegrity(data);
          expect(result.valid).toBe(true);
          expect(result.errors).toHaveLength(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});
