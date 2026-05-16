import { useCallback, useEffect, useState } from 'react';
import { useParams } from '@remix-run/react';
import {
  createUser,
  getDeveloper,
  getUserSession,
  listUsers,
  type DeveloperGetResponse,
} from '~/api.client';
import { Button } from '~/core-components/Button';
import { InfoText } from '~/core-components/InfoText';
import { Input } from '~/core-components/Input';
import { ModalActions, ModalBody, ModalTitle, useModal } from '~/context/modal';

const clockFormat: Intl.DateTimeFormatOptions = {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  second: '2-digit',
  timeZoneName: 'short',
};

function formatInstantInZone(iso: string, timeZone: string) {
  return new Date(iso).toLocaleString(undefined, { ...clockFormat, timeZone });
}

type AddUserModalProps = {
  onCreated: (username: string) => void;
  onClose: () => void;
};

function AddUserModal({ onCreated, onClose }: AddUserModalProps) {
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const canCreate = username.trim() !== '' && pin.trim() !== '';

  const handleCreate = async (rawUsername: string, rawPin: string) => {
    const username = rawUsername.trim();
    const pin = rawPin.trim();
    if (!username || isCreating) return;
    if (!pin) {
      setError('PIN is required');
      return;
    }

    setError(null);
    setIsCreating(true);
    try {
      const res = await createUser(username, pin);
      onCreated(res.user);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'failed to create user');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <>
      <ModalTitle>Add user</ModalTitle>
      <ModalBody className="developer-page__add-user-modal">
        <p className="text-light text-b-m">
          Create a YAML config for the new user and set their login PIN.
        </p>
        <Input
          className="developer-page__add-user-input"
          placeholder="Username"
          disabled={isCreating}
          dismissable
          submittable={false}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          onChange={setUsername}
        />
        <Input
          className="developer-page__add-user-input"
          placeholder="PIN"
          disabled={isCreating}
          dismissable
          submittable={false}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          onChange={setPin}
        />
        {error ? <InfoText variant="error">{error}</InfoText> : null}
      </ModalBody>
      <ModalActions>
        <Button
          type="secondary"
          size="small"
          text="Cancel"
          disabled={isCreating}
          className="mr-2"
          onClick={onClose}
        />
        <Button
          type="primary"
          size="small"
          text={isCreating ? 'Creating...' : 'Create'}
          disabled={isCreating || !canCreate}
          onClick={() => void handleCreate(username, pin)}
        />
      </ModalActions>
    </>
  );
}

export default function UserSettingsDeveloper() {
  const { user } = useParams();
  const [developerData, setDeveloperData] = useState<DeveloperGetResponse | null>(null);
  const [developerError, setDeveloperError] = useState<string | null>(null);
  const [browserNow, setBrowserNow] = useState(() => new Date());
  const [userToolStatus, setUserToolStatus] = useState<string | null>(null);
  const [users, setUsers] = useState<string[] | null>(null);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [canViewDeveloper, setCanViewDeveloper] = useState<boolean | null>(null);
  const { present, closeModal } = useModal();

  const loadUsers = useCallback(async () => {
    setUsersError(null);
    try {
      const res = await listUsers();
      setUsers(res.users);
    } catch (e) {
      setUsers(null);
      setUsersError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setCanViewDeveloper(null);
    getUserSession(user)
      .then((res) => {
        if (!cancelled) {
          setCanViewDeveloper(res.admin);
          if (!res.admin) {
            window.location.replace(`/users/${encodeURIComponent(user)}/settings/account`);
          }
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCanViewDeveloper(false);
          window.location.replace(`/users/${encodeURIComponent(user)}/settings/account`);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    setDeveloperError(null);
    getDeveloper()
      .then((res) => {
        if (!cancelled) setDeveloperData(res);
      })
      .catch((e) => {
        if (!cancelled) {
          setDeveloperData(null);
          setDeveloperError(e instanceof Error ? e.message : String(e));
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setBrowserNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (canViewDeveloper === true) {
      void loadUsers();
    }
  }, [canViewDeveloper, loadUsers]);

  const browserZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const serverTime = developerData?.time ?? null;
  const version = developerData?.version ?? null;

  if (canViewDeveloper !== true) return null;

  return (
    <div className="developer-page">
      <h2 className="text-h-l">Developer</h2>
      <p className="text-light text-b-m">API clocks and debugging context.</p>

      <div className="card developer-page__user-tools">
        <h3 className="text-h-s">User tools</h3>
        <p className="text-light text-b-m">
          Create a new user config and initial PIN. Existing users sign in from the login page.
        </p>
        <Button
          type="primary"
          size="small"
          text="Add user"
          onClick={() => {
            setUserToolStatus(null);
            present({
              content: (
                <AddUserModal
                  onCreated={(username) => {
                    setUserToolStatus(`Created user "${username}".`);
                    void loadUsers();
                  }}
                  onClose={closeModal}
                />
              ),
            });
          }}
        />
        {userToolStatus ? (
          <p className="text-light text-b-m developer-page__user-tools-status">{userToolStatus}</p>
        ) : null}
        <div className="developer-page__users-list-wrap">
          <h4 className="text-h-s">Users</h4>
          {usersError ? (
            <p className="text-light text-b-m">Could not load users: {usersError}</p>
          ) : users == null ? (
            <p className="text-light text-b-m">Loading users...</p>
          ) : users.length === 0 ? (
            <p className="text-light text-b-m">No users found.</p>
          ) : (
            <ul className="developer-page__users-list">
              {users.map((username) => (
                <li key={username} className="developer-page__users-list-item text-b-m">
                  {username}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="card developer-page__clocks">
        <h3 className="text-h-s">Time</h3>
        <p className="text-light text-b-m">
          Server clock is read from the habsum API process; your browser clock updates every second.
        </p>
        <dl className="developer-page__clock-list">
          <div className="developer-page__clock-row">
            <dt className="text-b-m">Server (API)</dt>
            <dd className="developer-page__clock-dd text-b-m">
              {developerError ? (
                <span className="text-light">Could not load: {developerError}</span>
              ) : serverTime ? (
                <>
                  <div>{formatInstantInZone(serverTime.iso, serverTime.timezone)}</div>
                  <div className="text-light text-b-s">Time zone: {serverTime.timezone}</div>
                </>
              ) : (
                <span className="text-light">Loading…</span>
              )}
            </dd>
          </div>
          <div className="developer-page__clock-row">
            <dt className="text-b-m">This device</dt>
            <dd className="developer-page__clock-dd text-b-m">
              <div>{browserNow.toLocaleString(undefined, clockFormat)}</div>
              <div className="text-light text-b-s">Time zone: {browserZone}</div>
            </dd>
          </div>
        </dl>
      </div>

      <div className="card developer-page__version">
        <h3 className="text-h-s">Version</h3>
        <p className="text-light text-b-m">
          Current application version reported by the habsum API process.
        </p>

        {developerError ? (
          <p className="text-light text-b-m">Could not load: {developerError}</p>
        ) : version ? (
          <dl className="developer-page__version-list">
            <div className="developer-page__version-row">
              <dt className="text-b-m">Current</dt>
              <dd className="developer-page__version-dd text-b-m">v{version.currentVersion}</dd>
            </div>
          </dl>
        ) : (
          <p className="text-light text-b-m">Loading…</p>
        )}
      </div>
    </div>
  );
}
