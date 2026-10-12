import {
  Link,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  redirect,
  useLoaderData,
} from 'react-router';
import type { LinksFunction, MetaFunction } from 'react-router';
import { useCallback } from 'react';
import type { MeGetResponse } from '@habsum/types/api-responses/me-get';
import type { TrackingProvider } from '@habsum/tracking/client/provider';
import { ConsoleTrackingProvider } from '@habsum/tracking/client/providers/console';
import { NoopTrackingProvider } from '@habsum/tracking/client/providers/noop';
import { TrackingContextProvider, useTracking } from '@habsum/tracking/client/react';
import { OucIndicator } from '~/components/OucIndicator';
import { OucPopupBootstrap } from '~/components/OucPopupBootstrap';
import { ModalProvider } from '@habsum/ui/contexts/modal';
import { ToastProvider } from '@habsum/ui/contexts/toast';
import { AuthProvider } from '~/context/auth';
import { FeaturesProvider } from '~/context/features';
import { getAuthMe as getClientAuthMe } from '~/api.client';
import stylesHref from '~/styles/main.scss?url';
import { UI_THEME_STORAGE_KEY } from '~/theme.shared';
import { webappTrackingSpec } from '~/tracking-spec';
import { getAuthMe as getServerAuthMe, getAuthStatus } from '~/api.server';
import { getOucSessionToken } from '~/ouc.client';
import type { Route } from './+types/root';

const trackingProvider: TrackingProvider = import.meta.env.DEV
  ? new ConsoleTrackingProvider()
  : new NoopTrackingProvider();

export const links: LinksFunction = () => [
  { rel: 'stylesheet', href: stylesHref },
  { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
];

export const meta: MetaFunction = () => [{ title: 'Habsum' }];

export async function loader({ request }: Route.LoaderArgs) {
  const [me, authStatus] = await Promise.all([getServerAuthMe(request), getAuthStatus()]);
  const currentPath = new URL(request.url).pathname.replace(/\/$/, '') || '/';
  if (authStatus.redirectPath && currentPath !== authStatus.redirectPath) {
    return redirect(authStatus.redirectPath);
  }
  if (!authStatus.redirectPath && currentPath === '/welcome') return redirect('/');

  return { me, authStatus };
}

export async function clientLoader({ serverLoader }: Route.ClientLoaderArgs) {
  const serverData = await serverLoader();
  if (getOucSessionToken()) {
    return { ...serverData, me: await getClientAuthMe() };
  }
  return serverData;
}

clientLoader.hydrate = true as const;

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

function AppContent() {
  const { me } = useLoaderData<typeof loader>();
  const { resolveIdentity } = useTracking<typeof webappTrackingSpec>();
  const onUserResolution = useCallback(
    (me: MeGetResponse) => resolveIdentity(me.username ?? undefined),
    [resolveIdentity],
  );

  return (
    <ToastProvider linkComponent={ToastLink}>
      <ModalProvider>
        <AuthProvider me={me} onResolution={onUserResolution}>
          <OucPopupBootstrap />
          <Outlet />
          <OucIndicator />
        </AuthProvider>
      </ModalProvider>
    </ToastProvider>
  );
}

export default function App() {
  const { authStatus } = useLoaderData<typeof loader>();

  return (
    <FeaturesProvider features={authStatus.features}>
      <TrackingContextProvider provider={trackingProvider} spec={webappTrackingSpec}>
        <AppContent />
      </TrackingContextProvider>
    </FeaturesProvider>
  );
}
