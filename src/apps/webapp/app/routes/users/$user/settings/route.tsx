import { Link, Outlet, useLocation, useParams } from '@remix-run/react';
import { Button } from '~/core-components/Button';

export default function UserSettingsLayout() {
  const { user } = useParams();
  const location = useLocation();
  const path = location.pathname;
  const base = `/users/${encodeURIComponent(user ?? '')}/settings`;

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

          <h1 className="text-h-l">{user}'s settings</h1>
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
              path.endsWith('/config') ? ' settings__link--active' : ''
            }`}
            to={`${base}/config`}
          >
            Config
          </Link>
        </nav>
      </aside>
      <main className="card pt-3">
        <Outlet />
      </main>
    </div>
  );
}
