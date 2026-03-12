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
  type ProjectOpsxBundle,
} from '../../src/utils/opsx-utils.js';

describe('PBT: Merge Idempotency', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = path.join(os.tmpdir(), `openspec-opsx-pbt-${randomUUID()}`);
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  const projectMetadataArb = fc.record({
    id: fc.string({ minLength: 1, maxLength: 50 }),
    name: fc.string({ minLength: 1, maxLength: 50 }),
  });

  const nodeIdArb = fc.oneof(
    fc.constantFrom('cap', 'dom')
      .chain(prefix => fc.string({ minLength: 1, maxLength: 20 })
        .map(suffix => `${prefix}.${suffix.replace(/[^a-z0-9-]/gi, '-')}`))
  );

  const domainNodeArb = fc.record({
    id: nodeIdArb.filter(id => id.startsWith('dom.')),
    type: fc.constant('domain' as const),
    intent: fc.option(fc.string({ maxLength: 100 }), { nil: undefined }),
  });

  const capabilityNodeArb = fc.record({
    id: nodeIdArb.filter(id => id.startsWith('cap.')),
    type: fc.constant('capability' as const),
    intent: fc.option(fc.string({ maxLength: 100 }), { nil: undefined }),
  });

  const bundleArb = fc.record({
    project: projectMetadataArb,
    domains: fc.option(fc.array(domainNodeArb, { minLength: 0, maxLength: 5 }), { nil: undefined }),
    capabilities: fc.option(fc.array(capabilityNodeArb, { minLength: 0, maxLength: 5 }), { nil: undefined }),
  }).map(base => ({
    schema_version: OPSX_SCHEMA_VERSION,
    project: base.project,
    domains: base.domains || [],
    capabilities: base.capabilities || [],
    relations: [],
    code_map: [],
  } as ProjectOpsxBundle));

  it('Property 1: Writing same data twice produces identical result', async () => {
    await fc.assert(
      fc.asyncProperty(bundleArb, async (bundle) => {
        await writeProjectOpsx(testDir, bundle);
        const r1 = await readProjectOpsx(testDir);

        await writeProjectOpsx(testDir, bundle);
        const r2 = await readProjectOpsx(testDir);

        expect(r1).not.toBeNull();
        expect(r2).not.toBeNull();
        // Compare without generated_at (timestamp differs)
        const strip = (b: any) => ({ ...b, code_map: b.code_map });
        expect(strip(r1)).toEqual(strip(r2));
      }),
      { numRuns: 50 },
    );
  });

  it('Property 2: Read-write-read cycle preserves data', async () => {
    await fc.assert(
      fc.asyncProperty(bundleArb, async (original) => {
        await writeProjectOpsx(testDir, original);
        const read1 = await readProjectOpsx(testDir);
        expect(read1).not.toBeNull();

        await writeProjectOpsx(testDir, read1!);
        const read2 = await readProjectOpsx(testDir);
        expect(read2).not.toBeNull();

        expect(read1!.project).toEqual(read2!.project);
        expect(read1!.domains).toEqual(read2!.domains);
        expect(read1!.capabilities).toEqual(read2!.capabilities);
        expect(read1!.relations).toEqual(read2!.relations);
      }),
      { numRuns: 50 },
    );
  });

  it('Property 3: Multiple writes with same data are idempotent', async () => {
    await fc.assert(
      fc.asyncProperty(bundleArb, async (bundle) => {
        await writeProjectOpsx(testDir, bundle);
        await writeProjectOpsx(testDir, bundle);
        await writeProjectOpsx(testDir, bundle);

        const result = await readProjectOpsx(testDir);
        expect(result).not.toBeNull();
        expect(result!.project.name).toBe(bundle.project.name);
        expect(result!.domains).toHaveLength(bundle.domains.length);
        expect(result!.capabilities).toHaveLength(bundle.capabilities.length);
      }),
      { numRuns: 50 },
    );
  });
});
