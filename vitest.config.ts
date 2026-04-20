import { defineConfig } from 'vitest/config';
import os from 'node:os';

function resolveMaxWorkers(): number | undefined {
  // Allow callers (CI/agents) to override without editing config.
  const raw = process.env.VITEST_MAX_WORKERS;
  if (raw) {
    const parsed = Number(raw);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }

  // The suite mixes filesystem-heavy integration tests, benchmarks, and
  // in-process CLI execution. Keep worker count conservative to reduce
  // contention-driven timeouts in automation while preserving parallelism.
  const cpuCount = typeof os.availableParallelism === 'function'
    ? os.availableParallelism()
    : os.cpus().length;
  return Math.min(2, Math.max(1, cpuCount));
}

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    globalSetup: './vitest.setup.ts',
    // Tests rely on per-file process isolation (e.g., `process.cwd()` assumptions).
    pool: 'forks',
    maxWorkers: resolveMaxWorkers(),
    include: ['test/**/*.test.ts'],
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        'bin/',
        '*.config.ts',
        'build.js',
        'test/**'
      ]
    },
    testTimeout: 30000,
    hookTimeout: 30000,
    teardownTimeout: 3000
  }
});
