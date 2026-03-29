import { afterAll, describe, expect, it } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import { tmpdir } from 'os';
import { runCLI } from '../helpers/run-cli.js';
import { getBootstrapStatus } from '../../src/utils/bootstrap-utils.js';

const tempRoots: string[] = [];

async function removeDirWithRetry(dir: string, attempts = 5): Promise<void> {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await fs.rm(dir, { recursive: true, force: true });
      return;
    } catch (error: any) {
      // Windows can hold temp files briefly after child process exit.
      if (error?.code !== 'EBUSY' || attempt === attempts) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, attempt * 200));
    }
  }
}

async function createTempProject(): Promise<string> {
  const projectDir = await fs.mkdtemp(path.join(tmpdir(), 'openspec-bootstrap-lifecycle-'));
  tempRoots.push(projectDir);
  return projectDir;
}

async function writeFile(projectDir: string, relativePath: string, content: string): Promise<void> {
  const filePath = path.join(projectDir, relativePath);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, 'utf-8');
}

async function readFile(projectDir: string, relativePath: string): Promise<string> {
  return fs.readFile(path.join(projectDir, relativePath), 'utf-8');
}

async function pathExists(projectDir: string, relativePath: string): Promise<boolean> {
  try {
    await fs.access(path.join(projectDir, relativePath));
    return true;
  } catch {
    return false;
  }
}

async function setBootstrapPhase(projectDir: string, phase: string): Promise<void> {
  const metadataPath = path.join(projectDir, 'openspec', 'bootstrap', '.bootstrap.yaml');
  const metadata = parseYaml(await fs.readFile(metadataPath, 'utf-8')) as Record<string, unknown>;
  metadata.phase = phase;
  await fs.writeFile(metadataPath, stringifyYaml(metadata, { lineWidth: 0 }), 'utf-8');
}

async function getBootstrapPhase(projectDir: string): Promise<string> {
  const metadataPath = path.join(projectDir, 'openspec', 'bootstrap', '.bootstrap.yaml');
  const metadata = parseYaml(await fs.readFile(metadataPath, 'utf-8')) as Record<string, unknown>;
  return String(metadata.phase);
}

async function checkAllReviewBoxes(projectDir: string): Promise<void> {
  const reviewPath = path.join(projectDir, 'openspec', 'bootstrap', 'review.md');
  const review = await fs.readFile(reviewPath, 'utf-8');
  await fs.writeFile(reviewPath, review.replace(/- \[ \]/g, '- [x]'), 'utf-8');
}

async function expectFormalBundle(projectDir: string): Promise<void> {
  await expect(readFile(projectDir, 'openspec/project.opsx.yaml')).resolves.toContain('schema_version: 1');
  await expect(readFile(projectDir, 'openspec/project.opsx.relations.yaml')).resolves.toContain('schema_version: 1');
  await expect(readFile(projectDir, 'openspec/project.opsx.code-map.yaml')).resolves.toContain('schema_version: 1');
}

async function initWorkspace(
  projectDir: string,
  mode: 'full' | 'opsx-first',
  baseline: 'raw' | 'specs-based'
): Promise<void> {
  await writeFile(projectDir, 'src/cli/index.ts', 'export const cli = true;\n');
  await writeFile(projectDir, 'src/auth/login.ts', 'export function login() { return true; }\n');

  if (baseline === 'specs-based') {
    await writeFile(projectDir, 'openspec/specs/auth/spec.md', '# Auth\n');
  }

  const initResult = await runCLI(['bootstrap', 'init', '--mode', mode], { cwd: projectDir });
  expect(initResult.exitCode).toBe(0);
  await setBootstrapPhase(projectDir, 'scan');
}

async function prepareReviewWorkspace(
  projectDir: string,
  mode: 'full' | 'opsx-first',
  baseline: 'raw' | 'specs-based'
): Promise<void> {
  await initWorkspace(projectDir, mode, baseline);

  await writeFile(projectDir, 'openspec/bootstrap/evidence.yaml', `domains:
  - id: dom.cli
    confidence: high
    sources:
      - code:src/cli/index.ts
    intent: CLI command surface
  - id: dom.auth
    confidence: medium
    sources:
      - code:src/auth/login.ts
    intent: Authentication behaviors
`);

  const scanValidate = await runCLI(['bootstrap', 'validate'], { cwd: projectDir });
  expect(scanValidate.exitCode).toBe(0);
  expect(await getBootstrapPhase(projectDir)).toBe('map');

  await writeFile(projectDir, 'openspec/bootstrap/domain-map/dom.cli.yaml', `domain:
  id: dom.cli
  type: domain
  intent: CLI command surface
capabilities:
  - id: cap.cli.bootstrap
    type: capability
    intent: Bootstrap OPSX from an existing repository
    spec:
      folder: cli
      purpose: Bootstrap the repository into formal OPSX tracking.
      requirements:
        - title: Bootstrap workflow
          text: The system SHALL provide a bootstrap workflow.
          scenarios:
            - title: Bootstrap command runs
              steps:
                - keyword: WHEN
                  text: the user starts bootstrap
                - keyword: THEN
                  text: the workflow initializes correctly
relations:
  - from: cap.cli.bootstrap
    to: dom.cli
    type: contains
code_refs:
  - id: cap.cli.bootstrap
    refs:
      - path: src/cli/index.ts
        line_start: 1
`);

  await writeFile(projectDir, 'openspec/bootstrap/domain-map/dom.auth.yaml', `domain:
  id: dom.auth
  type: domain
  intent: Authentication behaviors
capabilities:
  - id: cap.auth.login
    type: capability
    intent: Log in a user
    spec:
      preserve_existing: true
      folder: auth
      purpose: Authenticate a user.
      requirements:
        - title: User login
          text: The system SHALL authenticate users.
          scenarios:
            - title: Login succeeds
              steps:
                - keyword: WHEN
                  text: valid credentials are submitted
                - keyword: THEN
                  text: access is granted
relations:
  - from: cap.auth.login
    to: dom.auth
    type: contains
code_refs:
  - id: cap.auth.login
    refs:
      - path: src/auth/login.ts
        line_start: 1
`);

  const mapValidate = await runCLI(['bootstrap', 'validate'], { cwd: projectDir });
  expect(mapValidate.exitCode).toBe(0);
  expect(await getBootstrapPhase(projectDir)).toBe('review');

  const reviewValidate = await runCLI(['bootstrap', 'validate'], { cwd: projectDir });
  expect(reviewValidate.exitCode).toBe(1);
  expect(await pathExists(projectDir, 'openspec/bootstrap/review.md')).toBe(true);
  expect(await pathExists(projectDir, 'openspec/bootstrap/candidate/project.opsx.yaml')).toBe(true);
}

afterAll(async () => {
  await Promise.all(tempRoots.map((dir) => removeDirWithRetry(dir)));
});

describe('openspec bootstrap lifecycle', () => {
  it('supports specs-based -> full, preserves existing specs, and adds missing candidate specs', async () => {
    const projectDir = await createTempProject();
    const originalSpec = '# Auth\n';
    await writeFile(projectDir, 'openspec/specs/auth/spec.md', originalSpec);

    await prepareReviewWorkspace(projectDir, 'full', 'specs-based');
    await checkAllReviewBoxes(projectDir);

    const validateResult = await runCLI(['bootstrap', 'validate'], { cwd: projectDir });
    expect(validateResult.exitCode).toBe(0);
    expect(await getBootstrapPhase(projectDir)).toBe('promote');

    const promoteResult = await runCLI(['bootstrap', 'promote', '-y'], { cwd: projectDir });
    expect(promoteResult.exitCode).toBe(0);
    await expectFormalBundle(projectDir);
    await expect(readFile(projectDir, 'openspec/specs/auth/spec.md')).resolves.toBe(originalSpec);
    await expect(readFile(projectDir, 'openspec/specs/cli/spec.md')).resolves.toContain('### Requirement: Bootstrap workflow');
    expect(await pathExists(projectDir, 'openspec/bootstrap')).toBe(true);
  });

  it('supports raw -> opsx-first with README-only starter output', async () => {
    const projectDir = await createTempProject();
    await prepareReviewWorkspace(projectDir, 'opsx-first', 'raw');
    await checkAllReviewBoxes(projectDir);

    const validateResult = await runCLI(['bootstrap', 'validate'], { cwd: projectDir });
    expect(validateResult.exitCode).toBe(0);

    const promoteResult = await runCLI(['bootstrap', 'promote', '-y'], { cwd: projectDir });
    expect(promoteResult.exitCode).toBe(0);
    await expectFormalBundle(projectDir);
    await expect(readFile(projectDir, 'openspec/specs/README.md')).resolves.toContain('bootstrapped in `opsx-first` mode');
    expect(await pathExists(projectDir, 'openspec/specs/cli/spec.md')).toBe(false);
    expect(await pathExists(projectDir, 'openspec/specs/auth/spec.md')).toBe(false);
    expect(await pathExists(projectDir, 'openspec/bootstrap')).toBe(true);
  });

  it('supports raw -> full and writes complete candidate specs', async () => {
    const projectDir = await createTempProject();
    await prepareReviewWorkspace(projectDir, 'full', 'raw');
    await checkAllReviewBoxes(projectDir);

    const validateResult = await runCLI(['bootstrap', 'validate'], { cwd: projectDir });
    expect(validateResult.exitCode).toBe(0);

    const promoteResult = await runCLI(['bootstrap', 'promote', '-y'], { cwd: projectDir });
    expect(promoteResult.exitCode).toBe(0);
    await expectFormalBundle(projectDir);
    await expect(readFile(projectDir, 'openspec/specs/cli/spec.md')).resolves.toContain('### Requirement: Bootstrap workflow');
    await expect(readFile(projectDir, 'openspec/specs/auth/spec.md')).resolves.toContain('### Requirement: User login');
    expect(await pathExists(projectDir, 'openspec/specs/README.md')).toBe(false);
    expect(await pathExists(projectDir, 'openspec/bootstrap')).toBe(true);
  });

  it('treats an empty specs directory as raw and still writes complete specs in full mode', async () => {
    const projectDir = await createTempProject();
    await fs.mkdir(path.join(projectDir, 'openspec', 'specs'), { recursive: true });

    await prepareReviewWorkspace(projectDir, 'full', 'raw');
    await checkAllReviewBoxes(projectDir);

    const validateResult = await runCLI(['bootstrap', 'validate'], { cwd: projectDir });
    expect(validateResult.exitCode).toBe(0);

    const promoteResult = await runCLI(['bootstrap', 'promote', '-y'], { cwd: projectDir });
    expect(promoteResult.exitCode).toBe(0);
    await expectFormalBundle(projectDir);
    await expect(readFile(projectDir, 'openspec/specs/cli/spec.md')).resolves.toContain('### Requirement: Bootstrap workflow');
    await expect(readFile(projectDir, 'openspec/specs/auth/spec.md')).resolves.toContain('### Requirement: User login');
    expect(await pathExists(projectDir, 'openspec/specs/README.md')).toBe(false);
    expect(await pathExists(projectDir, 'openspec/bootstrap')).toBe(true);
  });

  it('re-asserts upstream completeness before promote', async () => {
    const projectDir = await createTempProject();
    await prepareReviewWorkspace(projectDir, 'full', 'raw');
    await checkAllReviewBoxes(projectDir);

    const validateResult = await runCLI(['bootstrap', 'validate'], { cwd: projectDir });
    expect(validateResult.exitCode).toBe(0);

    await fs.rm(path.join(projectDir, 'openspec', 'bootstrap', 'domain-map', 'dom.auth.yaml'));

    const promoteResult = await runCLI(['bootstrap', 'promote', '-y'], { cwd: projectDir });
    expect(promoteResult.exitCode).toBe(1);
    expect(await pathExists(projectDir, 'openspec/project.opsx.yaml')).toBe(false);
    expect(await pathExists(projectDir, 'openspec/bootstrap')).toBe(true);
  }, 30000);

  it('blocks promote on invalid candidate spec before any formal outputs are written', async () => {
    const projectDir = await createTempProject();
    await prepareReviewWorkspace(projectDir, 'full', 'raw');
    await checkAllReviewBoxes(projectDir);

    const validateResult = await runCLI(['bootstrap', 'validate'], { cwd: projectDir });
    expect(validateResult.exitCode).toBe(0);

    const candidateSpecPath = path.join(projectDir, 'openspec', 'bootstrap', 'candidate', 'specs', 'cli', 'spec.md');
    await fs.writeFile(candidateSpecPath, '# Spec: cli\n', 'utf-8');

    const promoteResult = await runCLI(['bootstrap', 'promote', '-y'], { cwd: projectDir });
    expect(promoteResult.exitCode).toBe(1);

    // No partial formal writes should have occurred.
    expect(await pathExists(projectDir, 'openspec/project.opsx.yaml')).toBe(false);
    expect(await pathExists(projectDir, 'openspec/project.opsx.relations.yaml')).toBe(false);
    expect(await pathExists(projectDir, 'openspec/project.opsx.code-map.yaml')).toBe(false);
    expect(await pathExists(projectDir, 'openspec/specs/cli/spec.md')).toBe(false);
    expect(await pathExists(projectDir, 'openspec/bootstrap')).toBe(true);
  }, 30000);

  it('invalidates stale review after evidence edits and reports stale status', async () => {
    const projectDir = await createTempProject();
    await prepareReviewWorkspace(projectDir, 'full', 'raw');
    await checkAllReviewBoxes(projectDir);

    const validateResult = await runCLI(['bootstrap', 'validate'], { cwd: projectDir });
    expect(validateResult.exitCode).toBe(0);

    await writeFile(projectDir, 'openspec/bootstrap/evidence.yaml', `domains:
  - id: dom.cli
    confidence: high
    sources:
      - code:src/cli/index.ts
    intent: CLI command surface
  - id: dom.auth
    confidence: medium
    sources:
      - code:src/auth/login.ts
    intent: Authentication behaviors
  - id: dom.payments
    confidence: low
    sources:
      - code:src/payments/index.ts
    intent: Payment processing
`);
    await writeFile(projectDir, 'src/payments/index.ts', 'export const payments = true;\n');

    const status = await getBootstrapStatus(projectDir);
    expect(status.initialized).toBe(true);
    if (!status.initialized) {
      throw new Error('Expected initialized bootstrap status');
    }
    expect(status.reviewState).toBe('stale');
    expect(status.reviewApproved).toBe(false);

    const promoteResult = await runCLI(['bootstrap', 'promote', '-y'], { cwd: projectDir });
    expect(promoteResult.exitCode).toBe(1);
    expect(await pathExists(projectDir, 'openspec/project.opsx.yaml')).toBe(false);

    const reviewValidate = await runCLI(['bootstrap', 'validate'], { cwd: projectDir });
    expect(reviewValidate.exitCode).toBe(1);

    const review = await readFile(projectDir, 'openspec/bootstrap/review.md');
    expect(review).toContain('dom.payments');
    expect(review.indexOf('dom.payments')).toBeLessThan(review.indexOf('dom.auth'));
    expect(review).toContain('- [ ] dom.payments');
  }, 30000);
});
