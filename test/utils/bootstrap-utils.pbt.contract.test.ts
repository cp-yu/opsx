import { describe, expect, it } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import * as fc from 'fast-check';
import {
  BOOTSTRAP_BASELINE_TYPES,
  buildBootstrapPreInitStatus,
  getAllowedBootstrapModes,
  type BootstrapBaselineType,
} from '../../src/utils/bootstrap-utils.js';

const projectRoot = path.resolve(__dirname, '..', '..');

describe('PBT: Bootstrap mode contract', () => {
  it('Property 1: Allowed modes stay exclusive to approved baseline transitions', () => {
    fc.assert(
      fc.property(fc.constantFrom(...BOOTSTRAP_BASELINE_TYPES), (baseline) => {
        const modes = getAllowedBootstrapModes(baseline);

        if (baseline === 'no-spec') {
          expect(modes).toEqual(['full', 'opsx-first']);
          return;
        }

        if (baseline === 'specs-only') {
          expect(modes).toEqual(['full']);
          return;
        }

        expect(modes).toEqual([]);
      }),
      { numRuns: BOOTSTRAP_BASELINE_TYPES.length * 8 },
    );
  });

  it('Property 2: Pre-init status mirrors the same transition contract', () => {
    fc.assert(
      fc.property(fc.constantFrom(...BOOTSTRAP_BASELINE_TYPES), (baseline) => {
        const status = buildBootstrapPreInitStatus(baseline as BootstrapBaselineType);
        expect(status.allowedModes).toEqual(getAllowedBootstrapModes(baseline as BootstrapBaselineType));
        expect(status.supported).toBe(status.allowedModes.length > 0);
        expect(status.nextAction).toBe(status.supported ? 'init' : null);
      }),
      { numRuns: BOOTSTRAP_BASELINE_TYPES.length * 8 },
    );
  });
});

describe('Bootstrap contract parity', () => {
  it('keeps schema, workflow template, and docs on approved mode names', async () => {
    const [schema, workflow, docs] = await Promise.all([
      fs.readFile(path.join(projectRoot, 'schemas/bootstrap/schema.yaml'), 'utf-8'),
      fs.readFile(path.join(projectRoot, 'src/core/templates/workflows/bootstrap-opsx.ts'), 'utf-8'),
      fs.readFile(path.join(projectRoot, 'docs/opsx-bootstrap.md'), 'utf-8'),
    ]);

    for (const content of [schema, workflow, docs]) {
      expect(content).toContain('opsx-first');
      expect(content).toContain('full');
      expect(content).not.toContain('full|seed');
    }

    expect(schema).toContain('specs later');
    expect(workflow).toContain('specs later');
    expect(docs).toContain('normal change workflows');
  });
});
