import { describe, it, expect } from 'vitest';
import { Command } from 'commander';
import { introspectCommands } from '../../../src/core/completions/introspect.js';
import { ZshGenerator } from '../../../src/core/completions/generators/zsh-generator.js';
import { BashGenerator } from '../../../src/core/completions/generators/bash-generator.js';

// Import the actual CLI program builder to test against real structure
async function buildRealProgram(): Promise<Command> {
  // We can't directly import and run the full CLI setup due to side effects,
  // so we'll build a representative subset that covers all command patterns
  const program = new Command();
  program.name('openspec').description('AI-native system for spec-driven development');

  // Top-level commands with various patterns
  program.command('init [path]').description('Initialize OpenSpec in your project');
  program.command('list').description('List items').option('--specs', 'List specs').option('--json', 'Output as JSON');
  program.command('validate [item-name]').description('Validate changes and specs').option('--strict', 'Strict mode');
  program.command('show [item-name]').description('Show a change or spec').option('--json', 'Output as JSON');
  program.command('archive [change-name]').description('Archive a change').option('--no-validate', 'Skip validation');

  // Commands with subcommands
  const specCmd = program.command('spec').description('Manage specs');
  specCmd.command('show [spec-id]').description('Show a spec').option('--json', 'Output as JSON');
  specCmd.command('validate [spec-id]').description('Validate a spec').option('--strict', 'Strict mode');

  const completionCmd = program.command('completion').description('Manage shell completions');
  completionCmd.command('generate [shell]').description('Generate completion script');
  completionCmd.command('install [shell]').description('Install completion script').option('--verbose', 'Verbose output');

  const configCmd = program.command('config').description('View and modify config');
  const scopeOpt = configCmd.createOption('--scope <scope>', 'Config scope').choices(['global']);
  configCmd.addOption(scopeOpt);
  configCmd.command('list').description('List settings').option('--json', 'Output as JSON');
  configCmd.command('get [key]').description('Get a value');
  configCmd.command('set [key]').description('Set a value').option('--string', 'Force string type');

  const verifyCmd = program.command('verify').description('Verification gates');
  verifyCmd.command('phase1 [change-id]').description('Run phase 1').option('--json', 'Output as JSON');
  verifyCmd.command('phase2 [change-id]').description('Run phase 2').option('--type <type>', 'Type').option('--json', 'Output as JSON');

  // Hidden command (should be filtered)
  program.command('__complete <type>', { hidden: true }).description('Internal completion');

  return program;
}

describe('introspect-regression', () => {
  it('Zsh 补全脚本覆盖率：包含所有命令和 flags', async () => {
    const program = await buildRealProgram();
    const commands = introspectCommands(program);

    const generator = new ZshGenerator();
    const script = generator.generate(commands);

    // 验证基本结构
    expect(script).toContain('#compdef openspec');
    expect(script).toContain('_openspec() {');

    // 验证顶层命令
    expect(script).toContain("'init:Initialize OpenSpec");
    expect(script).toContain("'list:List items");
    expect(script).toContain("'validate:Validate changes");
    expect(script).toContain("'show:Show a change");
    expect(script).toContain("'archive:Archive a change");

    // 验证子命令
    expect(script).toContain("'spec:Manage specs");
    expect(script).toContain("'completion:Manage shell completions");
    expect(script).toContain("'config:View and modify config");
    expect(script).toContain("'verify:Verification gates");

    // 验证 flags
    expect(script).toContain('--json');
    expect(script).toContain('--strict');
    expect(script).toContain('--verbose');

    // 验证动态补全函数引用（针对 positionalType）
    expect(script).toContain('_openspec_complete_changes'); // For change-id
    expect(script).toContain('_openspec_complete_specs'); // For spec-id
  });

  it('Bash 补全脚本覆盖率：包含所有命令和 flags', async () => {
    const program = await buildRealProgram();
    const commands = introspectCommands(program);

    const generator = new BashGenerator();
    const script = generator.generate(commands);

    // 验证基本结构
    expect(script).toContain('_openspec_completion()');
    expect(script).toContain('COMPREPLY=()');

    // 验证顶层命令列表
    expect(script).toContain('init');
    expect(script).toContain('list');
    expect(script).toContain('validate');
    expect(script).toContain('show');
    expect(script).toContain('archive');
    expect(script).toContain('spec');
    expect(script).toContain('completion');
    expect(script).toContain('config');
    expect(script).toContain('verify');

    // 验证 flags
    expect(script).toContain('--json');
    expect(script).toContain('--strict');
    expect(script).toContain('--verbose');

    // 验证补全注册
    expect(script).toContain('complete -F _openspec_completion openspec');
  });

  it('验证 positionalType 合并后动态补全函数引用正确', async () => {
    const program = await buildRealProgram();
    const commands = introspectCommands(program);

    // 找到 archive 命令（应该有 positionalType: 'change-id'）
    const archiveCmd = commands.find(c => c.name === 'archive');
    expect(archiveCmd?.acceptsPositional).toBe(true);
    expect(archiveCmd?.positionalType).toBe('change-id');

    // 找到 spec.show（应该有 positionalType: 'spec-id'）
    const specCmd = commands.find(c => c.name === 'spec');
    const specShowCmd = specCmd?.subcommands?.find(c => c.name === 'show');
    expect(specShowCmd?.acceptsPositional).toBe(true);
    expect(specShowCmd?.positionalType).toBe('spec-id');

    // 找到 completion.generate（应该有 positionalType: 'shell'）
    const completionCmd = commands.find(c => c.name === 'completion');
    const generateCmd = completionCmd?.subcommands?.find(c => c.name === 'generate');
    expect(generateCmd?.acceptsPositional).toBe(true);
    expect(generateCmd?.positionalType).toBe('shell');

    // 验证 Zsh 生成器正确引用动态补全类型
    const zshGenerator = new ZshGenerator();
    const zshScript = zshGenerator.generate(commands);

    // change-id 和 spec-id 类型会生成对应的补全函数
    expect(zshScript).toContain('_openspec_complete_changes');
    expect(zshScript).toContain('_openspec_complete_specs');

    // shell 类型使用固定值补全，不生成动态函数
    expect(zshScript).toContain('zsh');
    expect(zshScript).toContain('bash');
  });

  it('验证命令树递归结构完整', async () => {
    const program = await buildRealProgram();
    const commands = introspectCommands(program);

    // 验证 config 命令及其子命令
    const configCmd = commands.find(c => c.name === 'config');
    expect(configCmd).toBeDefined();
    expect(configCmd?.subcommands).toBeDefined();
    expect(configCmd?.subcommands?.map(s => s.name)).toContain('list');
    expect(configCmd?.subcommands?.map(s => s.name)).toContain('get');
    expect(configCmd?.subcommands?.map(s => s.name)).toContain('set');

    // 验证 config 顶层 flag
    const scopeFlag = configCmd?.flags?.find(f => f.name === 'scope');
    expect(scopeFlag).toBeDefined();
    expect(scopeFlag?.takesValue).toBe(true);
    expect(scopeFlag?.values).toEqual(['global']);

    // 验证 config.set 的 flags
    const setCmd = configCmd?.subcommands?.find(c => c.name === 'set');
    expect(setCmd?.flags?.map(f => f.name)).toContain('string');
  });

  it('验证 negate options 正确过滤', async () => {
    const program = await buildRealProgram();
    const commands = introspectCommands(program);

    const archiveCmd = commands.find(c => c.name === 'archive');
    const flags = archiveCmd?.flags || [];

    // --no-validate 应该被过滤，不会出现在 flags 列表中
    // 因为 Commander.js 的 negate 处理会将其标记为 negate=true
    const noValidateFlag = flags.find(f => f.name === 'validate' || f.name === 'no-validate');

    // 根据 introspect 实现，negate options 会被过滤
    // 所以这里不应该有任何 validate 相关的 flag
    expect(flags.length).toBe(0);
  });
});
