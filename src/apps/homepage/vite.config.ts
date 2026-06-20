import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const componentLibraryStylesDir = path.resolve(
  __dirname,
  '..',
  '..',
  'packages',
  'ui',
  'src',
  'styles',
);
const habitRenderStylesDir = path.resolve(
  __dirname,
  '..',
  '..',
  'packages',
  'habit-render',
  'src',
  'styles',
);

export default defineConfig({
  resolve: {
    dedupe: ['react', 'react-dom', 'react/jsx-runtime'],
  },
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 3002,
    strictPort: true,
  },
  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern',
        includePaths: [componentLibraryStylesDir, habitRenderStylesDir],
        loadPaths: [componentLibraryStylesDir, habitRenderStylesDir],
      },
    },
  },
});
