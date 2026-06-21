import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { vitePlugin as remix } from '@remix-run/dev';
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
    include: [],
  },
  plugins: [
    remix({
      ssr: false,
      ignoredRouteFiles: ['**/*'],
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
            route('forgot-password', 'routes/forgot-password.tsx');
            route('reset-password', 'routes/reset-password.tsx');
            route('users', 'routes/users/_index/route.tsx', { index: true });
            route('users/:user/habits', 'routes/users/$user/habits/route.tsx');
            route('users/:user/habits/detail', 'routes/users/$user/habits/detail/route.tsx');
            route('users/:user/settings', 'routes/users/$user/settings/route.tsx', () => {
              route('', 'routes/users/$user/settings/_index/route.tsx', {
                index: true,
              });
              route('account', 'routes/users/$user/settings/account/route.tsx');
              route('security', 'routes/users/$user/settings/security/route.tsx');
              route('security/password', 'routes/users/$user/settings/security/password/route.tsx');
              route('developer', 'routes/users/$user/settings/developer/route.tsx');
              route('habits', 'routes/users/$user/settings/habits/route.tsx');
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
