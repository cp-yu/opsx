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

describe('PBT: Fixed Three-File Layout', () => {
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
    intent: fc.option(fc.string({ minLength: 50, maxLength: 200 }), { nil: undefined }),
  });

  const capabilityNodeArb = fc.record({
    id: nodeIdArb.filter(id => id.startsWith('cap.')),
    type: fc.constant('capability' as const),
    intent: fc.option(fc.string({ minLength: 50, maxLength: 200 }), { nil: undefined }),
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

  it('Property 1: Small data produces exactly three files', async () => {
    await fc.assert(
      fc.asyncProperty(
        projectMetadataArb,
        fc.array(domainNodeArb, { minLength: 1, maxLength: 3 }),
        async (project, domains) => {
          const bundle = mkBundle({ project, domains });
          await writeProjectOpsx(testDir, bundle);

          const opsxDir = path.join(testDir, 'openspec');
          const files = await fs.readdir(opsxDir);
          const opsxFiles = files.filter(f => f.startsWith('project.opsx'));
          expect(opsxFiles).toHaveLength(3);

          const result = await readProjectOpsx(testDir);
          expect(result).not.toBeNull();
          expect(result!.domains).toHaveLength(domains.length);
        },
      ),
      { numRuns: 30 },
    );
  });

  it('Property 2: Large data still produces exactly three files', async () => {
    await fc.assert(
      fc.asyncProperty(
        projectMetadataArb,
        fc.array(domainNodeArb, { minLength: 50, maxLength: 100 }),
        fc.array(capabilityNodeArb, { minLength: 50, maxLength: 100 }),
        async (project, domains, capabilities) => {
          const bundle = mkBundle({ project, domains, capabilities });
          await writeProjectOpsx(testDir, bundle);

          const opsxDir = path.join(testDir, 'openspec');
          const files = await fs.readdir(opsxDir);
          const opsxFiles = files.filter(f => f.startsWith('project.opsx'));
          expect(opsxFiles).toHaveLength(3);

          const result = await readProjectOpsx(testDir);
          expect(result).not.toBeNull();
          expect(result!.domains).toHaveLength(domains.length);
          expect(result!.capabilities).toHaveLength(capabilities.length);
        },
      ),
      { numRuns: 20 },
    );
  });

  it('Property 3: Data is always readable regardless of size', async () => {
    await fc.assert(
      fc.asyncProperty(
        projectMetadataArb,
        fc.array(domainNodeArb, { minLength: 1, maxLength: 50 }),
        async (project, domains) => {
          const bundle = mkBundle({ project, domains });
          await writeProjectOpsx(testDir, bundle);

          const result = await readProjectOpsx(testDir);
          expect(result).not.toBeNull();
          expect(result!.project.name).toBe(project.name);
          expect(result!.domains).toHaveLength(domains.length);
        },
      ),
      { numRuns: 30 },
    );
  });

  it('Property 4: Three-file layout preserves all data', async () => {
    await fc.assert(
      fc.asyncProperty(
        projectMetadataArb,
        fc.array(domainNodeArb, { minLength: 10, maxLength: 30 }),
        fc.array(capabilityNodeArb, { minLength: 10, maxLength: 30 }),
        async (project, domains, capabilities) => {
          const bundle = mkBundle({ project, domains, capabilities });
          await writeProjectOpsx(testDir, bundle);

          const result = await readProjectOpsx(testDir);
          expect(result).not.toBeNull();

          expect(result!.domains).toHaveLength(domains.length);
          const domainIds = new Set(domains.map(d => d.id));
          result!.domains.forEach(d => {
            expect(domainIds.has(d.id)).toBe(true);
          });

          expect(result!.capabilities).toHaveLength(capabilities.length);
          const capIds = new Set(capabilities.map(c => c.id));
          result!.capabilities.forEach(c => {
            expect(capIds.has(c.id)).toBe(true);
          });
        },
      ),
      { numRuns: 20 },
    );
  });
});
