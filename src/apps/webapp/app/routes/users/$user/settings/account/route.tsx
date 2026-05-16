import { useParams } from '@remix-run/react';
import { useEffect, useState } from 'react';
import { deleteUser, patchUser, purgeUserData } from '~/api.client';
import { Button } from '~/core-components/Button';
import { setSelectedUser } from '~/cookies.client';
import { Input } from '~/core-components/Input';

export default function UserSettingsAccount() {
  const { user } = useParams();
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [renameBusy, setRenameBusy] = useState(false);
  const [nextName, setNextName] = useState('');

  useEffect(() => {
    setNextName(user ?? '');
  }, [user]);

  return (
    <div className="account-page">
      <h2 className="text-h-l">Account</h2>
      <p className="text-light text-b-m">Managing data for user: {user}</p>

      <div className="card">
        <h3 className="text-h-s">Username</h3>
        <p className="text-light text-b-m">
          Rename this user (updates the YAML filename on the server).
        </p>
        {/** Button component always uses type="button", so don't rely on form submit. */}
        <form
          className="account-page__rename"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!user) return;
            setRenameBusy(true);
            setStatus(null);
            try {
              const res = await patchUser(user, { name: nextName.trim() });
              setSelectedUser(res.user);
              window.location.assign(`/users/${encodeURIComponent(res.user)}/settings/account`);
            } catch (e) {
              setStatus(e instanceof Error ? e.message : String(e));
            } finally {
              setRenameBusy(false);
            }
          }}
        >
          <Input
            className="account-page__rename-input"
            value={nextName}
            onChange={setNextName}
            placeholder="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            inputMode="text"
          />

          <button type="submit" style={{ display: 'none' }} aria-hidden />
          <Button
            type="primary"
            text={renameBusy ? 'Renaming…' : 'Rename'}
            disabled={!user || renameBusy || !nextName.trim()}
            onClick={async () => {
              if (!user) return;
              setRenameBusy(true);
              setStatus(null);
              try {
                const res = await patchUser(user, { name: nextName.trim() });
                setSelectedUser(res.user);
                window.location.assign(`/users/${encodeURIComponent(res.user)}/settings/account`);
              } catch (e) {
                setStatus(e instanceof Error ? e.message : String(e));
              } finally {
                setRenameBusy(false);
              }
            }}
          />
        </form>
      </div>

      <div className="card account-page__danger">
        <h3 className="account-page__danger-title text-h-s">Danger zone</h3>
        <p className="text-light text-b-m">
          Permanently delete all stored habit data for this user from the server database (daily
          totals, selections, legacy totals). YAML config is not removed.
        </p>
        <Button
          type="secondary"
          text={busy ? 'Purging…' : 'Purge all data'}
          className="mr-2"
          disabled={!user || busy}
          onClick={async () => {
            if (!user) return;
            if (!window.confirm(`Purge ALL data for user "${user}"? This cannot be undone.`)) {
              return;
            }
            setBusy(true);
            setStatus(null);
            try {
              await purgeUserData(user);
              setStatus('Data purged.');
            } catch (e) {
              setStatus(e instanceof Error ? e.message : String(e));
            } finally {
              setBusy(false);
            }
          }}
        />
        <Button
          type="secondary"
          text="Delete user"
          disabled={!user || busy}
          onClick={async () => {
            if (!user) return;
            if (
              !window.confirm(
                `Delete user "${user}"? This removes the YAML config and all stored habit data. This cannot be undone.`,
              )
            ) {
              return;
            }
            setBusy(true);
            setStatus(null);
            try {
              await deleteUser(user);
              setSelectedUser('');
              window.location.assign('/login');
            } catch (e) {
              setStatus(e instanceof Error ? e.message : String(e));
            } finally {
              setBusy(false);
            }
          }}
        />
        {status ? <p className="text-light text-b-m account-page__status">{status}</p> : null}
      </div>
    </div>
  );
}
