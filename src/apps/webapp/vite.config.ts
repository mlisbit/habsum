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
            route('login', 'routes/login/route.tsx');
            route('users', 'routes/users/_index/route.tsx', { index: true });
            route('users/:user/habits', 'routes/users/$user/habits/route.tsx');
            route('users/:user/habits/detail', 'routes/users/$user/habits/detail/route.tsx');
            route('users/:user/settings', 'routes/users/$user/settings/route.tsx', () => {
              route('', 'routes/users/$user/settings/_index/route.tsx', {
                index: true,
              });
              route('account', 'routes/users/$user/settings/account/route.tsx');
              route('security', 'routes/users/$user/settings/security/route.tsx');
              route('developer', 'routes/users/$user/settings/developer/route.tsx');
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
        api: 'modern',
        loadPaths: [stylesDir],
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
