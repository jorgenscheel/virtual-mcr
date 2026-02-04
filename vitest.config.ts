import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['packages/*/src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: [
        'packages/worker/src/middleware/**/*.ts',
        'packages/worker/src/routes/**/*.ts',
        'packages/worker/src/services/source-service.ts',
        'packages/worker/src/middleware/request-logger.ts',
      ],
      exclude: [
        'packages/*/src/**/*.test.ts',
      ],
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
      },
    },
  },
});
