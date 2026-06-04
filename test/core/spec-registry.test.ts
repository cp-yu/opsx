import { describe, expect, it } from 'vitest';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { buildSpecRegistry } from '../../src/core/spec-registry.js';

async function withTempDir(run: (dir: string) => Promise<void>) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-spec-registry-'));
  try {
    await run(dir);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

async function writeSpec(root: string, id: string, content: string) {
  const dir = path.join(root, 'openspec', 'specs', id);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, 'spec.md'), content, 'utf8');
}

const specWithCaps = (caps: string[]) => `---
capabilities:
${caps.map(cap => `  - ${cap}`).join('\n')}
---
# Test Spec

## Requirements
`;

describe('buildSpecRegistry', () => {
  it('builds sorted cap/spec mappings from frontmatter', async () => {
    await withTempDir(async root => {
      await writeSpec(root, 'cli-archive', specWithCaps(['cap.cli.archive', 'cap.change.archive']));
      await writeSpec(root, 'archive-verify-gate', specWithCaps(['cap.cli.archive']));

      const registry = await buildSpecRegistry(root);

      expect(registry.capToSpecs.get('cap.cli.archive')).toEqual(['archive-verify-gate', 'cli-archive']);
      expect(registry.capToSpecs.get('cap.change.archive')).toEqual(['cli-archive']);
      expect(registry.specToCaps.get('cli-archive')).toEqual(['cap.cli.archive', 'cap.change.archive']);
    });
  });

  it('skips unmapped specs in mappings and reports them as orphaned', async () => {
    await withTempDir(async root => {
      await writeSpec(root, 'mapped', specWithCaps(['cap.cli.archive']));
      await writeSpec(root, 'legacy-cleanup', '# Legacy\n\n## Requirements\n');

      const registry = await buildSpecRegistry(root);

      expect(registry.specToCaps.has('legacy-cleanup')).toBe(false);
      expect(registry.getOrphanedSpecs()).toEqual(['legacy-cleanup']);
      expect(registry.getSpecsForCap('cap.cli.archive')).toEqual(['mapped']);
    });
  });

  it('returns empty arrays for unknown ids and uncovered caps', async () => {
    await withTempDir(async root => {
      await writeSpec(root, 'mapped', specWithCaps(['cap.cli.archive']));

      const registry = await buildSpecRegistry(root);

      expect(registry.getSpecsForCap('cap.unknown')).toEqual([]);
      expect(registry.getCapsForSpec('unknown')).toEqual([]);
      expect(registry.getUncoveredCaps(['cap.cli.archive', 'cap.cli.spec'])).toEqual(['cap.cli.spec']);
    });
  });

  it('handles missing specs directory', async () => {
    await withTempDir(async root => {
      const registry = await buildSpecRegistry(root);

      expect(registry.capToSpecs.size).toBe(0);
      expect(registry.specToCaps.size).toBe(0);
      expect(registry.getOrphanedSpecs()).toEqual([]);
    });
  });
});
