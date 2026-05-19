import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { ListCommand } from '../../src/core/list.js';
import { computeEvidenceFingerprint, computeTasksFileHash } from '../../src/core/verify/freshness.js';

describe('ListCommand', () => {
  let tempDir: string;
  let originalLog: typeof console.log;
  let logOutput: string[] = [];

  beforeEach(async () => {
    // Create temp directory
    tempDir = path.join(os.tmpdir(), `openspec-list-test-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });

    // Mock console.log to capture output
    originalLog = console.log;
    console.log = (...args: any[]) => {
      logOutput.push(args.join(' '));
    };
    logOutput = [];
  });

  afterEach(async () => {
    // Restore console.log
    console.log = originalLog;

    // Clean up temp directory
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  async function collectChangeFiles(changeDir: string): Promise<string[]> {
    const files: string[] = [];

    async function walk(dir: string): Promise<void> {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          await walk(fullPath);
        } else if (entry.name !== '.verify-result.json') {
          files.push(fullPath);
        }
      }
    }

    await walk(changeDir);
    return files.sort();
  }

  async function writeFreshVerifyResult(changeDir: string): Promise<void> {
    const evidenceFiles = (await collectChangeFiles(changeDir)).map((filePath) =>
      path.relative(tempDir, filePath).split(path.sep).join('/')
    );
    const fingerprint = await computeEvidenceFingerprint(evidenceFiles, tempDir);
    const tasksFileHash = await computeTasksFileHash(path.join(changeDir, 'tasks.md'));

    await fs.writeFile(
      path.join(changeDir, '.verify-result.json'),
      JSON.stringify(
        {
          timestamp: '2026-05-19T00:00:00.000Z',
          result: 'PASS',
          issues: [],
          tasksFileHash: tasksFileHash ?? '',
          verificationContext: {
            contractVersion: '1.0',
            evidenceFiles,
            evidenceFingerprint: fingerprint.hash,
          },
          optimization: {
            status: 'NOT_NEEDED',
            attempts: [],
          },
        },
        null,
        2
      )
    );
  }

  describe('execute', () => {
    it('should handle missing openspec/changes directory', async () => {
      const listCommand = new ListCommand();
      
      await expect(listCommand.execute(tempDir, 'changes')).rejects.toThrow(
        "No OpenSpec changes directory found. Run 'openspec init' first."
      );
    });

    it('should handle empty changes directory', async () => {
      const changesDir = path.join(tempDir, 'openspec', 'changes');
      await fs.mkdir(changesDir, { recursive: true });

      const listCommand = new ListCommand();
      await listCommand.execute(tempDir, 'changes');

      expect(logOutput).toEqual(['No active changes found.']);
    });

    it('should exclude archive directory', async () => {
      const changesDir = path.join(tempDir, 'openspec', 'changes');
      await fs.mkdir(path.join(changesDir, 'archive'), { recursive: true });
      await fs.mkdir(path.join(changesDir, 'my-change'), { recursive: true });
      
      // Create tasks.md with some tasks
      await fs.writeFile(
        path.join(changesDir, 'my-change', 'tasks.md'),
        '- [x] Task 1\n- [ ] Task 2\n'
      );

      const listCommand = new ListCommand();
      await listCommand.execute(tempDir, 'changes');

      expect(logOutput).toContain('Changes:');
      expect(logOutput.some(line => line.includes('my-change'))).toBe(true);
      expect(logOutput.some(line => line.includes('archive'))).toBe(false);
    });

    it('should count tasks correctly', async () => {
      const changesDir = path.join(tempDir, 'openspec', 'changes');
      await fs.mkdir(path.join(changesDir, 'test-change'), { recursive: true });
      
      await fs.writeFile(
        path.join(changesDir, 'test-change', 'tasks.md'),
        `# Tasks
- [x] Completed task 1
- [x] Completed task 2
- [ ] Incomplete task 1
- [ ] Incomplete task 2
- [ ] Incomplete task 3
Regular text that should be ignored
`
      );

      const listCommand = new ListCommand();
      await listCommand.execute(tempDir, 'changes');

      expect(logOutput.some(line => line.includes('2/5 tasks'))).toBe(true);
    });

    it('should show complete status for fully completed changes', async () => {
      const changesDir = path.join(tempDir, 'openspec', 'changes');
      await fs.mkdir(path.join(changesDir, 'completed-change'), { recursive: true });
      
      await fs.writeFile(
        path.join(changesDir, 'completed-change', 'tasks.md'),
        '- [x] Task 1\n- [x] Task 2\n- [x] Task 3\n'
      );

      const listCommand = new ListCommand();
      await listCommand.execute(tempDir, 'changes');

      expect(logOutput.some(line => line.includes('✓ Complete'))).toBe(true);
    });

    it('should handle changes without tasks.md', async () => {
      const changesDir = path.join(tempDir, 'openspec', 'changes');
      await fs.mkdir(path.join(changesDir, 'no-tasks'), { recursive: true });

      const listCommand = new ListCommand();
      await listCommand.execute(tempDir, 'changes');

      expect(logOutput.some(line => line.includes('no-tasks') && line.includes('No tasks'))).toBe(true);
    });

    it('should sort changes alphabetically when sort=name', async () => {
      const changesDir = path.join(tempDir, 'openspec', 'changes');
      await fs.mkdir(path.join(changesDir, 'zebra'), { recursive: true });
      await fs.mkdir(path.join(changesDir, 'alpha'), { recursive: true });
      await fs.mkdir(path.join(changesDir, 'middle'), { recursive: true });

      const listCommand = new ListCommand();
      await listCommand.execute(tempDir, 'changes', { sort: 'name' });

      const changeLines = logOutput.filter(line =>
        line.includes('alpha') || line.includes('middle') || line.includes('zebra')
      );

      expect(changeLines[0]).toContain('alpha');
      expect(changeLines[1]).toContain('middle');
      expect(changeLines[2]).toContain('zebra');
    });

    it('should handle multiple changes with various states', async () => {
      const changesDir = path.join(tempDir, 'openspec', 'changes');
      
      // Complete change
      await fs.mkdir(path.join(changesDir, 'completed'), { recursive: true });
      await fs.writeFile(
        path.join(changesDir, 'completed', 'tasks.md'),
        '- [x] Task 1\n- [x] Task 2\n'
      );

      // Partial change
      await fs.mkdir(path.join(changesDir, 'partial'), { recursive: true });
      await fs.writeFile(
        path.join(changesDir, 'partial', 'tasks.md'),
        '- [x] Done\n- [ ] Not done\n- [ ] Also not done\n'
      );

      // No tasks
      await fs.mkdir(path.join(changesDir, 'no-tasks'), { recursive: true });

      const listCommand = new ListCommand();
      await listCommand.execute(tempDir);

      expect(logOutput).toContain('Changes:');
      expect(logOutput.some(line => line.includes('completed') && line.includes('✓ Complete'))).toBe(true);
      expect(logOutput.some(line => line.includes('partial') && line.includes('1/3 tasks'))).toBe(true);
      expect(logOutput.some(line => line.includes('no-tasks') && line.includes('No tasks'))).toBe(true);
    });

    it('should include verifyStatus in JSON output', async () => {
      const changesDir = path.join(tempDir, 'openspec', 'changes');

      const freshDir = path.join(changesDir, 'fresh-change');
      await fs.mkdir(freshDir, { recursive: true });
      await fs.writeFile(path.join(freshDir, 'proposal.md'), '## Why\nfresh\n\n## What Changes\n- ok');
      await fs.writeFile(path.join(freshDir, 'tasks.md'), '- [x] Task 1\n');
      await writeFreshVerifyResult(freshDir);

      const staleDir = path.join(changesDir, 'stale-change');
      await fs.mkdir(staleDir, { recursive: true });
      await fs.writeFile(path.join(staleDir, 'proposal.md'), '## Why\nstale\n\n## What Changes\n- ok');
      await fs.writeFile(path.join(staleDir, 'tasks.md'), '- [x] Task 1\n');
      await writeFreshVerifyResult(staleDir);
      await fs.writeFile(path.join(staleDir, 'proposal.md'), '## Why\nstale modified\n\n## What Changes\n- ok');

      const missingDir = path.join(changesDir, 'missing-change');
      await fs.mkdir(missingDir, { recursive: true });
      await fs.writeFile(path.join(missingDir, 'proposal.md'), '## Why\nmissing\n\n## What Changes\n- ok');
      await fs.writeFile(path.join(missingDir, 'tasks.md'), '- [ ] Task 1\n');

      const listCommand = new ListCommand();
      await listCommand.execute(tempDir, 'changes', { json: true });

      const output = JSON.parse(logOutput[0]);
      const changes = Object.fromEntries(output.changes.map((change: any) => [change.name, change]));
      expect(changes['fresh-change'].verifyStatus).toBe('FRESH');
      expect(changes['stale-change'].verifyStatus).toBe('STALE');
      expect(changes['missing-change'].verifyStatus).toBe('MISSING');
      expect(changes['fresh-change'].status).toBe('complete');
      expect(changes['missing-change'].status).toBe('in-progress');
    });
  });
});
