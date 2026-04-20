import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { randomUUID } from 'crypto';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import {
  getBootstrapStatus,
  initBootstrap,
  mapChangedPathsToNodeIds,
  promoteBootstrap,
  refreshBootstrapDerivedArtifacts,
  readBootstrapState,
  type DomainMapFile,
} from '../../src/utils/bootstrap-utils.js';
import type { ProjectOpsxBundle } from '../../src/utils/opsx-utils.js';

describe('bootstrap refresh utilities', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = path.join(os.tmpdir(), `openspec-bootstrap-refresh-${randomUUID()}`);
    await fs.mkdir(path.join(testDir, 'openspec'), { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  async function writeFile(relativePath: string, content: string): Promise<void> {
    const filePath = path.join(testDir, relativePath);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content, 'utf-8');
  }

  async function writeFormalBaseline(): Promise<void> {
    await writeFile('src/auth/login.ts', 'export function login() { return true; }\n');
    await writeFile('src/auth/session.ts', 'export function session() { return true; }\n');
    await writeFile('openspec/specs/auth/spec.md', '# Auth\n');
    await writeFile('openspec/project.opsx.yaml', `schema_version: 1
project:
  id: proj.demo
  name: Demo
  intent: Existing formal intent
domains:
  - id: dom.auth
    type: domain
    intent: Existing auth boundary
capabilities:
  - id: cap.auth.login
    type: capability
    intent: Existing login capability
`);
    await writeFile('openspec/project.opsx.relations.yaml', `schema_version: 1
relations:
  - from: cap.auth.login
    to: dom.auth
    type: contains
`);
    await writeFile('openspec/project.opsx.code-map.yaml', `schema_version: 1
generated_at: "2026-04-18T00:00:00.000Z"
nodes:
  - id: cap.auth.login
    refs:
      - path: src/auth/login.ts
        line_start: 1
`);
  }

  async function writeRefreshInputs(mapFile: DomainMapFile): Promise<void> {
    await writeFile('openspec/bootstrap/evidence.yaml', `domains:
  - id: dom.auth
    confidence: high
    sources:
      - code:src/auth/login.ts
    intent: Authentication boundary
`);
    await writeFile(
      'openspec/bootstrap/domain-map/dom.auth.yaml',
      stringifyYaml(mapFile, { lineWidth: 0 })
    );
  }

  async function rewriteBootstrapMetadata(
    mutate: (metadata: Record<string, unknown>) => void
  ): Promise<void> {
    const metadataPath = path.join(testDir, 'openspec', 'bootstrap', '.bootstrap.yaml');
    const metadata = parseYaml(await fs.readFile(metadataPath, 'utf-8')) as Record<string, unknown>;
    mutate(metadata);
    await fs.writeFile(metadataPath, stringifyYaml(metadata, { lineWidth: 0 }), 'utf-8');
  }

  it('falls back to a full scan when refresh runs without git support', async () => {
    await writeFormalBaseline();
    await initBootstrap(testDir, { mode: 'refresh' });
    await writeRefreshInputs({
      domain: {
        id: 'dom.auth',
        type: 'domain',
        intent: 'Authentication boundary',
      },
      capabilities: [
        {
          id: 'cap.auth.login',
          type: 'capability',
          intent: 'Updated login capability',
          spec: {
            folder: 'auth',
            purpose: 'Authenticate a user.',
            requirements: [
              {
                title: 'User login',
                text: 'The system SHALL authenticate a user.',
                scenarios: [
                  {
                    title: 'Login succeeds',
                    steps: [
                      { keyword: 'WHEN', text: 'valid credentials are submitted' },
                      { keyword: 'THEN', text: 'access is granted' },
                    ],
                  },
                ],
              },
            ],
          },
        },
      ],
      relations: [
        { from: 'cap.auth.login', to: 'dom.auth', type: 'contains' },
      ],
      code_refs: [
        {
          id: 'cap.auth.login',
          refs: [{ path: 'src/auth/login.ts', line_start: 1 }],
        },
      ],
    });

    await refreshBootstrapDerivedArtifacts(testDir);

    const review = await fs.readFile(path.join(testDir, 'openspec', 'bootstrap', 'review.md'), 'utf-8');
    expect(review).toContain('full-scan-fallback');
    expect(review).toContain('Git 不可用');
  });

  it('fails refresh promote on spec conflicts before mutating formal outputs', async () => {
    await writeFormalBaseline();
    await initBootstrap(testDir, { mode: 'refresh' });
    await writeRefreshInputs({
      domain: {
        id: 'dom.auth',
        type: 'domain',
        intent: 'Authentication boundary',
      },
      capabilities: [
        {
          id: 'cap.auth.login',
          type: 'capability',
          intent: 'Existing login capability',
          spec: {
            folder: 'auth',
            purpose: 'Authenticate a user.',
            requirements: [
              {
                title: 'User login',
                text: 'The system SHALL authenticate a user.',
                scenarios: [
                  {
                    title: 'Login succeeds',
                    steps: [
                      { keyword: 'WHEN', text: 'valid credentials are submitted' },
                      { keyword: 'THEN', text: 'access is granted' },
                    ],
                  },
                ],
              },
            ],
          },
        },
        {
          id: 'cap.auth.session',
          type: 'capability',
          intent: 'Track user sessions',
          spec: {
            folder: 'auth',
            purpose: 'Track authenticated sessions.',
            requirements: [
              {
                title: 'Session tracking',
                text: 'The system SHALL track authenticated sessions.',
                scenarios: [
                  {
                    title: 'Session starts',
                    steps: [
                      { keyword: 'WHEN', text: 'a user signs in' },
                      { keyword: 'THEN', text: 'the session is recorded' },
                    ],
                  },
                ],
              },
            ],
          },
        },
      ],
      relations: [
        { from: 'cap.auth.login', to: 'dom.auth', type: 'contains' },
        { from: 'cap.auth.session', to: 'dom.auth', type: 'contains' },
      ],
      code_refs: [
        {
          id: 'cap.auth.login',
          refs: [{ path: 'src/auth/login.ts', line_start: 1 }],
        },
        {
          id: 'cap.auth.session',
          refs: [{ path: 'src/auth/session.ts', line_start: 1 }],
        },
      ],
    });

    const originalProjectOpsx = await fs.readFile(path.join(testDir, 'openspec', 'project.opsx.yaml'), 'utf-8');

    await refreshBootstrapDerivedArtifacts(testDir);
    await expect(promoteBootstrap(testDir)).rejects.toThrow('openspec/specs/auth/spec.md');
    await expect(fs.readFile(path.join(testDir, 'openspec', 'project.opsx.yaml'), 'utf-8')).resolves.toBe(originalProjectOpsx);
  });

  it('maps Windows-style changed paths to existing code-map refs', () => {
    const bundle: ProjectOpsxBundle = {
      schema_version: 1,
      project: {
        id: 'proj.demo',
        name: 'Demo',
      },
      domains: [
        {
          id: 'dom.auth',
          type: 'domain',
          intent: 'Authentication boundary',
        },
      ],
      capabilities: [
        {
          id: 'cap.auth.login',
          type: 'capability',
          intent: 'Authenticate a user',
        },
      ],
      relations: [
        {
          from: 'cap.auth.login',
          to: 'dom.auth',
          type: 'contains',
        },
      ],
      code_map: [
        {
          id: 'cap.auth.login',
          refs: [{ path: 'src/auth/login.ts', line_start: 1 }],
        },
      ],
    };

    const mapping = mapChangedPathsToNodeIds(testDir, bundle, ['SRC\\AUTH\\LOGIN.TS']);
    expect(mapping.mappedNodeIds).toEqual(['cap.auth.login']);
    expect(mapping.unmappedPaths).toEqual([]);
  });

  it('restarts a completed retained refresh workspace by snapshotting the old workspace and carrying forward stable inputs', async () => {
    await writeFormalBaseline();
    await initBootstrap(testDir, { mode: 'refresh' });

    await writeFile('openspec/bootstrap/evidence.yaml', 'domains: []\n');
    await writeFile('openspec/bootstrap/review.md', '# Review\n');
    await writeFile('openspec/bootstrap/candidate/project.opsx.yaml', 'schema_version: 1\nproject:\n  id: proj.demo\n  name: Demo\n');
    await writeFile('openspec/bootstrap/scope.yaml', stringifyYaml({
      mode: 'refresh',
      include: ['src/auth'],
      exclude: ['vendor'],
      granularity: 'fine',
    }, { lineWidth: 0 }));
    await rewriteBootstrapMetadata((metadata) => {
      metadata.phase = 'promote';
      metadata.completed_at = '2026-04-20T00:00:00.000Z';
      metadata.refresh_anchor_commit = 'abc123';
      metadata.source_fingerprint = 'source';
      metadata.candidate_fingerprint = 'candidate';
      metadata.review_fingerprint = 'review';
      metadata.candidate_spec_paths = ['openspec/bootstrap/candidate/specs/auth/spec.md'];
    });

    const result = await initBootstrap(testDir, { mode: 'refresh', restart: true });

    expect(result.restarted).toBe(true);
    expect(result.historyPath).toMatch(/^openspec[\\/]+bootstrap-history[\\/]+/);

    const historyRoot = path.join(testDir, 'openspec', 'bootstrap-history');
    const historyEntries = await fs.readdir(historyRoot);
    expect(historyEntries).toHaveLength(1);

    const historyDir = path.join(historyRoot, historyEntries[0]);
    await expect(fs.readFile(path.join(historyDir, 'review.md'), 'utf-8')).resolves.toContain('# Review');
    await expect(fs.readFile(path.join(historyDir, 'evidence.yaml'), 'utf-8')).resolves.toContain('domains: []');

    const state = await readBootstrapState(testDir);
    expect(state.metadata.phase).toBe('init');
    expect(state.metadata.completed_at).toBeNull();
    expect(state.metadata.refresh_anchor_commit).toBe('abc123');
    expect(state.metadata.source_fingerprint).toBeNull();
    expect(state.metadata.candidate_fingerprint).toBeNull();
    expect(state.metadata.review_fingerprint).toBeNull();
    expect(state.metadata.candidate_spec_paths).toEqual([]);
    expect(state.scope).toEqual({
      mode: 'refresh',
      include: ['src/auth'],
      exclude: ['vendor'],
      granularity: 'fine',
    });
    await expect(fs.access(path.join(testDir, 'openspec', 'bootstrap', 'review.md'))).rejects.toThrow();
    await expect(fs.access(path.join(testDir, 'openspec', 'bootstrap', 'evidence.yaml'))).rejects.toThrow();
  });

  it('infers legacy completed refresh workspaces from refresh anchors and preserves the anchor on restart', async () => {
    await writeFormalBaseline();
    await initBootstrap(testDir, { mode: 'refresh' });
    await rewriteBootstrapMetadata((metadata) => {
      metadata.phase = 'promote';
      metadata.refresh_anchor_commit = 'legacy-anchor';
      delete metadata.completed_at;
    });

    const status = await getBootstrapStatus(testDir);
    expect(status.initialized).toBe(true);
    if (!status.initialized) {
      throw new Error('Expected initialized bootstrap status');
    }
    expect(status.workspaceState).toBe('completed');
    expect(status.restartCommand).toBe('openspec bootstrap init --mode refresh --restart');

    await initBootstrap(testDir, { mode: 'refresh', restart: true });
    const restarted = await readBootstrapState(testDir);
    expect(restarted.metadata.refresh_anchor_commit).toBe('legacy-anchor');
    expect(restarted.metadata.completed_at).toBeNull();
  });

  it('allows restart from a legacy completed full workspace and falls back to a refresh run without an anchor', async () => {
    await initBootstrap(testDir, { mode: 'full' });
    await writeFormalBaseline();
    await rewriteBootstrapMetadata((metadata) => {
      metadata.phase = 'promote';
      delete metadata.completed_at;
      delete metadata.refresh_anchor_commit;
    });

    await initBootstrap(testDir, { mode: 'refresh', restart: true });
    const restarted = await readBootstrapState(testDir);
    expect(restarted.metadata.mode).toBe('refresh');
    expect(restarted.metadata.refresh_anchor_commit).toBeNull();
    expect(restarted.metadata.completed_at).toBeNull();
  });

  it('refuses restart for in-progress workspaces without moving the current workspace', async () => {
    await writeFormalBaseline();
    await initBootstrap(testDir, { mode: 'refresh' });
    await writeFile('openspec/bootstrap/review.md', '# In progress\n');

    await expect(initBootstrap(testDir, { mode: 'refresh', restart: true })).rejects.toThrow(
      '`--restart` only works after promote completes'
    );

    await expect(fs.readFile(path.join(testDir, 'openspec', 'bootstrap', 'review.md'), 'utf-8')).resolves.toContain('# In progress');
    await expect(fs.stat(path.join(testDir, 'openspec', 'bootstrap-history'))).rejects.toThrow();
  });
});
