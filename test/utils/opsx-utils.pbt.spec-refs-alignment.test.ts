import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { randomUUID } from 'crypto';
import * as fc from 'fast-check';
import {
  OPSX_SCHEMA_VERSION,
  readProjectOpsx,
  writeProjectOpsx,
  validateCodeMapIntegrity,
  type ProjectOpsxBundle,
  type CodeMapEntry,
} from '../../src/utils/opsx-utils.js';

describe('PBT: Code-Map Roundtrip', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = path.join(os.tmpdir(), `openspec-opsx-pbt-${randomUUID()}`);
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  const nodeIdArb = fc.oneof(
    fc.constantFrom('cap', 'dom')
      .chain(prefix => fc.string({ minLength: 1, maxLength: 20 })
        .map(suffix => `${prefix}.${suffix.replace(/[^a-z0-9-]/gi, '-')}`))
  );

  const codeRefArb = fc.record({
    path: fc.string({ minLength: 1, maxLength: 50 })
      .map(s => `src/${s.replace(/[^a-z0-9/.-]/gi, '-')}.ts`),
    line_start: fc.option(fc.integer({ min: 1, max: 10000 }), { nil: undefined }),
    line_end: fc.option(fc.integer({ min: 1, max: 10000 }), { nil: undefined }),
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

  it('Property 1: Code-map entries survive write/read roundtrip', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(nodeIdArb.filter(id => id.startsWith('cap.')), { minLength: 1, maxLength: 5 }),
        fc.array(codeRefArb, { minLength: 1, maxLength: 3 }),
        async (capIds, refs) => {
          const code_map: CodeMapEntry[] = capIds.map(id => ({ id, refs }));
          const bundle = mkBundle({
            capabilities: capIds.map(id => ({ id, type: 'capability' as const })),
            code_map,
          });

          await writeProjectOpsx(testDir, bundle);
          const result = await readProjectOpsx(testDir);

          expect(result).not.toBeNull();
          expect(result!.code_map).toHaveLength(code_map.length);

          for (const entry of code_map) {
            const found = result!.code_map.find(e => e.id === entry.id);
            expect(found).toBeDefined();
            expect(found!.refs).toHaveLength(entry.refs.length);
            for (let i = 0; i < entry.refs.length; i++) {
              expect(found!.refs[i].path).toBe(entry.refs[i].path);
              if (entry.refs[i].line_start != null) {
                expect(found!.refs[i].line_start).toBe(entry.refs[i].line_start);
              }
              if (entry.refs[i].line_end != null) {
                expect(found!.refs[i].line_end).toBe(entry.refs[i].line_end);
              }
            }
          }
        },
      ),
      { numRuns: 30 },
    );
  });

  it('Property 2: Valid code_map always passes integrity check', () => {
    fc.assert(
      fc.property(
        fc.array(nodeIdArb.filter(id => id.startsWith('cap.')), { minLength: 1, maxLength: 5 }),
        fc.array(codeRefArb, { minLength: 1, maxLength: 3 }),
        (capIds, refs) => {
          const bundle = mkBundle({
            capabilities: capIds.map(id => ({ id, type: 'capability' as const })),
            code_map: capIds.map(id => ({ id, refs })),
          });

          const result = validateCodeMapIntegrity(bundle);
          expect(result.valid).toBe(true);
        },
      ),
      { numRuns: 50 },
    );
  });

  it('Property 3: Dangling code_map entries always fail integrity check', () => {
    fc.assert(
      fc.property(
        nodeIdArb.filter(id => id.startsWith('cap.')),
        fc.array(codeRefArb, { minLength: 1, maxLength: 3 }),
        (danglingId, refs) => {
          const bundle = mkBundle({
            code_map: [{ id: danglingId, refs }],
          });

          const result = validateCodeMapIntegrity(bundle);
          expect(result.valid).toBe(false);
          expect(result.errors[0]).toContain(danglingId);
        },
      ),
      { numRuns: 50 },
    );
  });

  it('Property 4: Empty code_map always passes', () => {
    fc.assert(
      fc.property(
        fc.array(nodeIdArb.filter(id => id.startsWith('dom.')), { minLength: 0, maxLength: 5 }),
        (domainIds) => {
          const bundle = mkBundle({
            domains: domainIds.map(id => ({ id, type: 'domain' as const })),
          });

          const result = validateCodeMapIntegrity(bundle);
          expect(result.valid).toBe(true);
        },
      ),
      { numRuns: 50 },
    );
  });
});
