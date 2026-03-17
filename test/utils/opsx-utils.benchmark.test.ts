import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { randomUUID } from 'crypto';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import {
  OPSX_PATHS,
  OPSX_SCHEMA_VERSION,
  validateReferentialIntegrity,
  validateCodeMapIntegrity,
  readProjectOpsx,
  writeProjectOpsx,
  type ProjectOpsxBundle,
} from '../../src/utils/opsx-utils.js';

function generateBundle(nodeCount: number): ProjectOpsxBundle {
  const domains = Array.from({ length: Math.ceil(nodeCount / 10) }, (_, i) => ({
    id: `dom.d${i}` as const,
    type: 'domain' as const,
    intent: `Domain ${i} intent description`,
  }));

  const capabilities = Array.from({ length: nodeCount }, (_, i) => ({
    id: `cap.d${i % domains.length}.c${i}` as const,
    type: 'capability' as const,
    intent: `Capability ${i} does something useful`,
    domain: domains[i % domains.length].id,
  }));

  const relations = capabilities.map((cap, i) => ({
    from: cap.id,
    to: domains[i % domains.length].id,
    type: 'contains' as const,
  }));

  const code_map = capabilities.map((cap) => ({
    id: cap.id,
    refs: [{ path: `src/${cap.id.replace(/\./g, '/')}.ts`, line_start: 1, line_end: 50 }],
  }));

  return {
    schema_version: OPSX_SCHEMA_VERSION,
    project: { id: 'bench', name: 'Benchmark Project' },
    domains,
    capabilities,
    relations,
    code_map,
  };
}
function measure(fn: () => void, iterations = 100): { avgMs: number; maxMs: number } {
  const times: number[] = [];
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    fn();
    times.push(performance.now() - start);
  }
  return {
    avgMs: times.reduce((a, b) => a + b, 0) / times.length,
    maxMs: Math.max(...times),
  };
}

async function measureAsync(fn: () => Promise<void>, iterations = 50): Promise<{ avgMs: number; maxMs: number }> {
  const times: number[] = [];
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    await fn();
    times.push(performance.now() - start);
  }
  return {
    avgMs: times.reduce((a, b) => a + b, 0) / times.length,
    maxMs: Math.max(...times),
  };
}

describe('opsx-utils performance benchmark', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = path.join(os.tmpdir(), `openspec-bench-${randomUUID()}`);
    await fs.mkdir(path.join(testDir, 'openspec'), { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('YAML parse', () => {
    const sizes = [10, 100, 500];

    for (const n of sizes) {
      it(`parses ${n}-node bundle under budget`, () => {
        const bundle = generateBundle(n);
        const yaml = stringifyYaml(bundle, { lineWidth: 0 });
        const { avgMs, maxMs } = measure(() => parseYaml(yaml));
        console.log(`  YAML parse ${n} nodes: avg=${avgMs.toFixed(2)}ms max=${maxMs.toFixed(2)}ms`);
        // Budget: 10-node <5ms, 100-node <50ms, 500-node <250ms
        expect(avgMs).toBeLessThan(n * 0.5);
      });
    }
  });

  describe('YAML serialize', () => {
    const sizes = [10, 100, 500];

    for (const n of sizes) {
      it(`serializes ${n}-node bundle under budget`, () => {
        const bundle = generateBundle(n);
        const { avgMs, maxMs } = measure(() => stringifyYaml(bundle, { lineWidth: 0 }));
        console.log(`  YAML serialize ${n} nodes: avg=${avgMs.toFixed(2)}ms max=${maxMs.toFixed(2)}ms`);
        expect(avgMs).toBeLessThan(n * 0.5);
      });
    }
  });

  describe('validation', () => {
    const sizes = [10, 100, 1000];

    for (const n of sizes) {
      it(`validates referential integrity for ${n} nodes under budget`, () => {
        const bundle = generateBundle(n);
        const { avgMs } = measure(() => validateReferentialIntegrity(bundle), 200);
        console.log(`  Referential integrity ${n} nodes: avg=${avgMs.toFixed(4)}ms`);
        // Validation is O(n), should be sub-millisecond for 1000 nodes
        expect(avgMs).toBeLessThan(n <= 100 ? 1 : 5);
      });

      it(`validates code-map integrity for ${n} nodes under budget`, () => {
        const bundle = generateBundle(n);
        const { avgMs } = measure(() => validateCodeMapIntegrity(bundle), 200);
        console.log(`  Code-map integrity ${n} nodes: avg=${avgMs.toFixed(4)}ms`);
        expect(avgMs).toBeLessThan(n <= 100 ? 1 : 5);
      });
    }
  });

  describe('atomic write + read round-trip', () => {
    const sizes = [10, 100, 500];

    for (const n of sizes) {
      it(`writes ${n}-node bundle atomically under budget`, async () => {
        const bundle = generateBundle(n);
        const { avgMs } = await measureAsync(() => writeProjectOpsx(testDir, bundle), 20);
        console.log(`  Atomic write ${n} nodes: avg=${avgMs.toFixed(2)}ms`);
        // I/O bound: 10-node <50ms, 100-node <100ms, 500-node <300ms
        expect(avgMs).toBeLessThan(n <= 10 ? 50 : n <= 100 ? 100 : 300);
      });

      it(`reads ${n}-node bundle under budget`, async () => {
        const bundle = generateBundle(n);
        await writeProjectOpsx(testDir, bundle);
        const { avgMs } = await measureAsync(async () => { await readProjectOpsx(testDir); }, 20);
        console.log(`  Read bundle ${n} nodes: avg=${avgMs.toFixed(2)}ms`);
        expect(avgMs).toBeLessThan(n <= 10 ? 50 : n <= 100 ? 100 : 300);
      });
    }
  });
});

