import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: ['node_modules', 'dist', 'build'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'coverage/**',
        'dist/**',
        'node_modules/**',
        'src/**/*.d.ts',
        'src/**/*.test.ts',
        'src/**/*.spec.ts'
      ]
    },
    setupFiles: ['./src/__tests__/setup.ts']
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@mcas-life/shared': resolve(__dirname, '../shared/src')
    }
  }
});