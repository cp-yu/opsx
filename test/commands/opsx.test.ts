import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { runCLI } from '../helpers/run-cli.js';

describe('opsx command', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-opsx-command-'));
    await fs.mkdir(path.join(tempDir, 'openspec'), { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  async function writeOpsxProject(): Promise<void> {
    await fs.writeFile(
      path.join(tempDir, 'openspec', 'project.opsx.yaml'),
      `schema_version: 1
project:
  id: proj.test
  name: Test
domains:
  - id: dom.cli
    type: domain
    intent: CLI domain
    status: active
capabilities:
  - id: cap.cli.list
    type: capability
    intent: List items
    status: active
  - id: cap.cli.opsx-query
    type: capability
    intent: Query OPSX nodes
    status: active
  - id: cap.cli.show
    type: capability
    intent: Show items
    status: active
  - id: cap.cli.unused
    type: capability
    intent: No relations or code-map refs
    status: active
`
    );
    await fs.writeFile(
      path.join(tempDir, 'openspec', 'project.opsx.relations.yaml'),
      `schema_version: 1
relations:
  - from: cap.cli.list
    to: dom.cli
    type: contains
  - from: cap.cli.opsx-query
    to: cap.cli.list
    type: depends_on
  - from: cap.cli.show
    to: cap.cli.list
    type: depends_on
`
    );
    await fs.writeFile(
      path.join(tempDir, 'openspec', 'project.opsx.code-map.yaml'),
      `schema_version: 1
nodes:
  - id: cap.cli.list
    refs:
      - path: src/core/list.ts
        line_start: 1
        line_end: 40
  - id: cap.cli.show
    refs:
      - path: src/core/show.ts
`
    );
  }

  it('query存在节点返回完整信息', async () => {
    await writeOpsxProject();

    const result = await runCLI(['opsx', 'query', 'cap.cli.list', '--json'], { cwd: tempDir });

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    const output = JSON.parse(result.stdout);
    expect(output.node).toMatchObject({
      id: 'cap.cli.list',
      type: 'capability',
      intent: 'List items',
      status: 'active',
    });
    expect(output.relations.incoming).toEqual([
      { from: 'cap.cli.opsx-query', to: 'cap.cli.list', type: 'depends_on' },
      { from: 'cap.cli.show', to: 'cap.cli.list', type: 'depends_on' },
    ]);
    expect(output.relations.outgoing).toEqual([
      { from: 'cap.cli.list', to: 'dom.cli', type: 'contains' },
    ]);
    expect(output.codeMap).toEqual([
      { path: 'src/core/list.ts', line_start: 1, line_end: 40 },
    ]);
    expect(output).not.toHaveProperty('seeds');
    expect(output).not.toHaveProperty('nodes');
    expect(output).not.toHaveProperty('missing');
  });

  it('不存在节点报错', async () => {
    await writeOpsxProject();

    const result = await runCLI(['opsx', 'query', 'cap.nonexistent', '--json'], { cwd: tempDir });

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("Node 'cap.nonexistent' not found in OPSX");
    expect(result.stderr).toContain('cap.cli.list');
  });

  it('OPSX文件不存在时报错', async () => {
    const result = await runCLI(['opsx', 'query', 'cap.cli.list', '--json'], { cwd: tempDir });

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('OPSX files not found');
    expect(result.stderr).toContain('openspec bootstrap init');
    expect(result.stderr).toContain('openspec init');
  });

  it('过滤参数按预期工作', async () => {
    await writeOpsxProject();

    const relationsResult = await runCLI(
      ['opsx', 'query', 'cap.cli.list', '--relations', '--json'],
      { cwd: tempDir }
    );
    const relationsOutput = JSON.parse(relationsResult.stdout);
    expect(relationsResult.exitCode).toBe(0);
    expect(relationsOutput.node.id).toBe('cap.cli.list');
    expect(relationsOutput.relations).toBeDefined();
    expect(relationsOutput).not.toHaveProperty('codeMap');

    const codeMapResult = await runCLI(
      ['opsx', 'query', 'cap.cli.list', '--code-map', '--json'],
      { cwd: tempDir }
    );
    const codeMapOutput = JSON.parse(codeMapResult.stdout);
    expect(codeMapResult.exitCode).toBe(0);
    expect(codeMapOutput.node.id).toBe('cap.cli.list');
    expect(codeMapOutput.codeMap).toEqual([
      { path: 'src/core/list.ts', line_start: 1, line_end: 40 },
    ]);
    expect(codeMapOutput).not.toHaveProperty('relations');

    const fullResult = await runCLI(
      ['opsx', 'query', 'cap.cli.list', '--relations', '--code-map', '--json'],
      { cwd: tempDir }
    );
    const fullOutput = JSON.parse(fullResult.stdout);
    expect(fullResult.exitCode).toBe(0);
    expect(fullOutput.relations).toBeDefined();
    expect(fullOutput.codeMap).toBeDefined();
  });

  it('节点无关系或code-map引用时返回空数组', async () => {
    await writeOpsxProject();

    const result = await runCLI(['opsx', 'query', 'cap.cli.unused', '--json'], { cwd: tempDir });

    expect(result.exitCode).toBe(0);
    const output = JSON.parse(result.stdout);
    expect(output.relations).toEqual({ incoming: [], outgoing: [] });
    expect(output.codeMap).toEqual([]);
  });

  it('批量查询返回去重子图并记录部分缺失', async () => {
    await writeOpsxProject();

    const result = await runCLI(
      ['opsx', 'query', 'cap.cli.list', 'cap.cli.show', 'cap.missing', '--json'],
      { cwd: tempDir }
    );

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    const output = JSON.parse(result.stdout);
    expect(output.seeds).toEqual(['cap.cli.list', 'cap.cli.show']);
    expect(output.missing).toEqual(['cap.missing']);
    expect(output.nodes.map((node: { id: string }) => node.id)).toEqual([
      'cap.cli.list',
      'cap.cli.show',
      'dom.cli',
      'cap.cli.opsx-query',
    ]);
    expect(output.relations).toEqual([
      { from: 'cap.cli.list', to: 'dom.cli', type: 'contains' },
      { from: 'cap.cli.opsx-query', to: 'cap.cli.list', type: 'depends_on' },
      { from: 'cap.cli.show', to: 'cap.cli.list', type: 'depends_on' },
    ]);
    expect(output.codeMap).toEqual({
      'cap.cli.list': [{ path: 'src/core/list.ts', line_start: 1, line_end: 40 }],
      'cap.cli.show': [{ path: 'src/core/show.ts' }],
      'dom.cli': [],
      'cap.cli.opsx-query': [],
    });
  });

  it('批量查询全部缺失时报错并保留可用节点提示', async () => {
    await writeOpsxProject();

    const result = await runCLI(
      ['opsx', 'query', 'cap.nope1', 'cap.nope2', '--json'],
      { cwd: tempDir }
    );

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('not found in OPSX');
    expect(result.stderr).toContain('cap.cli.list');
  });

  it('depth展开覆盖双向二跳并去重', async () => {
    await writeOpsxProject();

    const result = await runCLI(
      ['opsx', 'query', 'cap.cli.opsx-query', '--depth', '2', '--json'],
      { cwd: tempDir }
    );

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    const output = JSON.parse(result.stdout);
    const nodeIds = output.nodes.map((node: { id: string }) => node.id);
    const relationKeys = output.relations.map((relation: { from: string; to: string; type: string }) => (
      `${relation.from}|${relation.type}|${relation.to}`
    ));
    expect(nodeIds).toEqual(['cap.cli.opsx-query', 'cap.cli.list', 'dom.cli', 'cap.cli.show']);
    expect(new Set(nodeIds).size).toBe(nodeIds.length);
    expect(relationKeys).toEqual([
      'cap.cli.list|contains|dom.cli',
      'cap.cli.opsx-query|depends_on|cap.cli.list',
      'cap.cli.show|depends_on|cap.cli.list',
    ]);
    expect(new Set(relationKeys).size).toBe(relationKeys.length);
  });

  it('非法depth参数报错', async () => {
    await writeOpsxProject();

    const overLimit = await runCLI(
      ['opsx', 'query', 'cap.cli.list', '--depth', '6', '--json'],
      { cwd: tempDir }
    );
    const zero = await runCLI(
      ['opsx', 'query', 'cap.cli.list', '--depth', '0', '--json'],
      { cwd: tempDir }
    );
    const text = await runCLI(
      ['opsx', 'query', 'cap.cli.list', '--depth', 'abc', '--json'],
      { cwd: tempDir }
    );

    expect(overLimit.exitCode).toBe(1);
    expect(overLimit.stderr).toContain('--depth');
    expect(overLimit.stderr).toContain('1 到 5');
    expect(zero.exitCode).toBe(1);
    expect(zero.stderr).toContain('正整数');
    expect(text.exitCode).toBe(1);
    expect(text.stderr).toContain('正整数');
  });

  it('子图过滤参数作用于整个输出', async () => {
    await writeOpsxProject();

    const relationsResult = await runCLI(
      ['opsx', 'query', 'cap.cli.list', 'cap.cli.show', '--relations', '--json'],
      { cwd: tempDir }
    );
    const relationsOutput = JSON.parse(relationsResult.stdout);
    expect(relationsResult.exitCode).toBe(0);
    expect(relationsOutput.seeds).toEqual(['cap.cli.list', 'cap.cli.show']);
    expect(relationsOutput.nodes).toBeDefined();
    expect(relationsOutput.missing).toEqual([]);
    expect(relationsOutput.relations).toBeDefined();
    expect(relationsOutput).not.toHaveProperty('codeMap');

    const codeMapResult = await runCLI(
      ['opsx', 'query', 'cap.cli.list', 'cap.cli.show', '--code-map', '--json'],
      { cwd: tempDir }
    );
    const codeMapOutput = JSON.parse(codeMapResult.stdout);
    expect(codeMapResult.exitCode).toBe(0);
    expect(codeMapOutput.seeds).toEqual(['cap.cli.list', 'cap.cli.show']);
    expect(codeMapOutput.nodes).toBeDefined();
    expect(codeMapOutput.missing).toEqual([]);
    expect(codeMapOutput.codeMap).toBeDefined();
    expect(codeMapOutput).not.toHaveProperty('relations');
  });

  it('code-map文件不存在时报错', async () => {
    await writeOpsxProject();
    await fs.rm(path.join(tempDir, 'openspec', 'project.opsx.code-map.yaml'));

    const result = await runCLI(['opsx', 'query', 'cap.cli.list', '--json'], { cwd: tempDir });

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('OPSX code-map file not found');
  });
});
