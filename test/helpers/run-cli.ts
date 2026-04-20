import path from 'path';
import { format } from 'util';
import { fileURLToPath, pathToFileURL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, '..', '..');
const cliEntry = path.join(projectRoot, 'src', 'cli', 'index.ts');
let cliModulePromise: Promise<{ runCli: (argv: string[]) => Promise<void> }> | undefined;

interface RunCLIOptions {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  input?: string;
  timeoutMs?: number;
}

export interface RunCLIResult {
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
  command: string;
}

export async function runCLI(args: string[] = [], options: RunCLIOptions = {}): Promise<RunCLIResult> {
  const finalArgs = Array.isArray(args) ? args : [args];
  const invocation = [cliEntry, ...finalArgs].join(' ');
  const argv = [process.execPath, cliEntry, ...finalArgs];

  let stdout = '';
  let stderr = '';
  let exitCode: number | null = 0;
  let timedOut = false;

  const originalCwd = process.cwd();
  const originalStdoutWrite = process.stdout.write;
  const originalStderrWrite = process.stderr.write;
  const originalExit = process.exit;
  const originalConsole = globalThis.console;
  const originalExitCode = process.exitCode;
  const env = { OPEN_SPEC_INTERACTIVE: '0', ...options.env };
  const envBackup = new Map<string, string | undefined>();
  const exitSignal = Symbol('run-cli-exit');
  let timeoutHandle: NodeJS.Timeout | undefined;

  const writeTo = (target: 'stdout' | 'stderr', chunk: unknown, encoding?: BufferEncoding) => {
    const text = Buffer.isBuffer(chunk)
      ? chunk.toString(encoding ?? 'utf-8')
      : String(chunk);
    if (target === 'stdout') {
      stdout += text;
    } else {
      stderr += text;
    }
  };

  process.stdout.write = ((chunk: unknown, encoding?: BufferEncoding | (() => void), callback?: () => void) => {
    writeTo('stdout', chunk, typeof encoding === 'string' ? encoding : undefined);
    if (typeof encoding === 'function') {
      encoding();
    } else if (callback) {
      callback();
    }
    return true;
  }) as typeof process.stdout.write;

  process.stderr.write = ((chunk: unknown, encoding?: BufferEncoding | (() => void), callback?: () => void) => {
    writeTo('stderr', chunk, typeof encoding === 'string' ? encoding : undefined);
    if (typeof encoding === 'function') {
      encoding();
    } else if (callback) {
      callback();
    }
    return true;
  }) as typeof process.stderr.write;

  process.exit = ((code?: string | number | null | undefined) => {
    exitCode = typeof code === 'number' ? code : Number(code ?? 0);
    throw exitSignal;
  }) as typeof process.exit;

  const capturedConsole = Object.create(originalConsole) as Console;
  capturedConsole.log = (...items: unknown[]) => {
    stdout += `${format(...items)}\n`;
  };
  capturedConsole.info = (...items: unknown[]) => {
    stdout += `${format(...items)}\n`;
  };
  capturedConsole.warn = (...items: unknown[]) => {
    stderr += `${format(...items)}\n`;
  };
  capturedConsole.error = (...items: unknown[]) => {
    stderr += `${format(...items)}\n`;
  };
  globalThis.console = capturedConsole;

  try {
    process.chdir(options.cwd ?? projectRoot);
    process.exitCode = undefined;

    for (const [key, value] of Object.entries(env)) {
      envBackup.set(key, process.env[key]);
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }

    if (!cliModulePromise) {
      cliModulePromise = import(pathToFileURL(cliEntry).href) as Promise<{
        runCli: (argv: string[]) => Promise<void>;
      }>;
    }

    const { runCli } = await cliModulePromise;
    const execution = runCli(argv);

    if (options.timeoutMs) {
      await Promise.race([
        execution,
        new Promise<void>((resolve) => {
          timeoutHandle = setTimeout(() => {
            timedOut = true;
            exitCode = null;
            resolve();
          }, options.timeoutMs);
          timeoutHandle.unref?.();
        }),
      ]);
    } else {
      await execution;
    }

    if (exitCode === 0 && typeof process.exitCode === 'number') {
      exitCode = process.exitCode;
    }
  } catch (error) {
    if (error !== exitSignal) {
      exitCode = 1;
      stderr += error instanceof Error ? `${error.stack ?? error.message}\n` : `${String(error)}\n`;
    }
  } finally {
    process.stdout.write = originalStdoutWrite;
    process.stderr.write = originalStderrWrite;
    process.exit = originalExit;
    process.exitCode = originalExitCode;
    globalThis.console = originalConsole;
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }

    for (const [key, value] of envBackup) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }

    process.chdir(originalCwd);
  }

  return {
    exitCode,
    signal: null,
    stdout,
    stderr,
    timedOut,
    command: `node ${invocation}`,
  };
}

export async function ensureCliBuilt(): Promise<void> {
  // The CLI is executed in-process from source during tests.
}

export const cliProjectRoot = projectRoot;
