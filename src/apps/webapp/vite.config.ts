import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { vitePlugin as remix } from '@remix-run/dev';
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const stylesDir = path.join(__dirname, 'app', 'styles');

export default defineConfig({
  plugins: [
    remix({
      ssr: false,
      future: {
        v3_fetcherPersist: true,
        v3_relativeSplatPath: true,
        v3_throwAbortReason: true,
        v3_singleFetch: true,
        v3_lazyRouteDiscovery: true,
      },
      routes(defineRoutes) {
        return defineRoutes((route) => {
          route('', 'routes/_layout.tsx', () => {
            route('', 'routes/_index/route.tsx', { index: true });
            route('users', 'routes/users/_index/route.tsx', { index: true });
            route('users/:user/habits', 'routes/users/$user/habits/route.tsx');
            route('users/:user/habits/:habitId', 'routes/users/$user/habits/$habitId/route.tsx');
            route('users/:user/settings', 'routes/users/$user/settings/route.tsx', () => {
              route('', 'routes/users/$user/settings/_index/route.tsx', {
                index: true,
              });
              route('account', 'routes/users/$user/settings/account/route.tsx');
              route('config', 'routes/users/$user/settings/config/route.tsx');
            });
          });
        });
      },
    }),
    tsconfigPaths(),
  ],
  css: {
    preprocessorOptions: {
      scss: {
        includePaths: [stylesDir],
        additionalData(source: string, filename?: string) {
          if (!filename) return source;
          const f = filename.split(path.sep).join('/');
          if (!f.includes('/app/styles/')) return source;
          if (f.includes('/app/styles/functions/')) return source;
          if (f.includes('_tokens.scss')) return source;
          if (source.trimStart().startsWith('@use "functions/spacing"')) return source;
          return `@use "functions/spacing" as *;\n${source}`;
        },
      },
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: process.env.HABSUM_DEV_SERVER_URL ?? 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api/, ''),
      },
    },
  },
});
