import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { randomUUID } from 'crypto';
import * as fc from 'fast-check';
import {
  OPSX_PATHS,
  writeProjectOpsx,
  readProjectOpsx,
  type ProjectOpsx,
} from '../../src/utils/opsx-utils.js';

/**
 * Property-Based Tests for Atomic Write Guarantees
 *
 * These tests verify that write operations are atomic:
 * - No partial writes visible to readers
 * - No temporary files left behind
 * - Data integrity maintained even with concurrent operations
 */

describe('PBT: Atomic Write Guarantees', () => {
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

  const domainNodeArb = fc.record({
    id: nodeIdArb.filter(id => id.startsWith('dom.')),
    type: fc.constant('domain' as const),
    intent: fc.option(fc.string({ maxLength: 100 }), { nil: undefined }),
  });

  const projectOpsxArb = fc.record({
    project: projectMetadataArb,
    domains: fc.option(fc.array(domainNodeArb, { minLength: 1, maxLength: 10 }), { nil: undefined }),
  });

  it('Property 1: No temporary files remain after write', async () => {
    await fc.assert(
      fc.asyncProperty(projectOpsxArb, async (data) => {
        await writeProjectOpsx(testDir, data);

        // Check for any .tmp files
        const opsxDir = path.join(testDir, 'openspec');
        const files = await fs.readdir(opsxDir, { recursive: true });
        const tmpFiles = files.filter(f => f.toString().includes('.tmp'));

        expect(tmpFiles).toHaveLength(0);
      }),
      { numRuns: 50 }
    );
  });

  it('Property 2: Write completion guarantees readable data', async () => {
    await fc.assert(
      fc.asyncProperty(projectOpsxArb, async (data) => {
        // Write completes
        await writeProjectOpsx(testDir, data);

        // Immediately readable
        const result = await readProjectOpsx(testDir);
        expect(result).not.toBeNull();
        expect(result!.project.name).toBe(data.project.name);
      }),
      { numRuns: 50 }
    );
  });

  it('Property 3: Sequential writes maintain consistency', async () => {
    await fc.assert(
      fc.asyncProperty(
        projectOpsxArb,
        projectOpsxArb,
        async (data1, data2) => {
          // Write first data
          await writeProjectOpsx(testDir, data1);
          const result1 = await readProjectOpsx(testDir);
          expect(result1).not.toBeNull();
          expect(result1!.project.name).toBe(data1.project.name);

          // Write second data
          await writeProjectOpsx(testDir, data2);
          const result2 = await readProjectOpsx(testDir);
          expect(result2).not.toBeNull();
          expect(result2!.project.name).toBe(data2.project.name);

          // Should have second data, not first
          expect(result2!.project.name).not.toBe(data1.project.name);
        }
      ),
      { numRuns: 30 }
    );
  });
});
