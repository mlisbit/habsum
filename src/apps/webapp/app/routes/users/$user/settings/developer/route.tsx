import { useCallback, useEffect, useState } from 'react';
import { useParams } from '@remix-run/react';
import {
  adminDeleteUser,
  adminResetUserPassword,
  createOucSession,
  createUser,
  getDeveloper,
  getUserSession,
  listUsers,
  type DeveloperGetResponse,
} from '~/api.client';
import { openOucWindow } from '~/ouc.client';
import { SettingsHeader } from '~/components/SettingsHeader';
import { Button } from '~/core-components/Button';
import { Hoverable } from '~/core-components/Hoverable';
import type { IconName } from '~/core-components/Icon';
import { InfoText } from '~/core-components/InfoText';
import { Input } from '~/core-components/Input';
import { ModalActions, ModalBody, ModalHeader, useModal } from '~/context/modal';

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

function isPlausibleEmail(value: string): boolean {
  const t = value.trim().toLowerCase();
  if (t === '') return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t);
}

type CreatedUserCredentials = {
  user: string;
  password: string;
  email: string;
};

type AddUserModalProps = {
  onCreated: (credentials: CreatedUserCredentials) => void;
  onClose: () => void;
};

type UserCredentialsModalProps = {
  title: string;
  description: string;
  user: string;
  password: string;
  email?: string;
  onClose: () => void;
};

function UserCredentialsModal({
  title,
  description,
  user,
  password,
  email,
  onClose,
}: UserCredentialsModalProps) {
  return (
    <>
      <ModalHeader>{title}</ModalHeader>
      <ModalBody className="developer-page__add-user-modal">
        <p className="text-light text-b-m">{description}</p>
        <dl className="developer-page__credentials">
          {email ? (
            <div className="developer-page__credentials-row">
              <dt className="developer-page__credentials-term text-b-m text-light">Email</dt>
              <dd className="developer-page__credentials-value text-b-m text-bold">{email}</dd>
            </div>
          ) : null}
          <div className="developer-page__credentials-row">
            <dt className="developer-page__credentials-term text-b-m text-light">Username</dt>
            <dd className="developer-page__credentials-value text-b-m text-bold">{user}</dd>
          </div>
          <div className="developer-page__credentials-row">
            <dt className="developer-page__credentials-term text-b-m text-light">
              Temporary password
            </dt>
            <dd className="developer-page__credentials-value text-b-m text-bold developer-page__credentials-password">
              {password}
            </dd>
          </div>
        </dl>
      </ModalBody>
      <ModalActions>
        <Button type="primary" size="small" text="Done" onClick={onClose} />
      </ModalActions>
    </>
  );
}

function UserCreatedCredentialsModal({
  user,
  password,
  email,
  onClose,
}: CreatedUserCredentials & { onClose: () => void }) {
  return (
    <UserCredentialsModal
      title="Account created"
      description="Share these login details with the user. They will be asked to choose a new password on first sign-in."
      user={user}
      password={password}
      email={email}
      onClose={onClose}
    />
  );
}

function AddUserModal({ onCreated, onClose }: AddUserModalProps) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const trimmedEmail = email.trim();
  const canCreate = isPlausibleEmail(trimmedEmail);

  const handleCreate = async () => {
    const nextEmail = trimmedEmail.toLowerCase();
    if (!isPlausibleEmail(nextEmail) || isCreating) return;

    setError(null);
    setIsCreating(true);
    try {
      const res = await createUser(nextEmail);
      onCreated({ user: res.user, password: res.password, email: nextEmail });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'failed to create user');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <>
      <ModalHeader>Add user</ModalHeader>
      <ModalBody className="developer-page__add-user-modal">
        <p className="text-light text-b-m">
          Enter an email address. A username and temporary password will be generated automatically.
        </p>
        <Input
          size="small"
          className="developer-page__add-user-input"
          placeholder="Email"
          disabled={isCreating}
          dismissable
          submittable={false}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          autoComplete="email"
          inputMode="email"
          onChange={setEmail}
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
          text={isCreating ? 'Creating…' : 'Create'}
          disabled={isCreating || !canCreate}
          onClick={() => void handleCreate()}
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

function ResetPasswordModal({ targetUsername, onDone, onClose }: ManageUserModalProps) {
  const [credentials, setCredentials] = useState<{ user: string; password: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await adminResetUserPassword(targetUsername);
        if (cancelled) return;
        setCredentials({ user: res.user, password: res.password });
        onDone();
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to reset password');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [targetUsername]);

  if (error) {
    return (
      <>
        <ModalHeader>Change password</ModalHeader>
        <ModalBody className="developer-page__add-user-modal">
          <InfoText variant="error">{error}</InfoText>
        </ModalBody>
        <ModalActions>
          <Button type="primary" size="small" text="Close" onClick={onClose} />
        </ModalActions>
      </>
    );
  }

  if (!credentials) {
    return (
      <>
        <ModalHeader>Change password</ModalHeader>
        <ModalBody className="developer-page__add-user-modal">
          <p className="text-light text-b-m">Generating a new password for {targetUsername}…</p>
        </ModalBody>
      </>
    );
  }

  return (
    <UserCredentialsModal
      title="New password"
      description={`A new temporary password was generated for ${targetUsername}. Share it securely; they must choose a new password on next sign-in.`}
      user={credentials.user}
      password={credentials.password}
      onClose={onClose}
    />
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
      <ModalHeader>Delete user</ModalHeader>
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
      <div className="card card--no-padding developer-page__users">
        <SettingsHeader
          title="Users"
          actions={
            <Button
              type="secondary"
              text="Add user"
              onClick={() => {
                setUserToolStatus(null);
                present({
                  content: (
                    <AddUserModal
                      onCreated={(credentials) => {
                        closeModal();
                        setUserToolStatus(`Created user "${credentials.user}".`);
                        void loadUsers();
                        present({
                          content: (
                            <UserCreatedCredentialsModal {...credentials} onClose={closeModal} />
                          ),
                        });
                      }}
                      onClose={closeModal}
                    />
                  ),
                });
              }}
            />
          }
        />
        <div className="card-padding">
          {userToolStatus ? (
            <p className="text-light text-b-m developer-page__user-tools-status">
              {userToolStatus}
            </p>
          ) : null}
          {usersError ? (
            <p className="text-light text-b-m">Could not load users: {usersError}</p>
          ) : users == null ? (
            <p className="text-light text-b-m">Loading users...</p>
          ) : users.length === 0 ? (
            <p className="text-light text-b-m">No users found.</p>
          ) : (
            <ul className="developer-page__users-list">
              {users.map((username) => {
                const isCurrentUser = username === user;
                return (
                  <li key={username} className="developer-page__users-list-row">
                    <span className="developer-page__users-list-name text-b-m">{username}</span>
                    {!isCurrentUser ? (
                      <div className="developer-page__users-list-actions">
                        <UserRowIconAction
                          tooltip="ouc"
                          icon="user-lock"
                          ariaLabel={`Open operate-under session for ${username}`}
                          onClick={() => {
                            setUserToolStatus(null);
                            void (async () => {
                              try {
                                const res = await createOucSession(username);
                                const opened = openOucWindow(res.user, res.token);
                                setUserToolStatus(
                                  opened
                                    ? `Opened "${username}" in a new operate-under window.`
                                    : `Could not open operate-under window for "${username}". Allow pop-ups and try again.`,
                                );
                              } catch (e) {
                                setUserToolStatus(
                                  e instanceof Error
                                    ? e.message
                                    : 'Failed to create operate-under session.',
                                );
                              }
                            })();
                          }}
                        />
                        <UserRowIconAction
                          tooltip="Change password"
                          icon="key-round"
                          ariaLabel={`Change password for ${username}`}
                          onClick={() => {
                            setUserToolStatus(null);
                            present({
                              content: (
                                <ResetPasswordModal
                                  targetUsername={username}
                                  onDone={() => {
                                    setUserToolStatus(
                                      `Generated a new password for "${username}".`,
                                    );
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
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <div className="card card--no-padding developer-page__clocks">
        <SettingsHeader title="Time" titleAs="h3" />
        <div className="card-padding">
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
      </div>

      <div className="card card--no-padding developer-page__version">
        <SettingsHeader title="Version" titleAs="h3" />
        <div className="card-padding">
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
    </div>
  );
}
