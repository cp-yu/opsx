import { afterAll, describe, expect, it } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import { tmpdir } from 'os';
import { promisify } from 'util';
import { execFile as execFileCallback } from 'child_process';
import { runCLI } from '../helpers/run-cli.js';

const execFile = promisify(execFileCallback);
const tempRoots: string[] = [];

async function createTempProject(): Promise<string> {
  const projectDir = await fs.mkdtemp(path.join(tmpdir(), 'openspec-bootstrap-refresh-'));
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

async function git(projectDir: string, args: string[]): Promise<string> {
  const result = await execFile('git', args, { cwd: projectDir, windowsHide: true });
  return result.stdout.trim();
}

async function initGitRepo(projectDir: string): Promise<string> {
  await git(projectDir, ['init']);
  await git(projectDir, ['config', 'user.email', 'test@example.com']);
  await git(projectDir, ['config', 'user.name', 'OpenSpec Test']);
  await git(projectDir, ['add', '.']);
  await git(projectDir, ['commit', '-m', 'baseline']);
  return git(projectDir, ['rev-parse', 'HEAD']);
}

async function setBootstrapMetadata(projectDir: string, mutate: (metadata: Record<string, unknown>) => void): Promise<void> {
  const metadataPath = path.join(projectDir, 'openspec', 'bootstrap', '.bootstrap.yaml');
  const metadata = parseYaml(await fs.readFile(metadataPath, 'utf-8')) as Record<string, unknown>;
  mutate(metadata);
  await fs.writeFile(metadataPath, stringifyYaml(metadata, { lineWidth: 0 }), 'utf-8');
}

async function approveReview(projectDir: string): Promise<void> {
  const reviewPath = path.join(projectDir, 'openspec', 'bootstrap', 'review.md');
  const review = await fs.readFile(reviewPath, 'utf-8');
  await fs.writeFile(reviewPath, review.replace(/- \[ \]/g, '- [x]'), 'utf-8');
}

async function writeFormalBaseline(projectDir: string, options: { codeMapRef?: string } = {}): Promise<void> {
  await writeFile(projectDir, 'src/auth/login.ts', 'export function login() { return true; }\n');
  await writeFile(projectDir, 'src/auth/session.ts', 'export function session() { return true; }\n');
  await writeFile(projectDir, 'openspec/specs/auth/spec.md', '# Existing auth spec\n');
  await writeFile(projectDir, 'openspec/project.opsx.yaml', `schema_version: 1
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
  await writeFile(projectDir, 'openspec/project.opsx.relations.yaml', `schema_version: 1
relations:
  - from: cap.auth.login
    to: dom.auth
    type: contains
`);
  await writeFile(projectDir, 'openspec/project.opsx.code-map.yaml', `schema_version: 1
generated_at: "2026-04-18T00:00:00.000Z"
nodes:
  - id: cap.auth.login
    refs:
      - path: ${options.codeMapRef ?? 'src/auth/login.ts'}
        line_start: 1
`);
}

async function writeRefreshDomainMap(projectDir: string, options: { addSessionCapability?: boolean } = {}): Promise<void> {
  await writeFile(projectDir, 'openspec/bootstrap/evidence.yaml', `domains:
  - id: dom.auth
    confidence: high
    sources:
      - code:src/auth/login.ts
    intent: Authentication boundary
`);

  const capabilities = [
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
            text: 'The system SHALL authenticate users.',
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
  ];

  const relations = [
    { from: 'cap.auth.login', to: 'dom.auth', type: 'contains' },
  ];
  const code_refs = [
    {
      id: 'cap.auth.login',
      refs: [{ path: 'src/auth/login.ts', line_start: 1 }],
    },
  ];

  if (options.addSessionCapability) {
    capabilities.push({
      id: 'cap.auth.session',
      type: 'capability',
      intent: 'Track authenticated sessions',
      spec: {
        folder: 'sessions',
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
    });
    relations.push({ from: 'cap.auth.session', to: 'dom.auth', type: 'contains' });
    code_refs.push({
      id: 'cap.auth.session',
      refs: [{ path: 'src/auth/session.ts', line_start: 1 }],
    });
  }

  await writeFile(
    projectDir,
    'openspec/bootstrap/domain-map/dom.auth.yaml',
    stringifyYaml({
      domain: {
        id: 'dom.auth',
        type: 'domain',
        intent: 'Authentication boundary',
      },
      capabilities,
      relations,
      code_refs,
    }, { lineWidth: 0 })
  );
}

afterAll(async () => {
  await Promise.all(tempRoots.map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

describe('openspec bootstrap refresh', () => {
  it('supports formal-opsx -> refresh with full-scan fallback and merge-based promote', async () => {
    const projectDir = await createTempProject();
    await writeFormalBaseline(projectDir);
    const baselineHead = await initGitRepo(projectDir);

    const initResult = await runCLI(['bootstrap', 'init', '--mode', 'refresh'], { cwd: projectDir });
    expect(initResult.exitCode).toBe(0);
    await setBootstrapMetadata(projectDir, (metadata) => {
      metadata.phase = 'scan';
    });

    await writeRefreshDomainMap(projectDir, { addSessionCapability: true });

    expect((await runCLI(['bootstrap', 'validate'], { cwd: projectDir })).exitCode).toBe(0);
    expect((await runCLI(['bootstrap', 'validate'], { cwd: projectDir })).exitCode).toBe(0);

    const reviewResult = await runCLI(['bootstrap', 'validate'], { cwd: projectDir });
    expect(reviewResult.exitCode).toBe(1);

    const review = await readFile(projectDir, 'openspec/bootstrap/review.md');
    expect(review).toContain('full-scan-fallback');
    expect(review).toContain('ADDED: 1 nodes');

    await approveReview(projectDir);
    expect((await runCLI(['bootstrap', 'validate'], { cwd: projectDir })).exitCode).toBe(0);

    const promoteResult = await runCLI(['bootstrap', 'promote', '-y'], { cwd: projectDir });
    expect(promoteResult.exitCode).toBe(0);

    await expect(readFile(projectDir, 'openspec/project.opsx.yaml')).resolves.toContain('intent: Existing formal intent');
    await expect(readFile(projectDir, 'openspec/project.opsx.yaml')).resolves.toContain('cap.auth.session');
    await expect(readFile(projectDir, 'openspec/specs/auth/spec.md')).resolves.toBe('# Existing auth spec\n');
    await expect(readFile(projectDir, 'openspec/specs/sessions/spec.md')).resolves.toContain('### Requirement: Session tracking');

    const metadata = parseYaml(await readFile(projectDir, 'openspec/bootstrap/.bootstrap.yaml')) as Record<string, unknown>;
    expect(metadata.refresh_anchor_commit).toBe(baselineHead);
  });

  it('uses git-aware refresh scope when the stored anchor is reachable', async () => {
    const projectDir = await createTempProject();
    await writeFormalBaseline(projectDir, { codeMapRef: 'src/auth' });
    const baselineHead = await initGitRepo(projectDir);

    const initResult = await runCLI(['bootstrap', 'init', '--mode', 'refresh'], { cwd: projectDir });
    expect(initResult.exitCode).toBe(0);
    await setBootstrapMetadata(projectDir, (metadata) => {
      metadata.phase = 'scan';
      metadata.refresh_anchor_commit = baselineHead;
    });

    await writeFile(projectDir, 'src/auth/login.ts', 'export function login() { return "committed"; }\n');
    await git(projectDir, ['add', 'src/auth/login.ts']);
    await git(projectDir, ['commit', '-m', 'auth refresh']);
    await writeFile(projectDir, 'src/auth/staged.ts', 'export const staged = true;\n');
    await git(projectDir, ['add', 'src/auth/staged.ts']);
    await writeFile(projectDir, 'src/auth/login.ts', 'export function login() { return "unstaged"; }\n');
    await writeFile(projectDir, 'src/auth/untracked.ts', 'export const untracked = true;\n');

    await writeRefreshDomainMap(projectDir);

    expect((await runCLI(['bootstrap', 'validate'], { cwd: projectDir })).exitCode).toBe(0);
    expect((await runCLI(['bootstrap', 'validate'], { cwd: projectDir })).exitCode).toBe(0);
    expect((await runCLI(['bootstrap', 'validate'], { cwd: projectDir })).exitCode).toBe(1);

    const review = await readFile(projectDir, 'openspec/bootstrap/review.md');
    expect(review).toContain('Strategy: git-diff');
    expect(review).toContain('src/auth/login.ts');
    expect(review).toContain('src/auth/staged.ts');
    expect(review).toContain('src/auth/untracked.ts');
    expect(review).toContain('MODIFIED: 2 nodes');
  });
});
