import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  OPSX_SCHEMA_VERSION,
  validateReferentialIntegrity,
  type ProjectOpsxBundle,
} from '../../src/utils/opsx-utils.js';

const nodeIdArb = fc.oneof(
  fc.constantFrom('cap', 'dom')
    .chain(prefix => fc.string({ minLength: 1, maxLength: 20 })
      .map(suffix => `${prefix}.${suffix.replace(/[^a-z0-9-]/gi, '-')}`))
);

const projectMetadataArb = fc.record({
  id: fc.string({ minLength: 1, maxLength: 50 }),
  name: fc.string({ minLength: 1, maxLength: 50 }),
});

const mkBundle = (overrides: Partial<ProjectOpsxBundle>): ProjectOpsxBundle => ({
  schema_version: OPSX_SCHEMA_VERSION,
  project: { id: 'test', name: 'test' },
  domains: [],
  capabilities: [],
  relations: [],
  code_map: [],
  ...overrides,
});

describe('PBT: Relation Referential Integrity', () => {
  it('Property 1: Valid references always pass validation', () => {
    fc.assert(
      fc.property(
        projectMetadataArb,
        fc.array(nodeIdArb.filter(id => id.startsWith('dom.')), { minLength: 1, maxLength: 5 }),
        fc.array(nodeIdArb.filter(id => id.startsWith('cap.')), { minLength: 1, maxLength: 5 }),
        (project, domainIds, capIds) => {
          const bundle = mkBundle({
            project,
            domains: domainIds.map(id => ({ id, type: 'domain' as const })),
            capabilities: capIds.map(id => ({ id, type: 'capability' as const })),
            relations: [{ from: capIds[0], to: domainIds[0], type: 'contains' }],
          });

          const result = validateReferentialIntegrity(bundle);
          expect(result.valid).toBe(true);
          expect(result.errors).toHaveLength(0);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property 2: Invalid from reference always fails validation', () => {
    fc.assert(
      fc.property(
        projectMetadataArb,
        fc.array(nodeIdArb.filter(id => id.startsWith('dom.')), { minLength: 1, maxLength: 5 }),
        nodeIdArb.filter(id => id.startsWith('cap.')),
        (project, domainIds, invalidCapId) => {
          const bundle = mkBundle({
            project,
            domains: domainIds.map(id => ({ id, type: 'domain' as const })),
            relations: [{ from: invalidCapId, to: domainIds[0], type: 'contains' }],
          });

          const result = validateReferentialIntegrity(bundle);
          expect(result.valid).toBe(false);
          expect(result.errors.length).toBeGreaterThan(0);
          expect(result.errors[0]).toContain(invalidCapId);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property 3: Invalid to reference always fails validation', () => {
    fc.assert(
      fc.property(
        projectMetadataArb,
        fc.array(nodeIdArb.filter(id => id.startsWith('cap.')), { minLength: 1, maxLength: 5 }),
        nodeIdArb.filter(id => id.startsWith('dom.')),
        (project, capIds, invalidDomId) => {
          const bundle = mkBundle({
            project,
            capabilities: capIds.map(id => ({ id, type: 'capability' as const })),
            relations: [{ from: capIds[0], to: invalidDomId, type: 'contains' }],
          });

          const result = validateReferentialIntegrity(bundle);
          expect(result.valid).toBe(false);
          expect(result.errors.length).toBeGreaterThan(0);
          expect(result.errors[0]).toContain(invalidDomId);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property 4: Empty relations always pass validation', () => {
    fc.assert(
      fc.property(
        projectMetadataArb,
        fc.array(nodeIdArb, { minLength: 0, maxLength: 10 }),
        (project, nodeIds) => {
          const bundle = mkBundle({
            project,
            domains: nodeIds.filter(id => id.startsWith('dom.')).map(id => ({ id, type: 'domain' as const })),
            capabilities: nodeIds.filter(id => id.startsWith('cap.')).map(id => ({ id, type: 'capability' as const })),
          });

          const result = validateReferentialIntegrity(bundle);
          expect(result.valid).toBe(true);
          expect(result.errors).toHaveLength(0);
        },
      ),
      { numRuns: 100 },
    );
  });
});
