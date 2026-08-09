import { Link, Outlet, useLocation, useNavigate, useParams } from 'react-router';
import type { MetaFunction } from 'react-router';
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { useAuth } from '~/context/auth';
import { ensureUserSessionForRoute } from '~/utils/user-session-guard';
import { Button } from '@habsum/ui/components/Button';
import { Icon } from '@habsum/ui/components/Icon';
import { Footer } from '~/components/Footer';
import { getMediaQuerySnapshot, subscribeToMediaQuery } from '~/utils/media-query-store';
import { userPageTitle } from '~/utils/page-title';

export const meta: MetaFunction = ({ params }) => [
  { title: userPageTitle(params.user, 'Settings') },
];

function useWideSettingsLayout(): boolean {
  return useSyncExternalStore(
    (onStoreChange) => subscribeToMediaQuery('(min-width: 721px)', onStoreChange),
    () => getMediaQuerySnapshot('(min-width: 721px)'),
    () => true,
  );
}

function activeSettingsSectionLabel(path: string): string | null {
  if (path.endsWith('/account')) return 'Account';
  if (path.includes('/settings/security')) return 'Security';
  if (path.endsWith('/habits')) return 'Habits';
  if (path.endsWith('/config')) return 'Config';
  if (path.endsWith('/developer')) return 'Developer';
  return null;
}

export default function UserSettingsLayout() {
  const navigate = useNavigate();
  const { user: authenticatedUser, signOut } = useAuth();
  const { user: routeUser } = useParams();
  const location = useLocation();
  const path = location.pathname;
  const base = `/users/${encodeURIComponent(routeUser ?? '')}/settings`;
  const isAdmin =
    authenticatedUser != null &&
    authenticatedUser.username === routeUser &&
    authenticatedUser.admin;
  const isWide = useWideSettingsLayout();
  const [navOpen, setNavOpen] = useState(false);
  const activeSection = useMemo(() => activeSettingsSectionLabel(path), [path]);
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!routeUser) return;
    ensureUserSessionForRoute(routeUser, authenticatedUser, { navigate });
  }, [routeUser, authenticatedUser, navigate]);

  useEffect(() => {
    if (path.endsWith('/developer') && isAdmin === false) {
      navigate(`${base}/account`);
    }
  }, [base, isAdmin, navigate, path]);

  useEffect(() => {
    setNavOpen(isWide);
  }, [isWide]);

  useEffect(() => {
    if (!isWide) setNavOpen(false);
  }, [path, isWide]);

  useEffect(() => {
    mainRef.current?.focus({ preventScroll: true });
  }, [path]);

  return (
    <div
      className={[
        'settings',
        !isWide && navOpen ? 'settings--nav-open' : '',
        !isWide ? 'settings--narrow' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <aside className="settings__sidebar">
        <Link
          to={`/users/${encodeURIComponent(routeUser ?? '')}/habits`}
          className="settings__dashboard-link link--fancy text-b-m"
        >
          <Icon name="chevronBack" size="small" />
          <span>Back to dashboard</span>
        </Link>

        <div className="settings__header">
          <div className="settings__header-text">
            <h1 className="settings__title text-h-l">Settings</h1>
            {!isWide && !navOpen && activeSection ? (
              <p className="settings__active-section text-b-m text-light">{activeSection}</p>
            ) : null}
          </div>

          <Button
            type="tertiary"
            icon="menu"
            circle
            className="settings__nav-toggle"
            aria-expanded={navOpen}
            aria-controls="settings-nav"
            aria-label={navOpen ? 'Collapse settings navigation' : 'Expand settings navigation'}
            onClick={() => setNavOpen((open) => !open)}
          />
        </div>

        <nav id="settings-nav" className="settings__nav">
          <Link
            className={`settings__link text-b-l${
              path.endsWith('/account') ? ' settings__link--active' : ''
            }`}
            to={`${base}/account`}
          >
            Account
          </Link>
          <Link
            className={`settings__link text-b-l${
              path.endsWith('/habits') ? ' settings__link--active' : ''
            }`}
            to={`${base}/habits`}
          >
            Habits
          </Link>
          <Link
            className={`settings__link text-b-l${
              path.includes('/settings/security') ? ' settings__link--active' : ''
            }`}
            to={`${base}/security`}
          >
            Security
          </Link>
          {isAdmin === true ? (
            <Link
              className={`settings__link text-b-l${
                path.endsWith('/developer') ? ' settings__link--active' : ''
              }`}
              to={`${base}/developer`}
            >
              Developer
            </Link>
          ) : null}
          <Button
            type="secondary"
            size="medium"
            text="Logout"
            className="settings__logout"
            onClick={() => {
              void signOut().then(() => navigate('/login'));
            }}
          />
        </nav>
        <div hidden={!isWide} className="settings__footer-slot settings__footer-slot--sidebar">
          <Footer className="settings__footer" variant="compact" />
        </div>
      </aside>
      <main ref={mainRef} className="settings__main" tabIndex={-1}>
        <Outlet />
      </main>
      <div hidden={isWide} className="settings__footer-slot settings__footer-slot--page">
        <Footer className="settings__footer settings__footer--page" variant="compact" />
      </div>
    </div>
  );
}
