import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mdx from '@mdx-js/rollup';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    { enforce: 'pre', ...mdx() },
    react({ include: /\.(jsx|js|mdx|md|tsx|ts)$/ }),
    tsconfigPaths(),
  ],
  test: {
    environment: 'jsdom',
    include: ['app/**/*.test.{ts,tsx}'],
    passWithNoTests: false,
  },
  resolve: {
    alias: {
      '~': path.resolve(__dirname, 'app'),
    },
  },
});
