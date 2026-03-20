import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { CompletionCommand } from '../../src/commands/completion.js';
import { COMMAND_REGISTRY } from '../../src/core/completions/command-registry.js';
import * as shellDetection from '../../src/utils/shell-detection.js';

// Mock the shell detection module
vi.mock('../../src/utils/shell-detection.js', () => ({
  detectShell: vi.fn(),
}));

// Mock the ZshInstaller
vi.mock('../../src/core/completions/installers/zsh-installer.js', () => ({
  ZshInstaller: vi.fn().mockImplementation(() => ({
    install: vi.fn().mockResolvedValue({
      success: true,
      installedPath: '/home/user/.oh-my-zsh/completions/_openspec',
      isOhMyZsh: true,
      message: 'Completion script installed successfully for Oh My Zsh',
      instructions: [
        'Completion script installed to Oh My Zsh completions directory.',
        'Restart your shell or run: exec zsh',
        'Completions should activate automatically.',
      ],
    }),
    uninstall: vi.fn().mockResolvedValue({
      success: true,
      message: 'Completion script removed from /home/user/.oh-my-zsh/completions/_openspec',
    }),
  })),
}));

describe('CompletionCommand', () => {
  let command: CompletionCommand;
  let consoleLogSpy: any;
  let consoleErrorSpy: any;

  beforeEach(() => {
    command = new CompletionCommand();
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    process.exitCode = 0;
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    vi.clearAllMocks();
  });

  describe('generate subcommand', () => {
    it('should generate Zsh completion script to stdout', async () => {
      await command.generate({ shell: 'zsh' });

      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls[0][0];
      expect(output).toContain('#compdef openspec');
      expect(output).toContain('_openspec() {');
    });

    it('should auto-detect Zsh shell when no shell specified', async () => {
      vi.mocked(shellDetection.detectShell).mockReturnValue({ shell: 'zsh', detected: 'zsh' });

      await command.generate({});

      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls[0][0];
      expect(output).toContain('#compdef openspec');
    });

    it('should show error when shell cannot be auto-detected', async () => {
      vi.mocked(shellDetection.detectShell).mockReturnValue({ shell: undefined, detected: undefined });

      await command.generate({});

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error: Could not auto-detect shell. Please specify shell explicitly.'
      );
      expect(process.exitCode).toBe(1);
    });

    it('should show error for unsupported shell', async () => {
      await command.generate({ shell: 'tcsh' });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error: Shell 'tcsh' is not supported yet. Currently supported: zsh, bash, fish, powershell"
      );
      expect(process.exitCode).toBe(1);
    });

    it('should handle shell parameter case-insensitively', async () => {
      await command.generate({ shell: 'ZSH' });

      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls[0][0];
      expect(output).toContain('#compdef openspec');
    });
  });

  describe('install subcommand', () => {
    it('should install Zsh completion script', async () => {
      await command.install({ shell: 'zsh' });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Completion script installed successfully')
      );
      expect(process.exitCode).toBe(0);
    });

    it('should show verbose output when --verbose flag is provided', async () => {
      await command.install({ shell: 'zsh', verbose: true });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Installed to:')
      );
    });

    it('should auto-detect Zsh shell when no shell specified', async () => {
      vi.mocked(shellDetection.detectShell).mockReturnValue({ shell: 'zsh', detected: 'zsh' });

      await command.install({});

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Completion script installed successfully')
      );
    });

    it('should show error when shell cannot be auto-detected', async () => {
      vi.mocked(shellDetection.detectShell).mockReturnValue({ shell: undefined, detected: undefined });

      await command.install({});

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error: Could not auto-detect shell. Please specify shell explicitly.'
      );
      expect(process.exitCode).toBe(1);
    });

    it('should show error for unsupported shell', async () => {
      await command.install({ shell: 'tcsh' });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error: Shell 'tcsh' is not supported yet. Currently supported: zsh, bash, fish, powershell"
      );
      expect(process.exitCode).toBe(1);
    });

    it('should display installation instructions', async () => {
      await command.install({ shell: 'zsh' });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Restart your shell or run: exec zsh')
      );
    });
  });

  describe('uninstall subcommand', () => {
    it('should uninstall Zsh completion script', async () => {
      await command.uninstall({ shell: 'zsh', yes: true });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Completion script removed')
      );
      expect(process.exitCode).toBe(0);
    });

    it('should auto-detect Zsh shell when no shell specified', async () => {
      vi.mocked(shellDetection.detectShell).mockReturnValue({ shell: 'zsh', detected: 'zsh' });

      await command.uninstall({ yes: true });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Completion script removed')
      );
    });

    it('should show error when shell cannot be auto-detected', async () => {
      vi.mocked(shellDetection.detectShell).mockReturnValue({ shell: undefined, detected: undefined });

      await command.uninstall({ yes: true });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error: Could not auto-detect shell. Please specify shell explicitly.'
      );
      expect(process.exitCode).toBe(1);
    });

    it('should show error for unsupported shell', async () => {
      await command.uninstall({ shell: 'tcsh', yes: true });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error: Shell 'tcsh' is not supported yet. Currently supported: zsh, bash, fish, powershell"
      );
      expect(process.exitCode).toBe(1);
    });
  });

  describe('error handling', () => {
    it('should handle installation failures gracefully', async () => {
      const { ZshInstaller } = await import('../../src/core/completions/installers/zsh-installer.js');
      vi.mocked(ZshInstaller).mockImplementationOnce(() => ({
        install: vi.fn().mockResolvedValue({
          success: false,
          isOhMyZsh: false,
          message: 'Permission denied',
        }),
        uninstall: vi.fn(),
        isInstalled: vi.fn(),
        getInstallationInfo: vi.fn(),
        isOhMyZshInstalled: vi.fn(),
        getInstallationPath: vi.fn(),
        backupExistingFile: vi.fn(),
      } as any));

      const cmd = new CompletionCommand();
      await cmd.install({ shell: 'zsh' });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Permission denied')
      );
      expect(process.exitCode).toBe(1);
    });

    it('should handle uninstallation failures gracefully', async () => {
      const { ZshInstaller } = await import('../../src/core/completions/installers/zsh-installer.js');
      vi.mocked(ZshInstaller).mockImplementationOnce(() => ({
        install: vi.fn(),
        uninstall: vi.fn().mockResolvedValue({
          success: false,
          message: 'Completion script is not installed',
        }),
        isInstalled: vi.fn(),
        getInstallationInfo: vi.fn(),
        isOhMyZshInstalled: vi.fn(),
        getInstallationPath: vi.fn(),
        backupExistingFile: vi.fn(),
      } as any));

      const cmd = new CompletionCommand();
      await cmd.uninstall({ shell: 'zsh', yes: true });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Completion script is not installed')
      );
      expect(process.exitCode).toBe(1);
    });
  });

  describe('shell detection integration', () => {
    it('should show appropriate error when detected shell is unsupported', async () => {
      vi.mocked(shellDetection.detectShell).mockReturnValue({ shell: undefined, detected: 'tcsh' });

      await command.generate({});

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error: Shell 'tcsh' is not supported yet. Currently supported: zsh, bash, fish, powershell"
      );
      expect(process.exitCode).toBe(1);
    });

    it('should respect explicit shell parameter over auto-detection', async () => {
      vi.mocked(shellDetection.detectShell).mockReturnValue({ shell: undefined, detected: 'bash' });

      await command.generate({ shell: 'zsh' });

      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls[0][0];
      expect(output).toContain('#compdef openspec');
    });
  });
});

describe('completion registry coverage', () => {
  it('registers the workflow and bootstrap command surfaces exposed by the CLI', () => {
    const topLevelNames = COMMAND_REGISTRY.map((command) => command.name);
    expect(topLevelNames).toEqual(expect.arrayContaining([
      'sync',
      'status',
      'instructions',
      'templates',
      'schemas',
      'new',
      'bootstrap',
    ]));

    const sync = COMMAND_REGISTRY.find((command) => command.name === 'sync');
    expect(sync?.acceptsPositional).toBe(true);
    expect(sync?.positionalType).toBe('change-id');
    expect(sync?.flags.map((flag) => flag.name)).toContain('no-validate');

    const status = COMMAND_REGISTRY.find((command) => command.name === 'status');
    expect(status?.flags.map((flag) => flag.name)).toEqual(expect.arrayContaining(['change', 'schema', 'json']));

    const instructions = COMMAND_REGISTRY.find((command) => command.name === 'instructions');
    expect(instructions?.acceptsPositional).toBe(true);
    expect(instructions?.flags.map((flag) => flag.name)).toEqual(expect.arrayContaining(['change', 'schema', 'json']));

    const templates = COMMAND_REGISTRY.find((command) => command.name === 'templates');
    expect(templates?.flags.map((flag) => flag.name)).toEqual(expect.arrayContaining(['schema', 'json']));

    const schemas = COMMAND_REGISTRY.find((command) => command.name === 'schemas');
    expect(schemas?.flags.map((flag) => flag.name)).toContain('json');

    const newCommand = COMMAND_REGISTRY.find((command) => command.name === 'new');
    const newChange = newCommand?.subcommands?.find((command) => command.name === 'change');
    expect(newChange?.acceptsPositional).toBe(true);
    expect(newChange?.flags.map((flag) => flag.name)).toEqual(expect.arrayContaining(['description', 'schema']));

    const bootstrap = COMMAND_REGISTRY.find((command) => command.name === 'bootstrap');
    expect(bootstrap?.subcommands?.map((command) => command.name)).toEqual(expect.arrayContaining([
      'init',
      'status',
      'instructions',
      'validate',
      'promote',
    ]));

    const bootstrapInit = bootstrap?.subcommands?.find((command) => command.name === 'init');
    expect(bootstrapInit?.flags).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'mode', takesValue: true, values: ['full', 'opsx-first'] }),
      expect.objectContaining({ name: 'scope', takesValue: true }),
    ]));

    const bootstrapInstructions = bootstrap?.subcommands?.find((command) => command.name === 'instructions');
    expect(bootstrapInstructions?.acceptsPositional).toBe(true);

    const bootstrapPromote = bootstrap?.subcommands?.find((command) => command.name === 'promote');
    expect(bootstrapPromote?.flags).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'yes', short: 'y' }),
    ]));
  });
});
