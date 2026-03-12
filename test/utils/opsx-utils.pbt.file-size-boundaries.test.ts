import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { randomUUID } from 'crypto';
import * as fc from 'fast-check';
import {
  OPSX_PATHS,
  OPSX_CONFIG,
  readProjectOpsx,
  writeProjectOpsx,
  type ProjectOpsx,
} from '../../src/utils/opsx-utils.js';

/**
 * Property-Based Tests for File Size Boundaries
 *
 * These tests verify that sharding logic correctly handles file size thresholds
 * and that data remains accessible regardless of sharding state.
 */

describe('PBT: File Size Boundaries', () => {
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
    intent: fc.option(fc.string({ minLength: 50, maxLength: 200 }), { nil: undefined }),
  });

  const capabilityNodeArb = fc.record({
    id: nodeIdArb.filter(id => id.startsWith('cap.')),
    type: fc.constant('capability' as const),
    intent: fc.option(fc.string({ minLength: 50, maxLength: 200 }), { nil: undefined }),
  });

  it('Property 1: Small data stays in single file', async () => {
    await fc.assert(
      fc.asyncProperty(
        projectMetadataArb,
        fc.array(domainNodeArb, { minLength: 1, maxLength: 3 }),
        async (project, domains) => {
          const data: ProjectOpsx = { project, domains };

          await writeProjectOpsx(testDir, data);

          // Should create single file
          const singleFilePath = path.join(testDir, OPSX_PATHS.SINGLE_FILE);
          const singleFileExists = await fs.access(singleFilePath).then(() => true).catch(() => false);
          expect(singleFileExists).toBe(true);

          // Should NOT create sharded directory
          const shardedDirPath = path.join(testDir, OPSX_PATHS.SHARDED_DIR);
          const shardedDirExists = await fs.access(shardedDirPath).then(() => true).catch(() => false);
          expect(shardedDirExists).toBe(false);

          // Data should be readable
          const result = await readProjectOpsx(testDir);
          expect(result).not.toBeNull();
          expect(result!.domains?.length).toBe(domains.length);
        }
      ),
      { numRuns: 30 }
    );
  });

  it('Property 2: Large data triggers sharding', async () => {
    await fc.assert(
      fc.asyncProperty(
        projectMetadataArb,
        fc.array(domainNodeArb, { minLength: 50, maxLength: 100 }),
        fc.array(capabilityNodeArb, { minLength: 50, maxLength: 100 }),
        async (project, domains, capabilities) => {
          const data: ProjectOpsx = { project, domains, capabilities };

          await writeProjectOpsx(testDir, data, { maxLines: 50 });

          // Should create sharded directory
          const shardedDirPath = path.join(testDir, OPSX_PATHS.SHARDED_DIR);
          const shardedDirExists = await fs.access(shardedDirPath).then(() => true).catch(() => false);
          expect(shardedDirExists).toBe(true);

          // Should have _meta.yaml
          const metaPath = path.join(testDir, OPSX_PATHS.SHARDED_META);
          const metaExists = await fs.access(metaPath).then(() => true).catch(() => false);
          expect(metaExists).toBe(true);

          // Data should be readable
          const result = await readProjectOpsx(testDir);
          expect(result).not.toBeNull();
          expect(result!.domains?.length).toBe(domains.length);
          expect(result!.capabilities?.length).toBe(capabilities.length);
        }
      ),
      { numRuns: 20 }
    );
  });

  it('Property 3: Data is readable regardless of sharding', async () => {
    await fc.assert(
      fc.asyncProperty(
        projectMetadataArb,
        fc.array(domainNodeArb, { minLength: 1, maxLength: 20 }),
        fc.integer({ min: 10, max: 200 }),
        async (project, domains, maxLines) => {
          const data: ProjectOpsx = { project, domains };

          // Write with custom threshold
          await writeProjectOpsx(testDir, data, { maxLines });

          // Should always be readable
          const result = await readProjectOpsx(testDir);
          expect(result).not.toBeNull();
          expect(result!.project.name).toBe(project.name);
          expect(result!.domains?.length).toBe(domains.length);
        }
      ),
      { numRuns: 30 }
    );
  });

  it('Property 4: Sharding preserves all data', async () => {
    await fc.assert(
      fc.asyncProperty(
        projectMetadataArb,
        fc.array(domainNodeArb, { minLength: 10, maxLength: 30 }),
        fc.array(capabilityNodeArb, { minLength: 10, maxLength: 30 }),
        async (project, domains, capabilities) => {
          const data: ProjectOpsx = { project, domains, capabilities };

          // Force sharding with low threshold
          await writeProjectOpsx(testDir, data, { maxLines: 20 });

          const result = await readProjectOpsx(testDir);
          expect(result).not.toBeNull();

          // All domains should be present
          expect(result!.domains?.length).toBe(domains.length);
          const domainIds = new Set(domains.map(d => d.id));
          result!.domains?.forEach(d => {
            expect(domainIds.has(d.id)).toBe(true);
          });

          // All capabilities should be present
          expect(result!.capabilities?.length).toBe(capabilities.length);
          const capIds = new Set(capabilities.map(c => c.id));
          result!.capabilities?.forEach(c => {
            expect(capIds.has(c.id)).toBe(true);
          });
        }
      ),
      { numRuns: 20 }
    );
  });
});
