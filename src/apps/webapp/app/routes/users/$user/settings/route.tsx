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

        <h1 className="settings__title text-h-l">Settings</h1>
        <div className="text-light text-b-m settings__user-line">{user}</div>
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
              path.endsWith('/config') ? ' settings__link--active' : ''
            }`}
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
