import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import {
  OPSX_SCHEMA_VERSION,
  ProjectOpsxFileSchema,
} from '../../src/utils/opsx-utils.js';

const nodeIdArb = fc.oneof(
  fc.constantFrom('cap', 'dom')
    .chain(prefix => fc.string({ minLength: 1, maxLength: 20 })
      .map(suffix => `${prefix}.${suffix.replace(/[^a-z0-9-]/gi, '-')}`))
);

const projectMetadataArb = fc.record({
  id: fc.string({ minLength: 1, maxLength: 50 }),
  name: fc.string({ minLength: 1, maxLength: 50 }),
  intent: fc.option(fc.string({ maxLength: 200 }), { nil: undefined }),
});

const domainNodeArb = fc.record({
  id: nodeIdArb.filter(id => id.startsWith('dom.')),
  type: fc.constant('domain' as const),
  intent: fc.option(fc.string({ maxLength: 100 }), { nil: undefined }),
  status: fc.option(fc.constantFrom('draft', 'active'), { nil: undefined }),
});

const capabilityNodeArb = fc.record({
  id: nodeIdArb.filter(id => id.startsWith('cap.')),
  type: fc.constant('capability' as const),
  intent: fc.option(fc.string({ maxLength: 100 }), { nil: undefined }),
  status: fc.option(fc.constantFrom('draft', 'active'), { nil: undefined }),
});

const progressArb = fc.option(
  fc.record({ phase: fc.constantFrom('implementing', 'verifying') }),
  { nil: undefined },
);

const projectOpsxFileArb = fc
  .record({
    schema_version: fc.constant(OPSX_SCHEMA_VERSION),
    project: projectMetadataArb,
    domains: fc.array(domainNodeArb, { minLength: 0, maxLength: 10 }),
    capabilities: fc.array(capabilityNodeArb, { minLength: 0, maxLength: 10 }),
  })
  .map(base => ({
    ...base,
    domains: base.domains.length > 0 ? base.domains : undefined,
    capabilities: base.capabilities.length > 0 ? base.capabilities : undefined,
  }));

describe('PBT: YAML Structure Preservation', () => {
  it('Property 1: Round-trip preserves structure', () => {
    fc.assert(
      fc.property(projectOpsxFileArb, (original) => {
        const yaml = stringifyYaml(original);
        const parsed = parseYaml(yaml);
        const result = ProjectOpsxFileSchema.safeParse(parsed);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.project.name).toBe(original.project.name);
          expect(result.data.project.id).toBe(original.project.id);
          expect(result.data.schema_version).toBe(OPSX_SCHEMA_VERSION);

          if (original.domains) {
            expect(result.data.domains?.length).toBe(original.domains.length);
          }
          if (original.capabilities) {
            expect(result.data.capabilities?.length).toBe(original.capabilities.length);
          }
        }
      }),
      { numRuns: 100 },
    );
  });

  it('Property 2: Serialization is deterministic for same input', () => {
    fc.assert(
      fc.property(projectOpsxFileArb, (data) => {
        const yaml1 = stringifyYaml(data);
        const yaml2 = stringifyYaml(data);
        expect(yaml1).toBe(yaml2);
      }),
      { numRuns: 100 },
    );
  });

  it('Property 3: Empty optional fields are handled correctly', () => {
    fc.assert(
      fc.property(projectMetadataArb, (project) => {
        const minimal = { schema_version: OPSX_SCHEMA_VERSION, project };
        const yaml = stringifyYaml(minimal);
        const parsed = parseYaml(yaml);
        const result = ProjectOpsxFileSchema.safeParse(parsed);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.project.name).toBe(project.name);
          expect(result.data.domains || []).toHaveLength(0);
          expect(result.data.capabilities || []).toHaveLength(0);
        }
      }),
      { numRuns: 100 },
    );
  });

  it('Property 4: Status only allows draft|active', () => {
    fc.assert(
      fc.property(projectOpsxFileArb, (data) => {
        const yaml = stringifyYaml(data);
        const parsed = parseYaml(yaml);
        const result = ProjectOpsxFileSchema.safeParse(parsed);

        expect(result.success).toBe(true);
        if (result.success) {
          for (const d of result.data.domains || []) {
            if (d.status) expect(['draft', 'active']).toContain(d.status);
          }
          for (const c of result.data.capabilities || []) {
            if (c.status) expect(['draft', 'active']).toContain(c.status);
          }
        }
      }),
      { numRuns: 100 },
    );
  });
});
