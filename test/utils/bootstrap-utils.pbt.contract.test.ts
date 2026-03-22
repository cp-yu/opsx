import { describe, expect, it } from 'vitest';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { randomUUID } from 'crypto';
import * as fc from 'fast-check';
import { stringify as stringifyYaml } from 'yaml';
import {
  BOOTSTRAP_BASELINE_TYPES,
  buildBootstrapPreInitStatus,
  getAllowedBootstrapModes,
  getBootstrapStatus,
  initBootstrap,
  promoteBootstrap,
  refreshBootstrapDerivedArtifacts,
  type BootstrapBaselineType,
} from '../../src/utils/bootstrap-utils.js';
import { Validator } from '../../src/core/validation/validator.js';

const projectRoot = path.resolve(__dirname, '..', '..');
const alphaStringArb = fc
  .array(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'), { minLength: 1, maxLength: 12 })
  .map((chars) => chars.join(''));

describe('PBT: Bootstrap mode contract', () => {
  it('Property 1: Allowed modes stay exclusive to approved baseline transitions', () => {
    fc.assert(
      fc.property(fc.constantFrom(...BOOTSTRAP_BASELINE_TYPES), (baseline) => {
        const modes = getAllowedBootstrapModes(baseline);

        if (baseline === 'raw') {
          expect(modes).toEqual(['full', 'opsx-first']);
          return;
        }

        if (baseline === 'specs-based') {
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

async function withTempProject<T>(fn: (projectDir: string) => Promise<T>): Promise<T> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-bootstrap-pbt-'));
  try {
    await fs.mkdir(path.join(dir, 'openspec'), { recursive: true });
    return await fn(dir);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

async function writeBootstrapEvidence(projectDir: string): Promise<void> {
  const evidence = `domains:
  - id: dom.pbt
    confidence: high
    sources:
      - code:src/pbt/index.ts
    intent: PBT domain
`;
  await fs.mkdir(path.join(projectDir, 'src', 'pbt'), { recursive: true });
  await fs.writeFile(path.join(projectDir, 'src', 'pbt', 'index.ts'), 'export {};\n', 'utf-8');
  await fs.writeFile(path.join(projectDir, 'openspec', 'bootstrap', 'evidence.yaml'), evidence, 'utf-8');
}

async function writeBootstrapDomainMap(
  projectDir: string,
  options: { capabilityCount: number; includeSpec: boolean; requirementSalt: string }
): Promise<string[]> {
  const capabilities: any[] = [];
  const relations: any[] = [];
  const code_refs: any[] = [];
  const folders: string[] = [];

  await fs.mkdir(path.join(projectDir, 'src', 'pbt'), { recursive: true });

  for (let idx = 0; idx < options.capabilityCount; idx += 1) {
    const capId = `cap.pbt.cap${idx}`;
    const folder = `cap${idx}`;
    folders.push(folder);

    const spec = options.includeSpec
      ? {
          folder,
          purpose: `PBT purpose ${idx}`,
          requirements: [
            {
              title: `PBT requirement ${idx}`,
              text: `The system SHALL satisfy ${capId} ${options.requirementSalt}.`,
              scenarios: [
                {
                  title: 'Happy path',
                  steps: [
                    { keyword: 'WHEN', text: `${capId} runs` },
                    { keyword: 'THEN', text: `${capId} succeeds` },
                  ],
                },
              ],
            },
          ],
        }
      : undefined;

    capabilities.push({
      id: capId,
      type: 'capability',
      intent: `PBT capability ${idx}`,
      ...(spec ? { spec } : {}),
    });

    relations.push({ from: capId, to: 'dom.pbt', type: 'contains' });
    code_refs.push({
      id: capId,
      refs: [{ path: `src/pbt/${capId}.ts`, line_start: 1 }],
    });

    await fs.writeFile(path.join(projectDir, 'src', 'pbt', `${capId}.ts`), 'export {};\n', 'utf-8');
  }

  const map = {
    domain: { id: 'dom.pbt', type: 'domain', intent: 'PBT domain' },
    capabilities,
    relations,
    code_refs,
  };
  await fs.writeFile(
    path.join(projectDir, 'openspec', 'bootstrap', 'domain-map', 'dom.pbt.yaml'),
    stringifyYaml(map, { lineWidth: 0 }),
    'utf-8'
  );

  return folders;
}

async function checkAllReviewBoxes(projectDir: string): Promise<void> {
  const reviewPath = path.join(projectDir, 'openspec', 'bootstrap', 'review.md');
  const content = await fs.readFile(reviewPath, 'utf-8');
  await fs.writeFile(reviewPath, content.replace(/- \[ \]/g, '- [x]'), 'utf-8');
}

describe('PBT: Bootstrap candidate specs contract', () => {
  it('Property: full completeness (raw + full promotes one formal spec per capability)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 3 }),
        alphaStringArb,
        async (capabilityCount, salt) => {
          await withTempProject(async (projectDir) => {
            await initBootstrap(projectDir, { mode: 'full' });
            await writeBootstrapEvidence(projectDir);
            const folders = await writeBootstrapDomainMap(projectDir, {
              capabilityCount,
              includeSpec: true,
              requirementSalt: salt || randomUUID(),
            });

            await refreshBootstrapDerivedArtifacts(projectDir);
            await checkAllReviewBoxes(projectDir);

            await promoteBootstrap(projectDir);

            const validator = new Validator(false);
            for (const folder of folders) {
              const formalPath = path.join(projectDir, 'openspec', 'specs', folder, 'spec.md');
              const content = await fs.readFile(formalPath, 'utf-8');
              const report = await validator.validateSpecContent(folder, content);
              expect(report.valid).toBe(true);
            }

            await expect(fs.access(path.join(projectDir, 'openspec', 'specs', 'README.md'))).rejects.toThrow();
          });
        }
      ),
      { numRuns: 12 },
    );
  }, 60000);

  it('Property: opsx-first exclusivity (raw + opsx-first writes README-only starter and no spec.md)', async () => {
    await fc.assert(
      fc.asyncProperty(fc.integer({ min: 1, max: 3 }), async (capabilityCount) => {
        await withTempProject(async (projectDir) => {
          await initBootstrap(projectDir, { mode: 'opsx-first' });
          await writeBootstrapEvidence(projectDir);
          await writeBootstrapDomainMap(projectDir, {
            capabilityCount,
            includeSpec: false,
            requirementSalt: randomUUID(),
          });

          await refreshBootstrapDerivedArtifacts(projectDir);
          await checkAllReviewBoxes(projectDir);

          await promoteBootstrap(projectDir);

          const specsDir = path.join(projectDir, 'openspec', 'specs');
          const entries = await fs.readdir(specsDir, { withFileTypes: true });
          expect(entries.some((e) => e.isDirectory())).toBe(false);
          expect(entries.filter((e) => e.isFile()).map((e) => e.name).sort()).toEqual(['README.md']);
        });
      }),
      { numRuns: 10 },
    );
  }, 60000);

  it('Property: stale coherence (spec source edits invalidate current review)', async () => {
    await fc.assert(
      fc.asyncProperty(
        alphaStringArb,
        async (salt) => {
          await withTempProject(async (projectDir) => {
            await initBootstrap(projectDir, { mode: 'full' });
            await writeBootstrapEvidence(projectDir);
            await writeBootstrapDomainMap(projectDir, {
              capabilityCount: 1,
              includeSpec: true,
              requirementSalt: 'seed',
            });

            await refreshBootstrapDerivedArtifacts(projectDir);

            const before = await getBootstrapStatus(projectDir);
            expect(before.initialized).toBe(true);
            if (!before.initialized) {
              throw new Error('Expected initialized bootstrap status');
            }
            expect(before.reviewState).toBe('current');

            await writeBootstrapDomainMap(projectDir, {
              capabilityCount: 1,
              includeSpec: true,
              requirementSalt: `seed-${salt}`,
            });

            const after = await getBootstrapStatus(projectDir);
            expect(after.initialized).toBe(true);
            if (!after.initialized) {
              throw new Error('Expected initialized bootstrap status');
            }
            expect(after.reviewState).toBe('stale');
          });
        }
      ),
      { numRuns: 12 },
    );
  }, 60000);

  it('Property: refresh idempotence (no source change => no candidate rewrite)', async () => {
    await fc.assert(
      fc.asyncProperty(fc.integer({ min: 1, max: 3 }), async (capabilityCount) => {
        await withTempProject(async (projectDir) => {
          await initBootstrap(projectDir, { mode: 'full' });
          await writeBootstrapEvidence(projectDir);
          const folders = await writeBootstrapDomainMap(projectDir, {
            capabilityCount,
            includeSpec: true,
            requirementSalt: randomUUID(),
          });

          const first = await refreshBootstrapDerivedArtifacts(projectDir);
          expect(first.candidateUpdated).toBe(true);

          const candidateFiles = [
            path.join(projectDir, 'openspec', 'bootstrap', 'candidate', 'project.opsx.yaml'),
            path.join(projectDir, 'openspec', 'bootstrap', 'candidate', 'project.opsx.relations.yaml'),
            path.join(projectDir, 'openspec', 'bootstrap', 'candidate', 'project.opsx.code-map.yaml'),
            ...folders.map((folder) =>
              path.join(projectDir, 'openspec', 'bootstrap', 'candidate', 'specs', folder, 'spec.md')
            ),
          ];

          const firstContent = await Promise.all(candidateFiles.map((file) => fs.readFile(file, 'utf-8')));
          const second = await refreshBootstrapDerivedArtifacts(projectDir);
          expect(second.candidateUpdated).toBe(false);
          expect(second.reviewUpdated).toBe(false);
          const secondContent = await Promise.all(candidateFiles.map((file) => fs.readFile(file, 'utf-8')));

          expect(secondContent).toEqual(firstContent);
        });
      }),
      { numRuns: 10 },
    );
  }, 60000);
});
