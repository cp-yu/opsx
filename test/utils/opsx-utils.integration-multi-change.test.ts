import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { randomUUID } from 'crypto';
import { stringify as stringifyYaml } from 'yaml';
import {
  OPSX_SCHEMA_VERSION,
  readProjectOpsx,
  writeProjectOpsx,
  validateReferentialIntegrity,
  validateCodeMapIntegrity,
  type ProjectOpsxBundle,
  type OpsxDelta,
} from '../../src/utils/opsx-utils.js';

function applyDelta(bundle: ProjectOpsxBundle, delta: OpsxDelta): ProjectOpsxBundle {
  const b = { ...bundle, domains: [...bundle.domains], capabilities: [...bundle.capabilities], relations: [...bundle.relations], code_map: [...bundle.code_map] };

  if (delta.ADDED) {
    if (delta.ADDED.domains) b.domains.push(...delta.ADDED.domains);
    if (delta.ADDED.capabilities) b.capabilities.push(...delta.ADDED.capabilities);
    if (delta.ADDED.relations) b.relations.push(...delta.ADDED.relations);
  }
  if (delta.MODIFIED) {
    for (const mod of delta.MODIFIED.domains || []) {
      const idx = b.domains.findIndex(d => d.id === mod.id);
      if (idx !== -1) b.domains[idx] = mod;
    }
    for (const mod of delta.MODIFIED.capabilities || []) {
      const idx = b.capabilities.findIndex(c => c.id === mod.id);
      if (idx !== -1) b.capabilities[idx] = mod;
    }
  }
  if (delta.REMOVED) {
    if (delta.REMOVED.domains) {
      const ids = new Set(delta.REMOVED.domains.map(d => d.id));
      b.domains = b.domains.filter(d => !ids.has(d.id));
    }
    if (delta.REMOVED.capabilities) {
      const ids = new Set(delta.REMOVED.capabilities.map(c => c.id));
      b.capabilities = b.capabilities.filter(c => !ids.has(c.id));
    }
    if (delta.REMOVED.relations) {
      const removeKeys = new Set(delta.REMOVED.relations.map(r => `${r.from}|${r.to}|${r.type}`));
      b.relations = b.relations.filter(r => !removeKeys.has(`${r.from}|${r.to}|${r.type}`));
    }
  }
  return b;
}
async function writeChangeArtifacts(testDir: string, changeName: string, delta: OpsxDelta): Promise<void> {
  const changeDir = path.join(testDir, 'openspec', 'changes', changeName);
  await fs.mkdir(changeDir, { recursive: true });
  await fs.writeFile(path.join(changeDir, 'opsx-delta.yaml'), stringifyYaml(delta));
  await fs.writeFile(path.join(changeDir, 'proposal.md'), `# ${changeName}\n`);
}

describe('Integration: Multiple Changes on Real Project', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = path.join(os.tmpdir(), `openspec-multi-${randomUUID()}`);
    await fs.mkdir(path.join(testDir, 'openspec'), { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  const seedBundle: ProjectOpsxBundle = {
    schema_version: OPSX_SCHEMA_VERSION,
    project: { id: 'real-app', name: 'Real Application' },
    domains: [
      { id: 'dom.core', type: 'domain', intent: 'Core application logic' },
      { id: 'dom.user', type: 'domain', intent: 'User management' },
    ],
    capabilities: [
      { id: 'cap.core.init', type: 'capability', intent: 'Application initialization' },
      { id: 'cap.user.create', type: 'capability', intent: 'Create user accounts' },
      { id: 'cap.user.delete', type: 'capability', intent: 'Delete user accounts' },
    ],
    relations: [
      { from: 'cap.core.init', to: 'dom.core', type: 'contains' },
      { from: 'cap.user.create', to: 'dom.user', type: 'contains' },
      { from: 'cap.user.delete', to: 'dom.user', type: 'contains' },
    ],
    code_map: [
      { id: 'cap.core.init', refs: [{ path: 'src/core/init.ts', line_start: 1, line_end: 30 }] },
      { id: 'cap.user.create', refs: [{ path: 'src/user/create.ts' }] },
    ],
  };

  it('applies three sequential changes maintaining integrity', async () => {
    // Seed
    await writeProjectOpsx(testDir, seedBundle);

    // Change 1: Add auth domain
    const delta1: OpsxDelta = {
      schema_version: OPSX_SCHEMA_VERSION,
      ADDED: {
        domains: [{ id: 'dom.auth', type: 'domain', intent: 'Authentication and authorization' }],
        capabilities: [
          { id: 'cap.auth.login', type: 'capability', intent: 'User login with credentials' },
          { id: 'cap.auth.logout', type: 'capability', intent: 'User logout and session cleanup' },
        ],
        relations: [
          { from: 'cap.auth.login', to: 'dom.auth', type: 'contains' },
          { from: 'cap.auth.logout', to: 'dom.auth', type: 'contains' },
          { from: 'cap.auth.login', to: 'cap.user.create', type: 'depends_on' },
        ],
      },
    };
    await writeChangeArtifacts(testDir, 'add-auth', delta1);

    let bundle = (await readProjectOpsx(testDir))!;
    bundle = applyDelta(bundle, delta1);
    await writeProjectOpsx(testDir, bundle);

    let result = validateReferentialIntegrity(bundle);
    expect(result.valid).toBe(true);
    expect(bundle.domains).toHaveLength(3);
    expect(bundle.capabilities).toHaveLength(5);
    expect(bundle.relations).toHaveLength(6);
    // Change 2: Modify user domain, add 2FA capability
    const delta2: OpsxDelta = {
      schema_version: OPSX_SCHEMA_VERSION,
      MODIFIED: {
        domains: [{ id: 'dom.user', type: 'domain', intent: 'User management with profile support' }],
        capabilities: [{ id: 'cap.user.create', type: 'capability', intent: 'Create user accounts with email verification' }],
      },
      ADDED: {
        capabilities: [{ id: 'cap.auth.2fa', type: 'capability', intent: 'Two-factor authentication' }],
        relations: [
          { from: 'cap.auth.2fa', to: 'dom.auth', type: 'contains' },
          { from: 'cap.auth.2fa', to: 'cap.auth.login', type: 'depends_on' },
        ],
      },
    };
    await writeChangeArtifacts(testDir, 'enhance-user-auth', delta2);

    bundle = applyDelta(bundle, delta2);
    await writeProjectOpsx(testDir, bundle);

    result = validateReferentialIntegrity(bundle);
    expect(result.valid).toBe(true);
    expect(bundle.domains).toHaveLength(3);
    expect(bundle.capabilities).toHaveLength(6);
    expect(bundle.domains.find(d => d.id === 'dom.user')!.intent).toBe('User management with profile support');

    // Change 3: Remove deprecated capability, add new domain
    const delta3: OpsxDelta = {
      schema_version: OPSX_SCHEMA_VERSION,
      REMOVED: {
        capabilities: [{ id: 'cap.user.delete', type: 'capability' }],
        relations: [{ from: 'cap.user.delete', to: 'dom.user', type: 'contains' }],
      },
      ADDED: {
        domains: [{ id: 'dom.notification', type: 'domain', intent: 'Notification delivery' }],
        capabilities: [{ id: 'cap.notification.send', type: 'capability', intent: 'Send notifications to users' }],
        relations: [
          { from: 'cap.notification.send', to: 'dom.notification', type: 'contains' },
          { from: 'cap.notification.send', to: 'cap.user.create', type: 'depends_on' },
        ],
      },
    };
    await writeChangeArtifacts(testDir, 'add-notifications', delta3);

    bundle = applyDelta(bundle, delta3);
    await writeProjectOpsx(testDir, bundle);

    result = validateReferentialIntegrity(bundle);
    expect(result.valid).toBe(true);
    expect(bundle.domains).toHaveLength(4);
    expect(bundle.capabilities).toHaveLength(6); // 6 - 1 removed + 1 added = 6
    expect(bundle.capabilities.find(c => c.id === 'cap.user.delete')).toBeUndefined();
    expect(bundle.capabilities.find(c => c.id === 'cap.notification.send')).toBeDefined();

    // Final: read back from disk and verify full round-trip
    const final = (await readProjectOpsx(testDir))!;
    expect(final.domains).toHaveLength(4);
    expect(final.capabilities).toHaveLength(6);
    expect(validateReferentialIntegrity(final).valid).toBe(true);
    expect(validateCodeMapIntegrity(final).valid).toBe(true);
  });

  it('detects integrity violation when change creates dangling reference', async () => {
    await writeProjectOpsx(testDir, seedBundle);

    const badDelta: OpsxDelta = {
      schema_version: OPSX_SCHEMA_VERSION,
      ADDED: {
        relations: [
          { from: 'cap.nonexistent', to: 'dom.core', type: 'contains' },
        ],
      },
    };

    let bundle = (await readProjectOpsx(testDir))!;
    bundle = applyDelta(bundle, badDelta);

    const result = validateReferentialIntegrity(bundle);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain('cap.nonexistent');
  });

  it('handles idempotent delta application', async () => {
    await writeProjectOpsx(testDir, seedBundle);

    const delta: OpsxDelta = {
      schema_version: OPSX_SCHEMA_VERSION,
      ADDED: {
        domains: [{ id: 'dom.api', type: 'domain', intent: 'API gateway' }],
        capabilities: [{ id: 'cap.api.route', type: 'capability', intent: 'Route API requests' }],
        relations: [{ from: 'cap.api.route', to: 'dom.api', type: 'contains' }],
      },
    };

    let bundle = (await readProjectOpsx(testDir))!;
    bundle = applyDelta(bundle, delta);
    await writeProjectOpsx(testDir, bundle);
    const afterFirst = (await readProjectOpsx(testDir))!;

    // Apply same delta again — deduplicate by id
    bundle = (await readProjectOpsx(testDir))!;
    // Idempotent: skip nodes that already exist
    if (delta.ADDED?.domains) {
      const existing = new Set(bundle.domains.map(d => d.id));
      delta.ADDED.domains = delta.ADDED.domains.filter(d => !existing.has(d.id));
    }
    if (delta.ADDED?.capabilities) {
      const existing = new Set(bundle.capabilities.map(c => c.id));
      delta.ADDED.capabilities = delta.ADDED.capabilities.filter(c => !existing.has(c.id));
    }
    if (delta.ADDED?.relations) {
      const existing = new Set(bundle.relations.map(r => `${r.from}|${r.to}|${r.type}`));
      delta.ADDED.relations = delta.ADDED.relations.filter(r => !existing.has(`${r.from}|${r.to}|${r.type}`));
    }
    bundle = applyDelta(bundle, delta);
    await writeProjectOpsx(testDir, bundle);
    const afterSecond = (await readProjectOpsx(testDir))!;

    expect(afterSecond.domains).toHaveLength(afterFirst.domains.length);
    expect(afterSecond.capabilities).toHaveLength(afterFirst.capabilities.length);
    expect(afterSecond.relations).toHaveLength(afterFirst.relations.length);
  });
});


