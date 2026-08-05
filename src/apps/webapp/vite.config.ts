import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { reactRouter } from '@react-router/dev/vite';
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const stylesDir = path.join(__dirname, 'app', 'styles');
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
  optimizeDeps: {
    noDiscovery: true,
    include: ['react-dom'],
  },
  plugins: [reactRouter(), tsconfigPaths()],
  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern',
        loadPaths: [stylesDir, componentLibraryStylesDir, habitRenderStylesDir],
      },
    },
  },
  server: {
    port: 3000,
    strictPort: true,
    proxy: {
      '/api': {
        target: process.env.HABSUM_DEV_SERVER_URL ?? 'http://127.0.0.1:3001',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api/, ''),
      },
    },
  },
});
