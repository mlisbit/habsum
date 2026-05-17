import { useCallback, useEffect, useState } from 'react';
import { useParams } from '@remix-run/react';
import {
  adminDeleteUser,
  adminSetUserLoginPin,
  createUser,
  getDeveloper,
  getUserSession,
  listUsers,
  type DeveloperGetResponse,
} from '~/api.client';
import { Button } from '~/core-components/Button';
import { Hoverable } from '~/core-components/Hoverable';
import type { IconName } from '~/core-components/Icon';
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
    const name = rawUsername.trim();
    const nextPin = rawPin.trim();
    if (!name || isCreating) return;
    if (!nextPin) {
      setError('PIN is required');
      return;
    }

    setError(null);
    setIsCreating(true);
    try {
      const res = await createUser(name, nextPin);
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

type ManageUserModalProps = {
  targetUsername: string;
  onDone: () => void;
  onClose: () => void;
};

function ChangePasswordModal({ targetUsername, onDone, onClose }: ManageUserModalProps) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const canSave = password.trim() !== '' && confirm.trim() !== '';

  const handleSave = async () => {
    const p = password.trim();
    const c = confirm.trim();
    if (!p) {
      setError('Enter a new password');
      return;
    }
    if (p !== c) {
      setError('Passwords do not match');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await adminSetUserLoginPin(targetUsername, p);
      onDone();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update password');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <ModalTitle>Change password</ModalTitle>
      <ModalBody className="developer-page__add-user-modal">
        <p className="text-light text-b-m">
          Set a new login password for <strong className="text-bold">{targetUsername}</strong>.
        </p>
        <Input
          className="developer-page__add-user-input"
          type="password"
          placeholder="New password"
          disabled={busy}
          dismissable
          submittable={false}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          autoComplete="new-password"
          onChange={setPassword}
        />
        <Input
          className="developer-page__add-user-input"
          type="password"
          placeholder="Confirm password"
          disabled={busy}
          dismissable
          submittable={false}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          autoComplete="new-password"
          onChange={setConfirm}
        />
        {error ? <InfoText variant="error">{error}</InfoText> : null}
      </ModalBody>
      <ModalActions>
        <Button
          type="secondary"
          size="small"
          text="Cancel"
          disabled={busy}
          className="mr-2"
          onClick={onClose}
        />
        <Button
          type="primary"
          size="small"
          text={busy ? 'Saving…' : 'Save password'}
          disabled={busy || !canSave}
          onClick={() => void handleSave()}
        />
      </ModalActions>
    </>
  );
}

function DeleteUserModal({ targetUsername, onDone, onClose }: ManageUserModalProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setError(null);
    setBusy(true);
    try {
      await adminDeleteUser(targetUsername);
      onDone();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete user');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <ModalTitle>Delete user</ModalTitle>
      <ModalBody className="developer-page__add-user-modal">
        <p className="text-b-m">
          Are you sure you want to delete <strong className="text-bold">{targetUsername}</strong>?
        </p>
        <p className="text-light text-b-m">
          This removes their YAML config and all stored habit data. This cannot be undone.
        </p>
        {error ? <InfoText variant="error">{error}</InfoText> : null}
      </ModalBody>
      <ModalActions>
        <Button
          type="secondary"
          size="small"
          text="Cancel"
          disabled={busy}
          className="mr-2"
          onClick={onClose}
        />
        <Button
          type="primary"
          size="small"
          text={busy ? 'Deleting…' : 'Delete user'}
          disabled={busy}
          onClick={() => void handleDelete()}
        />
      </ModalActions>
    </>
  );
}

type UserRowIconActionProps = {
  tooltip: string;
  icon: IconName;
  ariaLabel: string;
  onClick: () => void;
};

function UserRowIconAction({ tooltip, icon, ariaLabel, onClick }: UserRowIconActionProps) {
  return (
    <Hoverable.Root>
      <Hoverable.Anchor className="developer-page__users-action-anchor">
        <Button
          type="tertiary"
          size="tiny"
          icon={icon}
          circle
          aria-label={ariaLabel}
          className="developer-page__users-list-action"
          onClick={onClick}
        />
      </Hoverable.Anchor>
      <Hoverable.Content side="top">{tooltip}</Hoverable.Content>
    </Hoverable.Root>
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
          Create a new user config and initial PIN. Manage existing users with the actions beside
          each name. Existing users sign in from the login page.
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
                <li key={username} className="developer-page__users-list-row">
                  <span className="developer-page__users-list-name text-b-m">{username}</span>
                  <div className="developer-page__users-list-actions">
                    <UserRowIconAction
                      tooltip="Change password"
                      icon="key-round"
                      ariaLabel={`Change password for ${username}`}
                      onClick={() => {
                        setUserToolStatus(null);
                        present({
                          content: (
                            <ChangePasswordModal
                              targetUsername={username}
                              onDone={() => {
                                setUserToolStatus(`Updated password for "${username}".`);
                              }}
                              onClose={closeModal}
                            />
                          ),
                        });
                      }}
                    />
                    <UserRowIconAction
                      tooltip="Delete user"
                      icon="trash"
                      ariaLabel={`Delete user ${username}`}
                      onClick={() => {
                        setUserToolStatus(null);
                        present({
                          content: (
                            <DeleteUserModal
                              targetUsername={username}
                              onDone={() => {
                                setUserToolStatus(`Deleted user "${username}".`);
                                void loadUsers();
                              }}
                              onClose={closeModal}
                            />
                          ),
                        });
                      }}
                    />
                  </div>
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
