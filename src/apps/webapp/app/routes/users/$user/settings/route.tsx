import { Link, Outlet, useLocation, useParams } from '@remix-run/react';
import { useEffect, useState } from 'react';
import { getAuthMe, getUserSession, logout } from '~/api.client';
import { LOGIN_TOAST_USER_AREA, redirectToLoginWithToast } from '~/context/toast';
import { ensureUserSessionForRoute } from '~/utils/user-session-guard';
import { Button } from '~/core-components/Button';
import { Footer } from '~/components/Footer';
import { applyUiTheme } from '~/theme.client';

export default function UserSettingsLayout() {
  const { user } = useParams();
  const location = useLocation();
  const path = location.pathname;
  const base = `/users/${encodeURIComponent(user ?? '')}/settings`;
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

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

  return (
    <div className="settings">
      <aside className="settings__sidebar">
        <div className="flex align-items-center mb-3">
          <Button
            type="tertiary"
            icon="chevronBack"
            circle
            title="Back to habits"
            aria-label="Back to habits"
            className="mr-1"
            onClick={() =>
              window.location.assign(`/users/${encodeURIComponent(user ?? '')}/habits`)
            }
          />

          <h1 className="text-h-l">Settings</h1>
        </div>

        <nav className="settings__nav">
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
          <Footer />
        </nav>
      </aside>
      <main className="settings__main">
        <Outlet />
      </main>
    </div>
  );
}
