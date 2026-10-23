import { fileURLToPath } from 'node:url';
import starlight from '@astrojs/starlight';
import { defineConfig } from 'astro/config';

export default defineConfig({
  base: process.env.DOCS_BASE_PATH || '/docs',
  site: process.env.DOCS_SITE_URL,
  trailingSlash: 'always',
  // The homepage builds first, then Starlight fills its /docs directory.
  outDir: fileURLToPath(new URL('../homepage/dist/docs/', import.meta.url)),
  server: {
    host: true,
    // src/middleware.ts sends development asset requests directly to this port.
    port: 3003,
  },
  vite: {
    server: {
      strictPort: true,
      watch: {
        usePolling: process.env.CHOKIDAR_USEPOLLING === 'true',
      },
    },
  },
  integrations: [
    starlight({
      title: 'Habsum Docs',
      sidebar: [
        { label: 'Install', autogenerate: { directory: 'overview' } },
        { label: 'Development', autogenerate: { directory: 'development' } },
      ],
      customCss: ['./src/styles/docs-theme.scss'],
      components: {
        SiteTitle: './src/components/DocsBrand.astro',
        SocialIcons: './src/components/DocsHeaderLinks.astro',
      },
      social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/mlisbit/habsum' }],
    }),
  ],
});
