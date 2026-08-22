import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const e02Dir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/e02/unit/**/*.test.ts', 'tests/e02/integration/**/*.test.ts'],
    passWithNoTests: false,
  },
  resolve: {
    alias: {
      '@': path.resolve(e02Dir, '../../src'),
    },
  },
});
