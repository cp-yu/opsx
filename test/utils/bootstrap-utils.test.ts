import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { randomUUID } from 'crypto';
import {
  BOOTSTRAP_WORKSPACE_RETAINED_NOTICE,
  getBootstrapStatus,
  initBootstrap,
  promoteBootstrap,
  refreshBootstrapDerivedArtifacts,
  readBootstrapState,
  validateGate,
} from '../../src/utils/bootstrap-utils.js';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';

describe('bootstrap-utils invalid domain-map handling', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = path.join(os.tmpdir(), `openspec-bootstrap-utils-${randomUUID()}`);
    await fs.mkdir(path.join(testDir, 'openspec'), { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  async function writeEvidence(domains: string[]): Promise<void> {
    const content = [
      'domains:',
      ...domains.flatMap((domainId, index) => [
        `  - id: ${domainId}`,
        `    confidence: ${index === 0 ? 'high' : index === 1 ? 'medium' : 'low'}`,
        '    sources:',
        `      - code:src/${domainId.replace('dom.', '')}/index.ts`,
        `    intent: ${domainId} intent`,
      ]),
      '',
    ].join('\n');

    await fs.writeFile(path.join(testDir, 'openspec', 'bootstrap', 'evidence.yaml'), content, 'utf-8');
  }

  async function writeScope(scope: {
    mode?: 'full' | 'opsx-first' | 'seed';
    include?: string[];
    exclude?: string[];
    granularity?: 'coarse' | 'fine';
  }): Promise<void> {
    await fs.writeFile(
      path.join(testDir, 'openspec', 'bootstrap', 'scope.yaml'),
      stringifyYaml({
        mode: scope.mode ?? 'full',
        include: scope.include ?? [],
        exclude: scope.exclude ?? [],
        granularity: scope.granularity ?? 'coarse',
      }),
      'utf-8'
    );
  }

  async function writeDomainMap(options: {
    domainId: string;
    capabilityId?: string;
    folder?: string;
    requirementText?: string;
    whenText?: string;
    thenText?: string;
    extraSteps?: Array<{ keyword: 'GIVEN' | 'WHEN' | 'THEN' | 'AND'; text: string }>;
  }): Promise<void> {
    const domainId = options.domainId;
    const capabilityId = options.capabilityId ?? `cap.${domainId.slice(4)}.work`;
    const domainSuffix = domainId.replace('dom.', '');
    const folder = options.folder ?? domainSuffix;
    const requirementText = options.requirementText ?? `The system SHALL support ${capabilityId}.`;
    const whenText = options.whenText ?? `${capabilityId} is invoked`;
    const thenText = options.thenText ?? `${capabilityId} succeeds`;

    const filePath = path.join(testDir, 'openspec', 'bootstrap', 'domain-map', `${domainId}.yaml`);
    const content = stringifyYaml(
      {
        domain: {
          id: domainId,
          type: 'domain',
          intent: `${domainId} boundary`,
        },
        capabilities: [
          {
            id: capabilityId,
            type: 'capability',
            intent: `${capabilityId} intent`,
            spec: {
              folder,
              purpose: `${capabilityId} purpose`,
              requirements: [
                {
                  title: `${capabilityId} requirement`,
                  text: requirementText,
                  scenarios: [
                    {
                      title: 'Basic flow',
                      steps: [
                        { keyword: 'WHEN', text: whenText },
                        { keyword: 'THEN', text: thenText },
                        ...(options.extraSteps ?? []),
                      ],
                    },
                  ],
                },
              ],
            },
          },
        ],
        relations: [
          {
            from: capabilityId,
            to: domainId,
            type: 'contains',
          },
        ],
        code_refs: [
          {
            id: capabilityId,
            refs: [
              {
                path: `src/${domainSuffix}/index.ts`,
                line_start: 1,
              },
            ],
          },
        ],
      },
      { lineWidth: 0 }
    );

    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.mkdir(path.join(testDir, 'src', domainSuffix), { recursive: true });
    await fs.writeFile(path.join(testDir, 'src', domainSuffix, 'index.ts'), 'export {};\n', 'utf-8');
    await fs.writeFile(filePath, content, 'utf-8');
  }

  async function writeValidDomainMap(domainId: string, capabilityId = `cap.${domainId.slice(4)}.work`): Promise<void> {
    const filePath = path.join(testDir, 'openspec', 'bootstrap', 'domain-map', `${domainId}.yaml`);
    void filePath;
    await writeDomainMap({ domainId, capabilityId });
  }

  async function writeInvalidDomainMap(domainId: string): Promise<void> {
    const filePath = path.join(testDir, 'openspec', 'bootstrap', 'domain-map', `${domainId}.yaml`);
    const content = `domain:
  id: ${domainId}
capabilities:
  - id: invalid-capability
    type: capability
    intent: broken capability
`;
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content, 'utf-8');
  }

  async function approveReview(): Promise<void> {
    const reviewPath = path.join(testDir, 'openspec', 'bootstrap', 'review.md');
    const review = await fs.readFile(reviewPath, 'utf-8');
    await fs.writeFile(reviewPath, review.replace(/- \[ \]/g, '- [x]'), 'utf-8');
  }

  function getDomain(status: Extract<Awaited<ReturnType<typeof getBootstrapStatus>>, { initialized: true }>, domainId: string) {
    const domain = status.domains.find((entry) => entry.id === domainId);
    expect(domain).toBeDefined();
    return domain!;
  }

  it('distinguishes valid, missing, and invalid domain-map states in bootstrap status', async () => {
    await initBootstrap(testDir, { mode: 'full' });
    await writeEvidence(['dom.auth', 'dom.billing', 'dom.docs']);
    await writeValidDomainMap('dom.auth');
    await writeInvalidDomainMap('dom.billing');

    const status = await getBootstrapStatus(testDir);
    expect(status.initialized).toBe(true);
    if (!status.initialized) {
      throw new Error('Expected initialized bootstrap status');
    }

    const validDomain = getDomain(status, 'dom.auth');
    expect(validDomain.mapState).toBe('valid');
    expect(validDomain.mapped).toBe(true);
    expect(validDomain.capabilityCount).toBe(1);

    const invalidDomain = getDomain(status, 'dom.billing');
    expect(invalidDomain.mapState).toBe('invalid');
    expect(invalidDomain.mapped).toBe(false);
    expect(invalidDomain.mapError).toContain('Invalid input');

    const missingDomain = getDomain(status, 'dom.docs');
    expect(missingDomain.mapState).toBe('missing');
    expect(missingDomain.mapped).toBe(false);
    expect(missingDomain.mapError).toBeUndefined();
  });

  it('fails map_to_review and downgrades derived artifacts to stale when a domain-map becomes invalid', async () => {
    await initBootstrap(testDir, { mode: 'full' });
    await writeEvidence(['dom.auth']);
    await writeValidDomainMap('dom.auth');

    await refreshBootstrapDerivedArtifacts(testDir);
    let status = await getBootstrapStatus(testDir);
    expect(status.initialized).toBe(true);
    if (!status.initialized) {
      throw new Error('Expected initialized bootstrap status');
    }
    expect(status.candidateState).toBe('current');
    expect(status.reviewState).toBe('current');

    await writeInvalidDomainMap('dom.auth');

    const gate = await validateGate(testDir, 'map_to_review');
    expect(gate.passed).toBe(false);
    expect(gate.errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining("Domain 'dom.auth' has invalid domain-map: dom.auth.yaml"),
      ])
    );
    expect(gate.errors.join('\n')).not.toContain('has no domain-map file');

    status = await getBootstrapStatus(testDir);
    expect(status.initialized).toBe(true);
    if (!status.initialized) {
      throw new Error('Expected initialized bootstrap status');
    }
    expect(status.candidateState).toBe('stale');
    expect(status.reviewState).toBe('stale');
    expect(getDomain(status, 'dom.auth').mapState).toBe('invalid');

    await expect(promoteBootstrap(testDir)).rejects.toThrow('Cannot promote: gate validation failed.');
  });

  it('normalizes legacy seed mode to canonical opsx-first when reading bootstrap state', async () => {
    await fs.mkdir(path.join(testDir, 'openspec', 'bootstrap'), { recursive: true });
    await fs.writeFile(
      path.join(testDir, 'openspec', 'bootstrap', '.bootstrap.yaml'),
      stringifyYaml({
        phase: 'init',
        baseline_type: 'raw',
        mode: 'seed',
        created_at: '2026-03-20T00:00:00.000Z',
      }),
      'utf-8'
    );
    await fs.writeFile(
      path.join(testDir, 'openspec', 'bootstrap', 'scope.yaml'),
      stringifyYaml({
        mode: 'seed',
        include: [],
        exclude: [],
        granularity: 'coarse',
      }),
      'utf-8'
    );

    const state = await readBootstrapState(testDir);
    expect(state.metadata.mode).toBe('opsx-first');
    expect(state.scope?.mode).toBe('opsx-first');
  });

  it('fails fast when specs-based full would generate into an existing spec path without preserve_existing', async () => {
    await fs.mkdir(path.join(testDir, 'openspec', 'specs', 'auth'), { recursive: true });
    await fs.writeFile(path.join(testDir, 'openspec', 'specs', 'auth', 'spec.md'), '# Existing auth spec\n', 'utf-8');

    await initBootstrap(testDir, { mode: 'full' });
    await writeEvidence(['dom.auth']);

    const filePath = path.join(testDir, 'openspec', 'bootstrap', 'domain-map', 'dom.auth.yaml');
    const content = `domain:
  id: dom.auth
  type: domain
  intent: dom.auth boundary
capabilities:
  - id: cap.auth.login
    type: capability
    intent: cap.auth.login intent
    spec:
      folder: auth
      purpose: cap.auth.login purpose
      requirements:
        - title: cap.auth.login requirement
          text: The system SHALL support cap.auth.login.
          scenarios:
            - title: Basic flow
              steps:
                - keyword: WHEN
                  text: cap.auth.login is invoked
                - keyword: THEN
                  text: cap.auth.login succeeds
relations:
  - from: cap.auth.login
    to: dom.auth
    type: contains
code_refs:
  - id: cap.auth.login
    refs:
      - path: src/auth/index.ts
        line_start: 1
`;
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.mkdir(path.join(testDir, 'src', 'auth'), { recursive: true });
    await fs.writeFile(path.join(testDir, 'src', 'auth', 'index.ts'), 'export {};\n', 'utf-8');
    await fs.writeFile(filePath, content, 'utf-8');

    const gate = await validateGate(testDir, 'map_to_review');
    expect(gate.passed).toBe(false);
    expect(gate.errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining("Capability 'cap.auth.login' maps to existing spec path 'openspec/specs/auth/spec.md'"),
      ])
    );
  });

  it('marks candidate and review stale when a requirement text change alters candidate spec content', async () => {
    await initBootstrap(testDir, { mode: 'full' });
    await writeEvidence(['dom.auth']);
    await writeValidDomainMap('dom.auth');

    await refreshBootstrapDerivedArtifacts(testDir);
    let status = await getBootstrapStatus(testDir);
    expect(status.initialized).toBe(true);
    if (!status.initialized) {
      throw new Error('Expected initialized bootstrap status');
    }
    expect(status.candidateState).toBe('current');
    expect(status.reviewState).toBe('current');

    await writeDomainMap({
      domainId: 'dom.auth',
      requirementText: 'The system SHALL support cap.auth.work with MFA.',
    });

    status = await getBootstrapStatus(testDir);
    expect(status.initialized).toBe(true);
    if (!status.initialized) {
      throw new Error('Expected initialized bootstrap status');
    }
    expect(status.candidateState).toBe('stale');
    expect(status.reviewState).toBe('stale');
  });

  it('marks candidate and review stale when scenario steps change', async () => {
    await initBootstrap(testDir, { mode: 'full' });
    await writeEvidence(['dom.auth']);
    await writeValidDomainMap('dom.auth');

    await refreshBootstrapDerivedArtifacts(testDir);
    let status = await getBootstrapStatus(testDir);
    expect(status.initialized).toBe(true);
    if (!status.initialized) {
      throw new Error('Expected initialized bootstrap status');
    }
    expect(status.candidateState).toBe('current');
    expect(status.reviewState).toBe('current');

    await writeDomainMap({
      domainId: 'dom.auth',
      thenText: 'cap.auth.work succeeds and returns a stable session',
      extraSteps: [{ keyword: 'AND', text: 'an audit event is recorded' }],
    });

    status = await getBootstrapStatus(testDir);
    expect(status.initialized).toBe(true);
    if (!status.initialized) {
      throw new Error('Expected initialized bootstrap status');
    }
    expect(status.candidateState).toBe('stale');
    expect(status.reviewState).toBe('stale');
  });

  it('marks candidate and review stale when spec folder mapping changes (spec-path change)', async () => {
    await initBootstrap(testDir, { mode: 'full' });
    await writeEvidence(['dom.auth']);
    await writeValidDomainMap('dom.auth');

    await refreshBootstrapDerivedArtifacts(testDir);
    let status = await getBootstrapStatus(testDir);
    expect(status.initialized).toBe(true);
    if (!status.initialized) {
      throw new Error('Expected initialized bootstrap status');
    }
    expect(status.candidateState).toBe('current');
    expect(status.reviewState).toBe('current');

    await writeDomainMap({
      domainId: 'dom.auth',
      folder: 'auth2',
    });

    status = await getBootstrapStatus(testDir);
    expect(status.initialized).toBe(true);
    if (!status.initialized) {
      throw new Error('Expected initialized bootstrap status');
    }
    expect(status.candidateState).toBe('stale');
    expect(status.reviewState).toBe('stale');
  });

  it('writes candidate spec files to cross-platform joined paths', async () => {
    await initBootstrap(testDir, { mode: 'full' });
    await writeEvidence(['dom.auth']);
    await writeValidDomainMap('dom.auth');

    await refreshBootstrapDerivedArtifacts(testDir);

    await expect(
      fs.readFile(path.join(testDir, 'openspec', 'bootstrap', 'candidate', 'specs', 'auth', 'spec.md'), 'utf-8')
    ).resolves.toContain('# Spec: auth');
  });

  it('rejects spec folders that embed path separators (Windows/posix)', async () => {
    await initBootstrap(testDir, { mode: 'full' });
    await writeEvidence(['dom.auth']);

    // This should be treated as an invalid domain-map, not a missing one.
    await writeDomainMap({ domainId: 'dom.auth', folder: 'auth/login' });
    const gate = await validateGate(testDir, 'map_to_review');
    expect(gate.passed).toBe(false);
    expect(gate.errors).toEqual(
      expect.arrayContaining([expect.stringContaining("Domain 'dom.auth' has invalid domain-map: dom.auth.yaml")])
    );

    await writeDomainMap({ domainId: 'dom.auth', folder: 'auth\\\\login' });
    const gate2 = await validateGate(testDir, 'map_to_review');
    expect(gate2.passed).toBe(false);
    expect(gate2.errors).toEqual(
      expect.arrayContaining([expect.stringContaining("Domain 'dom.auth' has invalid domain-map: dom.auth.yaml")])
    );
  });

  it('derives bootstrap project metadata from workspace inputs instead of package manifests', async () => {
    await fs.writeFile(
      path.join(testDir, 'package.json'),
      JSON.stringify({
        name: '@acme/manifest-name',
        description: 'Manifest description that must not become project metadata',
      }, null, 2),
      'utf-8'
    );

    await initBootstrap(testDir, { mode: 'full' });
    await writeScope({
      mode: 'full',
      include: ['src', 'docs'],
      exclude: ['vendor'],
    });
    await writeEvidence(['dom.auth', 'dom.cli']);
    await writeDomainMap({
      domainId: 'dom.auth',
      capabilityId: 'cap.auth.login',
    });
    await writeDomainMap({
      domainId: 'dom.cli',
      capabilityId: 'cap.cli.run',
    });

    await refreshBootstrapDerivedArtifacts(testDir);

    const candidate = parseYaml(
      await fs.readFile(path.join(testDir, 'openspec', 'bootstrap', 'candidate', 'project.opsx.yaml'), 'utf-8')
    ) as {
      project: {
        id: string;
        name: string;
        intent?: string;
        scope?: string;
      };
    };

    expect(candidate.project.id).toBe('project');
    expect(candidate.project.name).toBe('Project');
    expect(candidate.project.intent).toContain('dom.auth boundary');
    expect(candidate.project.intent).toContain('dom.cli boundary');
    expect(candidate.project.intent).not.toContain('Manifest description');
    expect(candidate.project.scope).toContain('mode=full');
    expect(candidate.project.scope).toContain('include=src, docs');
    expect(candidate.project.scope).toContain('exclude=vendor');
    expect(candidate.project.scope).toContain('mapped domains=dom.auth, dom.cli');
  });

  it('leaves bootstrap project intent and scope undefined when workspace inputs are insufficient', async () => {
    await initBootstrap(testDir, { mode: 'full' });
    await fs.writeFile(
      path.join(testDir, 'openspec', 'bootstrap', 'evidence.yaml'),
      stringifyYaml({
        domains: [
          {
            id: 'dom.auth',
            confidence: 'high',
            sources: ['code:src/auth/index.ts'],
            intent: '',
          },
        ],
      }),
      'utf-8'
    );

    await refreshBootstrapDerivedArtifacts(testDir);

    const candidate = parseYaml(
      await fs.readFile(path.join(testDir, 'openspec', 'bootstrap', 'candidate', 'project.opsx.yaml'), 'utf-8')
    ) as { project: Record<string, unknown> };

    expect(candidate.project.intent).toBeUndefined();
    expect(candidate.project.scope).toBeUndefined();
  });

  it('keeps existing formal OPSX files unchanged when bootstrap is unsupported for formal baselines', async () => {
    const originalProjectOpsx = `schema_version: 1
project:
  id: proj.demo
  name: Demo
  intent: Existing formal intent
`;

    await fs.writeFile(path.join(testDir, 'openspec', 'project.opsx.yaml'), originalProjectOpsx, 'utf-8');
    await fs.writeFile(path.join(testDir, 'openspec', 'project.opsx.relations.yaml'), 'schema_version: 1\nrelations: []\n', 'utf-8');
    await fs.writeFile(path.join(testDir, 'openspec', 'project.opsx.code-map.yaml'), 'schema_version: 1\nnodes: []\n', 'utf-8');

    await expect(initBootstrap(testDir, { mode: 'full' })).rejects.toThrow('existing formal OPSX files');
    await expect(fs.readFile(path.join(testDir, 'openspec', 'project.opsx.yaml'), 'utf-8')).resolves.toBe(originalProjectOpsx);
    await expect(fs.stat(path.join(testDir, 'openspec', 'bootstrap'))).rejects.toThrow();
  });

  it('retains the bootstrap workspace after promote and returns a manual cleanup notice', async () => {
    await initBootstrap(testDir, { mode: 'full' });
    await writeEvidence(['dom.auth']);
    await writeValidDomainMap('dom.auth');

    await refreshBootstrapDerivedArtifacts(testDir);
    await approveReview();
    await refreshBootstrapDerivedArtifacts(testDir);

    const result = await promoteBootstrap(testDir);

    expect(result.retainedWorkspaceNotice).toBe(BOOTSTRAP_WORKSPACE_RETAINED_NOTICE);
    await expect(fs.stat(path.join(testDir, 'openspec', 'bootstrap'))).resolves.toBeDefined();
  });
});
