import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { randomUUID } from 'crypto';
import * as fc from 'fast-check';
import {
  readProjectOpsx,
  writeProjectOpsx,
  type ProjectOpsx,
} from '../../src/utils/opsx-utils.js';

/**
 * Property-Based Tests for Merge Idempotency
 *
 * These tests verify that merging operations are idempotent:
 * applying the same merge multiple times produces the same result.
 */

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
    name: fc.string({ minLength: 1, maxLength: 50 }),
    version: fc.string({ minLength: 1, maxLength: 20 }),
  });

  const nodeIdArb = fc.oneof(
    fc.constantFrom('cap', 'dom', 'inv', 'ifc', 'dec', 'evd')
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

  const projectOpsxArb = fc.record({
    project: projectMetadataArb,
    domains: fc.option(fc.array(domainNodeArb, { minLength: 0, maxLength: 5 }), { nil: undefined }),
    capabilities: fc.option(fc.array(capabilityNodeArb, { minLength: 0, maxLength: 5 }), { nil: undefined }),
  });

  it('Property 1: Writing same data twice produces identical result', async () => {
    await fc.assert(
      fc.asyncProperty(projectOpsxArb, async (data) => {
        // Write once
        await writeProjectOpsx(testDir, data);
        const result1 = await readProjectOpsx(testDir);

        // Write again with same data
        await writeProjectOpsx(testDir, data);
        const result2 = await readProjectOpsx(testDir);

        // Results should be identical
        expect(result1).not.toBeNull();
        expect(result2).not.toBeNull();
        expect(JSON.stringify(result1)).toBe(JSON.stringify(result2));
      }),
      { numRuns: 50 }
    );
  });

  it('Property 2: Read-write-read cycle preserves data', async () => {
    await fc.assert(
      fc.asyncProperty(projectOpsxArb, async (original) => {
        // Write original
        await writeProjectOpsx(testDir, original);

        // Read back
        const read1 = await readProjectOpsx(testDir);
        expect(read1).not.toBeNull();

        // Write what we read
        await writeProjectOpsx(testDir, read1!);

        // Read again
        const read2 = await readProjectOpsx(testDir);
        expect(read2).not.toBeNull();

        // Should be identical
        expect(JSON.stringify(read1)).toBe(JSON.stringify(read2));
      }),
      { numRuns: 50 }
    );
  });

  it('Property 3: Multiple writes with same data are idempotent', async () => {
    await fc.assert(
      fc.asyncProperty(projectOpsxArb, async (data) => {
        // Write multiple times
        await writeProjectOpsx(testDir, data);
        await writeProjectOpsx(testDir, data);
        await writeProjectOpsx(testDir, data);

        const result = await readProjectOpsx(testDir);
        expect(result).not.toBeNull();

        // Should match original structure
        expect(result!.project.name).toBe(data.project.name);
        expect(result!.project.version).toBe(data.project.version);

        if (data.domains) {
          expect(result!.domains?.length).toBe(data.domains.length);
        }
        if (data.capabilities) {
          expect(result!.capabilities?.length).toBe(data.capabilities.length);
        }
      }),
      { numRuns: 50 }
    );
  });
});
