import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import {
  ProjectOpsxSchema,
  type ProjectOpsx,
  type OpsxNode,
} from '../../src/utils/opsx-utils.js';

/**
 * Property-Based Tests for YAML Structure Preservation
 *
 * These tests verify that YAML serialization/deserialization preserves
 * the structure and semantics of OPSX data.
 */

// Arbitraries for generating test data
const nodeIdArb = fc.oneof(
  fc.constantFrom('cap', 'dom', 'inv', 'ifc', 'dec', 'rel', 'evd')
    .chain(prefix => fc.string({ minLength: 1, maxLength: 20 })
      .map(suffix => `${prefix}.${suffix.replace(/[^a-z0-9-]/gi, '-')}`))
);

const projectMetadataArb = fc.record({
  name: fc.string({ minLength: 1, maxLength: 50 }),
  version: fc.string({ minLength: 1, maxLength: 20 }),
  description: fc.option(fc.string({ maxLength: 200 }), { nil: undefined }),
});

const domainNodeArb = fc.record({
  id: nodeIdArb.filter(id => id.startsWith('dom.')),
  type: fc.constant('domain' as const),
  intent: fc.option(fc.string({ maxLength: 100 }), { nil: undefined }),
  status: fc.option(fc.constantFrom('draft', 'active', 'deprecated'), { nil: undefined }),
});

const capabilityNodeArb = fc.record({
  id: nodeIdArb.filter(id => id.startsWith('cap.')),
  type: fc.constant('capability' as const),
  intent: fc.option(fc.string({ maxLength: 100 }), { nil: undefined }),
  status: fc.option(fc.constantFrom('draft', 'active', 'deprecated'), { nil: undefined }),
});

const projectOpsxArb = fc
  .record({
    project: projectMetadataArb,
    domains: fc.array(domainNodeArb, { minLength: 0, maxLength: 10 }),
    capabilities: fc.array(capabilityNodeArb, { minLength: 0, maxLength: 10 }),
  })
  .chain(base => {
    // Collect all node IDs
    const allNodeIds = [
      ...base.domains.map(d => d.id),
      ...base.capabilities.map(c => c.id),
    ];

    // Only generate relations if we have nodes
    if (allNodeIds.length < 2) {
      return fc.constant({
        ...base,
        domains: base.domains.length > 0 ? base.domains : undefined,
        capabilities: base.capabilities.length > 0 ? base.capabilities : undefined,
      });
    }

    // Generate relations with valid node references
    const relationArb = fc.record({
      from: fc.constantFrom(...allNodeIds),
      to: fc.constantFrom(...allNodeIds),
      type: fc.constantFrom('contains', 'depends_on', 'constrains', 'implemented_by', 'verified_by', 'relates_to'),
    });

    return fc.array(relationArb, { minLength: 0, maxLength: 5 }).map(relations => ({
      ...base,
      domains: base.domains.length > 0 ? base.domains : undefined,
      capabilities: base.capabilities.length > 0 ? base.capabilities : undefined,
      relations: relations.length > 0 ? relations : undefined,
    }));
  });

describe('PBT: YAML Structure Preservation', () => {
  it('Property 1: Round-trip preserves structure', () => {
    fc.assert(
      fc.property(projectOpsxArb, (original) => {
        // Serialize to YAML
        const yaml = stringifyYaml(original);

        // Parse back
        const parsed = parseYaml(yaml);

        // Validate schema
        const result = ProjectOpsxSchema.safeParse(parsed);

        // Should successfully parse
        expect(result.success).toBe(true);

        if (result.success) {
          // Core structure should be preserved
          expect(result.data.project.name).toBe(original.project.name);
          expect(result.data.project.version).toBe(original.project.version);

          // Array lengths should match
          if (original.domains) {
            expect(result.data.domains?.length).toBe(original.domains.length);
          }
          if (original.capabilities) {
            expect(result.data.capabilities?.length).toBe(original.capabilities.length);
          }
          if (original.relations) {
            expect(result.data.relations?.length).toBe(original.relations.length);
          }
        }
      }),
      { numRuns: 100 }
    );
  });

  it('Property 2: Serialization is deterministic for same input', () => {
    fc.assert(
      fc.property(projectOpsxArb, (data) => {
        const yaml1 = stringifyYaml(data);
        const yaml2 = stringifyYaml(data);

        // Same input should produce same output
        expect(yaml1).toBe(yaml2);
      }),
      { numRuns: 100 }
    );
  });

  it('Property 3: Empty optional fields are handled correctly', () => {
    fc.assert(
      fc.property(projectMetadataArb, (project) => {
        const minimal: ProjectOpsx = { project };

        const yaml = stringifyYaml(minimal);
        const parsed = parseYaml(yaml);
        const result = ProjectOpsxSchema.safeParse(parsed);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.project.name).toBe(project.name);
          // Optional arrays should be undefined or empty
          expect(result.data.domains || []).toHaveLength(0);
          expect(result.data.capabilities || []).toHaveLength(0);
        }
      }),
      { numRuns: 100 }
    );
  });
});
