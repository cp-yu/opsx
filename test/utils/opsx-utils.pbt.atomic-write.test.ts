import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { randomUUID } from 'crypto';
import * as fc from 'fast-check';
import {
  OPSX_SCHEMA_VERSION,
  writeProjectOpsx,
  readProjectOpsx,
  type ProjectOpsxBundle,
} from '../../src/utils/opsx-utils.js';

describe('PBT: Atomic Write Guarantees (Three-File)', () => {
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

  const bundleArb = fc.record({
    project: projectMetadataArb,
    domains: fc.option(fc.array(domainNodeArb, { minLength: 1, maxLength: 10 }), { nil: undefined }),
  }).map(base => ({
    schema_version: OPSX_SCHEMA_VERSION,
    project: base.project,
    domains: base.domains || [],
    capabilities: [],
    relations: [],
    code_map: [],
  } as ProjectOpsxBundle));

  it('Property 1: No temporary files remain after write', async () => {
    await fc.assert(
      fc.asyncProperty(bundleArb, async (bundle) => {
        await writeProjectOpsx(testDir, bundle);

        const opsxDir = path.join(testDir, 'openspec');
        const files = await fs.readdir(opsxDir, { recursive: true });
        const tmpFiles = files.filter(f => f.toString().includes('.tmp'));
        expect(tmpFiles).toHaveLength(0);
      }),
      { numRuns: 50 },
    );
  });

  it('Property 2: Write completion guarantees readable data', async () => {
    await fc.assert(
      fc.asyncProperty(bundleArb, async (bundle) => {
        await writeProjectOpsx(testDir, bundle);

        const result = await readProjectOpsx(testDir);
        expect(result).not.toBeNull();
        expect(result!.project.name).toBe(bundle.project.name);
      }),
      { numRuns: 50 },
    );
  });

  it('Property 3: Sequential writes maintain consistency', async () => {
    await fc.assert(
      fc.asyncProperty(bundleArb, bundleArb, async (b1, b2) => {
        await writeProjectOpsx(testDir, b1);
        const r1 = await readProjectOpsx(testDir);
        expect(r1).not.toBeNull();
        expect(r1!.project.name).toBe(b1.project.name);

        await writeProjectOpsx(testDir, b2);
        const r2 = await readProjectOpsx(testDir);
        expect(r2).not.toBeNull();
        expect(r2!.project.name).toBe(b2.project.name);
      }),
      { numRuns: 30 },
    );
  });

  it('Property 4: All three files are created on every write', async () => {
    await fc.assert(
      fc.asyncProperty(bundleArb, async (bundle) => {
        await writeProjectOpsx(testDir, bundle);

        const opsxDir = path.join(testDir, 'openspec');
        const files = await fs.readdir(opsxDir);
        const opsxFiles = files.filter(f => f.startsWith('project.opsx'));
        expect(opsxFiles).toHaveLength(3);
      }),
      { numRuns: 30 },
    );
  });
});
