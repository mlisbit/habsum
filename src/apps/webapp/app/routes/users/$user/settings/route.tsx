import { Link, Outlet, useLocation, useParams } from '@remix-run/react';
import { Button } from '~/components/Button';

export default function UserSettingsLayout() {
  const { user } = useParams();
  const location = useLocation();
  const path = location.pathname;
  const base = `/users/${encodeURIComponent(user ?? '')}/settings`;

  return (
    <div className="settings">
      <aside className="settings__sidebar">
        <Button
          type="secondary"
          icon="chevronBack"
          circle
          text=""
          title="Back to habits"
          aria-label="Back to habits"
          onClick={() => window.location.assign(`/users/${encodeURIComponent(user ?? '')}/habits`)}
        />

        <h1 className="settings__title">Settings</h1>
        <div className="muted settings__user-line">{user}</div>
        <nav className="settings__nav">
          <Link
            className={
              path.endsWith('/account') ? 'settings__link settings__link--active' : 'settings__link'
            }
            to={`${base}/account`}
          >
            Account
          </Link>
          <Link
            className={
              path.endsWith('/config') ? 'settings__link settings__link--active' : 'settings__link'
            }
            to={`${base}/config`}
          >
            Config
          </Link>
        </nav>
      </aside>
      <main className="settings__main">
        <Outlet />
      </main>
    </div>
  );
}
