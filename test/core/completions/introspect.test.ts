import { describe, it, expect } from 'vitest';
import { Command } from 'commander';
import { introspectCommands } from '../../../src/core/completions/introspect.js';

describe('introspect', () => {
  it('提取顶层命令基本信息', () => {
    const program = new Command();
    program
      .command('validate')
      .description('Validate changes and specs');

    const result = introspectCommands(program);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('validate');
    expect(result[0].description).toBe('Validate changes and specs');
  });

  it('递归提取子命令', () => {
    const program = new Command();
    const specCmd = program
      .command('spec')
      .description('Manage specs');

    specCmd
      .command('show')
      .description('Show a spec');

    specCmd
      .command('validate')
      .description('Validate a spec');

    const result = introspectCommands(program);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('spec');
    expect(result[0].subcommands).toHaveLength(2);
    expect(result[0].subcommands?.[0].name).toBe('show');
    expect(result[0].subcommands?.[1].name).toBe('validate');
  });

  it('提取 flag 定义', () => {
    const program = new Command();
    program
      .command('list')
      .description('List items')
      .option('--json', 'Output as JSON')
      .option('-y, --yes', 'Skip confirmation');

    const result = introspectCommands(program);

    expect(result[0].flags).toHaveLength(2);

    const jsonFlag = result[0].flags.find(f => f.name === 'json');
    expect(jsonFlag).toBeDefined();
    expect(jsonFlag?.description).toBe('Output as JSON');
    expect(jsonFlag?.takesValue).toBe(false);

    const yesFlag = result[0].flags.find(f => f.name === 'yes');
    expect(yesFlag).toBeDefined();
    expect(yesFlag?.short).toBe('y');
  });

  it('提取带参数值的 flags', () => {
    const program = new Command();
    const cmd = program
      .command('validate')
      .description('Validate items');

    const typeOption = cmd.createOption('--type <type>', 'Specify type')
      .choices(['change', 'spec']);
    cmd.addOption(typeOption);

    const result = introspectCommands(program);

    const typeFlag = result[0].flags.find(f => f.name === 'type');
    expect(typeFlag).toBeDefined();
    expect(typeFlag?.takesValue).toBe(true);
    expect(typeFlag?.values).toEqual(['change', 'spec']);
  });

  it('提取位置参数', () => {
    const program = new Command();
    program
      .command('validate [item-name]')
      .description('Validate an item');

    const result = introspectCommands(program);

    expect(result[0].acceptsPositional).toBe(true);
  });

  it('过滤 hidden 命令', () => {
    const program = new Command();
    program
      .command('list')
      .description('List items');

    program
      .command('experimental', { hidden: true })
      .description('Experimental command');

    program
      .command('__complete', { hidden: true })
      .description('Internal completion');

    const result = introspectCommands(program);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('list');
  });

  it('合并 positionalType 从 POSITIONAL_TYPE_MAP', () => {
    const program = new Command();
    program
      .command('archive [change-name]')
      .description('Archive a change');

    const result = introspectCommands(program);

    expect(result[0].acceptsPositional).toBe(true);
    expect(result[0].positionalType).toBe('change-id');
  });

  it('嵌套子命令的 positionalType 注入', () => {
    const program = new Command();
    const specCmd = program
      .command('spec')
      .description('Manage specs');

    specCmd
      .command('show [spec-id]')
      .description('Show a spec');

    const result = introspectCommands(program);

    expect(result[0].subcommands).toHaveLength(1);
    expect(result[0].subcommands?.[0].positionalType).toBe('spec-id');
  });

  it('过滤 negate options', () => {
    const program = new Command();
    program
      .command('archive')
      .description('Archive a change')
      .option('--no-validate', 'Skip validation');

    const result = introspectCommands(program);

    // Commander.js converts --no-xxx to a boolean flag stored as xxx (no "no-" prefix)
    // The negate flag should be filtered out, leaving no flags
    const flags = result[0].flags;

    // Since --no-validate creates a negate option, it should be filtered
    expect(flags).toHaveLength(0);
  });

  it('排除 --help 和 --version', () => {
    const program = new Command();
    program
      .command('list')
      .description('List items');

    const result = introspectCommands(program);

    const helpFlag = result[0].flags.find(f => f.name === 'help');
    const versionFlag = result[0].flags.find(f => f.name === 'version');

    expect(helpFlag).toBeUndefined();
    expect(versionFlag).toBeUndefined();
  });
});
