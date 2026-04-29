import { Links, Meta, Outlet, Scripts, ScrollRestoration } from '@remix-run/react';
import type { LinksFunction, MetaFunction } from '@remix-run/node';

import stylesHref from '~/styles/main.scss?url';

export const links: LinksFunction = () => [
  { rel: 'stylesheet', href: stylesHref },
  { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
];

export const meta: MetaFunction = () => [{ title: 'habsum' }];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

// SPA mode (`ssr: false`) uses this to generate `index.html`.
export function HydrateFallback() {
  return (
    <div className="app">
      <div className="app__content">
        <div className="container">
          <h1 className="text-h-xl">habsum</h1>
          <p className="text-light text-b-m">Loading…</p>
        </div>
      </div>
    </div>
  );
}
