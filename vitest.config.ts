import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@path-ioc/core': path.resolve(__dirname, './packages/core/src/index.ts'),
      '@path-ioc/container': path.resolve(__dirname, './packages/container/src/index.ts'),
      '@path-ioc/unplugin': path.resolve(__dirname, './packages/unplugin/src/index.ts'),
      '@path-ioc/pack': path.resolve(__dirname, './packages/pack/src/index.ts')
    }
  },
  test: {
    projects: [
      {
        test: {
          name: 'unit',
          include: ['packages/**/*.test.ts']
        }
      }
    ],
    coverage: {
      provider: 'v8',
      include: ['packages/**/*.ts']
    }
  }
});
