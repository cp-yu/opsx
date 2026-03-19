import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { randomUUID } from 'crypto';
import {
  getBootstrapStatus,
  initBootstrap,
  promoteBootstrap,
  refreshBootstrapDerivedArtifacts,
  validateGate,
} from '../../src/utils/bootstrap-utils.js';

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

  async function writeValidDomainMap(domainId: string, capabilityId = `cap.${domainId.slice(4)}.work`): Promise<void> {
    const filePath = path.join(testDir, 'openspec', 'bootstrap', 'domain-map', `${domainId}.yaml`);
    const content = `domain:
  id: ${domainId}
  type: domain
  intent: ${domainId} boundary
capabilities:
  - id: ${capabilityId}
    type: capability
    intent: ${capabilityId} intent
relations:
  - from: ${capabilityId}
    to: ${domainId}
    type: contains
code_refs:
  - id: ${capabilityId}
    refs:
      - path: src/${domainId.replace('dom.', '')}/index.ts
        line_start: 1
`;
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.mkdir(path.join(testDir, 'src', domainId.replace('dom.', '')), { recursive: true });
    await fs.writeFile(path.join(testDir, 'src', domainId.replace('dom.', ''), 'index.ts'), 'export {};\n', 'utf-8');
    await fs.writeFile(filePath, content, 'utf-8');
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
});
