import { Link, Links, Meta, Outlet, Scripts, ScrollRestoration } from '@remix-run/react';
import type { LinksFunction, MetaFunction } from '@remix-run/node';
import { useCallback } from 'react';
import type { MeGetResponse } from '@habsum/types/api-responses/me-get';
import { useTracking } from '@habsum/tracking/client/react';
import { OucIndicator } from '~/components/OucIndicator';
import { OucPopupBootstrap } from '~/components/OucPopupBootstrap';
import { ModalProvider } from '@habsum/ui/contexts/modal';
import { ToastProvider } from '@habsum/ui/contexts/toast';
import { UserProvider } from '~/context/user';
import stylesHref from '~/styles/main.scss?url';
import { UI_THEME_STORAGE_KEY } from '~/theme.shared';
import { webappTrackingSpec } from '~/tracking-spec';

export const links: LinksFunction = () => [
  { rel: 'stylesheet', href: stylesHref },
  { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
];

export const meta: MetaFunction = () => [{ title: 'habsum' }];

const initialThemeScript = `
(() => {
  let stored;
  try {
    stored = window.localStorage.getItem('${UI_THEME_STORAGE_KEY}');
  } catch {}
  const preference = stored === 'light' || stored === 'dark' ? stored : null;
  const theme =
    preference ?? (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
  document.documentElement.dataset.theme = theme;
})();
`;

function ToastLink({
  to,
  className,
  onClick,
  children,
}: {
  to: string;
  className?: string;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link to={to} className={className} onClick={onClick}>
      {children}
    </Link>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <script dangerouslySetInnerHTML={{ __html: initialThemeScript }} />
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
  const { resolveIdentity } = useTracking<typeof webappTrackingSpec>();
  const onUserResolution = useCallback(
    (me: MeGetResponse) => resolveIdentity(me.username ?? undefined),
    [resolveIdentity],
  );

  return (
    <ToastProvider linkComponent={ToastLink}>
      <ModalProvider>
        <UserProvider onResolution={onUserResolution}>
          <OucPopupBootstrap />
          <Outlet />
          <OucIndicator />
        </UserProvider>
      </ModalProvider>
    </ToastProvider>
  );
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
