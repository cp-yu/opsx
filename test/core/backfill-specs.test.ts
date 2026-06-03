import { describe, expect, it } from 'vitest';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { backfillSpecs, matchSpecToCaps, writeSpecFrontmatter } from '../../src/core/backfill-specs.js';

async function withTempDir(run: (dir: string) => Promise<void>) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-backfill-specs-'));
  try {
    await run(dir);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

async function writeProjectOpsx(root: string, capIds: string[]) {
  const openspecDir = path.join(root, 'openspec');
  await fs.mkdir(openspecDir, { recursive: true });
  await fs.writeFile(
    path.join(openspecDir, 'project.opsx.yaml'),
    [
      'schema_version: 1',
      'project:',
      '  id: proj.test',
      '  name: Test',
      'capabilities:',
      ...capIds.flatMap((capId) => [
        `  - id: ${capId}`,
        '    type: capability',
        '    intent: Test capability',
      ]),
      '',
    ].join('\n'),
    'utf-8'
  );
}

async function writeSpec(root: string, id: string, content: string) {
  const specDir = path.join(root, 'openspec', 'specs', id);
  await fs.mkdir(specDir, { recursive: true });
  await fs.writeFile(path.join(specDir, 'spec.md'), content, 'utf-8');
}

describe('matchSpecToCaps', () => {
  it('matches exact spec and capability segments', () => {
    expect(matchSpecToCaps('cli-archive', ['cap.cli.archive', 'cap.cli.validate'])).toEqual(['cap.cli.archive']);
  });

  it('matches fuzzy subsequences with normalized action names', () => {
    expect(matchSpecToCaps('change-creation', ['cap.change.create', 'cap.config.project'])).toEqual(['cap.change.create']);
  });

  it('returns empty results and supports one spec matching multiple caps', () => {
    expect(matchSpecToCaps('explore-brainstorming', ['cap.cli.archive'])).toEqual([]);
    expect(matchSpecToCaps('cli', ['cap.cli.archive', 'cap.cli.validate', 'cap.change.create'])).toEqual([
      'cap.cli.archive',
      'cap.cli.validate',
    ]);
  });
});

describe('writeSpecFrontmatter', () => {
  it('writes frontmatter without changing existing markdown content', async () => {
    await withTempDir(async (root) => {
      const specPath = path.join(root, 'openspec', 'specs', 'cli-archive', 'spec.md');
      const body = '# CLI Archive\n\n## Requirements\n';
      await fs.mkdir(path.dirname(specPath), { recursive: true });
      await fs.writeFile(specPath, body, 'utf-8');

      const written = await writeSpecFrontmatter(specPath, ['cap.cli.archive']);
      const content = await fs.readFile(specPath, 'utf-8');

      expect(written).toBe(true);
      expect(content).toBe(`---\ncapabilities:\n  - cap.cli.archive\n---\n${body}`);
    });
  });

  it('skips specs with existing frontmatter', async () => {
    await withTempDir(async (root) => {
      const specPath = path.join(root, 'openspec', 'specs', 'cli-archive', 'spec.md');
      const content = '---\ncapabilities:\n  - cap.cli.archive\n---\n# CLI Archive\n';
      await fs.mkdir(path.dirname(specPath), { recursive: true });
      await fs.writeFile(specPath, content, 'utf-8');

      const written = await writeSpecFrontmatter(specPath, ['cap.cli.validate']);

      expect(written).toBe(false);
      await expect(fs.readFile(specPath, 'utf-8')).resolves.toBe(content);
    });
  });
});

describe('backfillSpecs', () => {
  it('writes matched specs and reports unmatched specs', async () => {
    await withTempDir(async (root) => {
      await writeProjectOpsx(root, ['cap.cli.archive', 'cap.change.create']);
      await writeSpec(root, 'cli-archive', '# CLI Archive\n');
      await writeSpec(root, 'change-creation', '# Change Creation\n');
      await writeSpec(root, 'unknown-area', '# Unknown\n');

      const result = await backfillSpecs(root);

      expect(result).toEqual({
        written: [
          { spec: 'change-creation', caps: ['cap.change.create'] },
          { spec: 'cli-archive', caps: ['cap.cli.archive'] },
        ],
        unmatched: ['unknown-area'],
      });
      await expect(fs.readFile(path.join(root, 'openspec', 'specs', 'cli-archive', 'spec.md'), 'utf-8')).resolves.toContain(
        'capabilities:\n  - cap.cli.archive'
      );
    });
  });

  it('returns all specs as unmatched when OPSX is missing', async () => {
    await withTempDir(async (root) => {
      await writeSpec(root, 'cli-archive', '# CLI Archive\n');
      await writeSpec(root, 'change-creation', '# Change Creation\n');

      await expect(backfillSpecs(root)).resolves.toEqual({
        written: [],
        unmatched: ['change-creation', 'cli-archive'],
      });
    });
  });
});
