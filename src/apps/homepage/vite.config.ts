import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  publicDir: fileURLToPath(new URL('../../../public/homepage', import.meta.url)),
  plugins: [react()],
  server: {
    host: true,
    port: 3002,
    strictPort: true,
    proxy: {
      '/docs': {
        target: process.env.HABSUM_DOCS_URL || 'http://localhost:3003',
        ws: true,
      },
    },
    watch: {
      usePolling: process.env.CHOKIDAR_USEPOLLING === 'true',
    },
  },
  resolve: {
    dedupe: ['react', 'react-dom', 'react/jsx-runtime'],
  },
  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern',
        loadPaths: [fileURLToPath(new URL('../../packages/ui/src/styles', import.meta.url))],
      },
    },
  },
});
