import { Link, Outlet, useLocation, useParams } from '@remix-run/react';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { getAuthMe, getUserSession, logout } from '~/api.client';
import { LOGIN_TOAST_USER_AREA, redirectToLoginWithToast } from '~/context/toast';
import { ensureUserSessionForRoute } from '~/utils/user-session-guard';
import { Button } from '~/core-components/Button';
import { Footer } from '~/components/Footer';
import { applyUiTheme } from '~/theme.client';

function useWideSettingsLayout(): boolean {
  return useSyncExternalStore(
    (onStoreChange) => {
      const mq = window.matchMedia('(min-width: 721px)');
      mq.addEventListener('change', onStoreChange);
      return () => mq.removeEventListener('change', onStoreChange);
    },
    () => window.matchMedia('(min-width: 721px)').matches,
    () => true,
  );
}

function activeSettingsSectionLabel(path: string): string | null {
  if (path.endsWith('/account')) return 'Account';
  if (path.endsWith('/security')) return 'Security';
  if (path.endsWith('/config')) return 'Config';
  if (path.endsWith('/developer')) return 'Developer';
  return null;
}

export default function UserSettingsLayout() {
  const { user } = useParams();
  const location = useLocation();
  const path = location.pathname;
  const base = `/users/${encodeURIComponent(user ?? '')}/settings`;
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const isWide = useWideSettingsLayout();
  const [navOpen, setNavOpen] = useState(false);
  const activeSection = useMemo(() => activeSettingsSectionLabel(path), [path]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    getAuthMe()
      .then((me) => {
        if (cancelled) return;
        if (!user) return;
        if (!ensureUserSessionForRoute(user, me)) return;
        applyUiTheme(me.theme);
      })
      .catch(() => {
        if (!cancelled) redirectToLoginWithToast(LOGIN_TOAST_USER_AREA);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setIsAdmin(null);
    getUserSession(user)
      .then((res) => {
        if (!cancelled) setIsAdmin(res.admin);
      })
      .catch(() => {
        if (!cancelled) setIsAdmin(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (path.endsWith('/developer') && isAdmin === false) {
      window.location.replace(`${base}/account`);
    }
  }, [base, isAdmin, path]);

  useEffect(() => {
    setNavOpen(isWide);
  }, [isWide]);

  useEffect(() => {
    if (!isWide) setNavOpen(false);
  }, [path, isWide]);

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
        <div className="settings__header">
          <Button
            type="tertiary"
            icon="chevronBack"
            circle
            title="Back to habits"
            aria-label="Back to habits"
            className="settings__back"
            onClick={() =>
              window.location.assign(`/users/${encodeURIComponent(user ?? '')}/habits`)
            }
          />

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
              path.endsWith('/security') ? ' settings__link--active' : ''
            }`}
            to={`${base}/security`}
          >
            Security
          </Link>
          <Link
            className={`settings__link text-b-l${
              path.endsWith('/config') ? ' settings__link--active' : ''
            }`}
            to={`${base}/config`}
          >
            Config
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
              void logout().then(() => window.location.assign('/login'));
            }}
          />
        </nav>
        <div hidden={!isWide} className="settings__footer-slot settings__footer-slot--sidebar">
          <Footer className="settings__footer" />
        </div>
      </aside>
      <main className="settings__main">
        <Outlet />
      </main>
      <div hidden={isWide} className="settings__footer-slot settings__footer-slot--page">
        <Footer className="settings__footer settings__footer--page" />
      </div>
    </div>
  );
}
