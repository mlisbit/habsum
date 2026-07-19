import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from '@remix-run/react';
import type { ListUserItem } from '@habsum/types/common/misc';
import {
  adminDeleteUser,
  adminResetUserPassword,
  createOucSession,
  createUser,
  getDeveloper,
  listUsers,
  type DeveloperGetResponse,
} from '~/api.client';
import { openOucWindow } from '~/ouc.client';
import { SettingsPageCard } from '~/components/SettingsPageCard';
import { Button } from '@habsum/ui/components/Button';
import { Hoverable } from '@habsum/ui/components/Hoverable';
import type { IconName } from '@habsum/ui/components/Icon';
import { InfoText } from '@habsum/ui/components/InfoText';
import { Input } from '@habsum/ui/components/Input';
import { ModalBody, ModalFooter, ModalHeader, useModal } from '@habsum/ui/contexts/modal';
import { useToast } from '@habsum/ui/contexts/toast';
import { useUser } from '~/context/user';
import { isMeLoggedIn } from '~/utils/user-session-guard';

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

function formatUnixTimeLocal(unixSeconds: number | null): string {
  if (unixSeconds == null) return 'Never';
  const d = new Date(unixSeconds * 1000);
  if (Number.isNaN(d.getTime())) return 'Unknown';
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(d);
}

function formatCount(value: number, singular: string): string {
  return `${value} ${singular}${value === 1 ? '' : 's'}`;
}

function formatEntitlements(entitlements: readonly string[]): string {
  return entitlements.length > 0 ? entitlements.join(', ') : 'None';
}

function UserDetailsModal({ user, onClose }: { user: ListUserItem; onClose: () => void }) {
  const displayName = user.displayName || user.username;

  return (
    <>
      <ModalHeader>{displayName}</ModalHeader>
      <ModalBody className="developer-page__user-details-modal">
        <dl className="developer-page__user-details">
          <div className="developer-page__user-details-row">
            <dt className="developer-page__user-details-term text-b-m text-light">Username</dt>
            <dd className="developer-page__user-details-value text-b-m">{user.username}</dd>
          </div>
          <div className="developer-page__user-details-row">
            <dt className="developer-page__user-details-term text-b-m text-light">Email</dt>
            <dd className="developer-page__user-details-value text-b-m">
              {user.email || 'Not set'}
            </dd>
          </div>
          <div className="developer-page__user-details-row">
            <dt className="developer-page__user-details-term text-b-m text-light">Display name</dt>
            <dd className="developer-page__user-details-value text-b-m">
              {user.displayName || 'Not set'}
            </dd>
          </div>
          <div className="developer-page__user-details-row">
            <dt className="developer-page__user-details-term text-b-m text-light">Last login</dt>
            <dd className="developer-page__user-details-value text-b-m">
              {formatUnixTimeLocal(user.lastLoginAt)}
            </dd>
          </div>
          <div className="developer-page__user-details-row">
            <dt className="developer-page__user-details-term text-b-m text-light">Habits</dt>
            <dd className="developer-page__user-details-value text-b-m">{user.habitCount}</dd>
          </div>
          <div className="developer-page__user-details-row">
            <dt className="developer-page__user-details-term text-b-m text-light">Events</dt>
            <dd className="developer-page__user-details-value text-b-m">{user.eventCount}</dd>
          </div>
          <div className="developer-page__user-details-row">
            <dt className="developer-page__user-details-term text-b-m text-light">Entitlements</dt>
            <dd className="developer-page__user-details-value text-b-m">
              {formatEntitlements(user.entitlements)}
            </dd>
          </div>
          <div className="developer-page__user-details-row">
            <dt className="developer-page__user-details-term text-b-m text-light">Version</dt>
            <dd className="developer-page__user-details-value text-b-m">
              {user.webAndApiVersion ?? 'Unknown'}
            </dd>
          </div>
        </dl>
      </ModalBody>
      <ModalFooter>
        <Button type="primary" size="medium" text="Done" onClick={onClose} />
      </ModalFooter>
    </>
  );
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
  displayName?: string;
  inviteEmailSent?: boolean;
};

type InviteUserModalProps = {
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
      <ModalFooter>
        <Button type="primary" size="medium" text="Done" onClick={onClose} />
      </ModalFooter>
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
      description="Share these login details with the user."
      user={user}
      password={password}
      email={email}
      onClose={onClose}
    />
  );
}

function UserInvitedModal({
  email,
  displayName,
  onClose,
}: {
  email: string;
  displayName: string;
  onClose: () => void;
}) {
  return (
    <>
      <ModalHeader>Invite sent</ModalHeader>
      <ModalBody className="developer-page__add-user-modal">
        <p className="text-light text-b-m">
          An invite email was sent to {email} for {displayName}. They can set their password from
          the link in that message.
        </p>
      </ModalBody>
      <ModalFooter>
        <Button type="primary" size="medium" text="Done" onClick={onClose} />
      </ModalFooter>
    </>
  );
}

function InviteUserModal({ onCreated, onClose }: InviteUserModalProps) {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const trimmedEmail = email.trim();
  const trimmedDisplayName = displayName.trim();
  const canCreate = isPlausibleEmail(trimmedEmail);
  const canSendInvite = canCreate && trimmedDisplayName !== '';

  const submit = async (sendInviteEmail: boolean) => {
    const nextEmail = trimmedEmail.toLowerCase();
    if (!isPlausibleEmail(nextEmail) || isSubmitting) return;
    if (sendInviteEmail && trimmedDisplayName === '') return;

    setError(null);
    setIsSubmitting(true);
    try {
      const res = await createUser(nextEmail, {
        displayName: trimmedDisplayName || undefined,
        sendInviteEmail,
      });
      onCreated({
        user: res.user,
        password: res.password,
        email: nextEmail,
        displayName: trimmedDisplayName || undefined,
        inviteEmailSent: res.inviteEmailSent,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'failed to create user');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <ModalHeader>Invite user</ModalHeader>
      <ModalBody className="developer-page__add-user-modal">
        <p className="text-light text-b-m">
          Enter a display name and email address. Use Create to share a temporary password manually,
          or Send email to deliver a setup link.
        </p>
        <Input
          size="small"
          className="developer-page__add-user-input"
          placeholder="Display name"
          disabled={isSubmitting}
          dismissable
          submittable={false}
          autoCapitalize="words"
          autoCorrect="off"
          spellCheck={false}
          autoComplete="name"
          onChange={setDisplayName}
        />
        <Input
          size="small"
          className="developer-page__add-user-input"
          placeholder="Email"
          disabled={isSubmitting}
          dismissable
          submittable={false}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          autoComplete="email"
          inputMode="email"
          onChange={setEmail}
        />
        {error ? (
          <InfoText size="small" variant="error">
            {error}
          </InfoText>
        ) : null}
      </ModalBody>
      <ModalFooter>
        <Button
          type="secondary"
          size="medium"
          text="Cancel"
          disabled={isSubmitting}
          className="mr-2"
          onClick={onClose}
        />
        <Button
          type="secondary"
          size="medium"
          text={isSubmitting ? 'Creating…' : 'Create'}
          disabled={isSubmitting || !canCreate}
          className="mr-2"
          onClick={() => void submit(false)}
        />
        <Button
          type="primary"
          size="medium"
          text={isSubmitting ? 'Sending…' : 'Send email'}
          disabled={isSubmitting || !canSendInvite}
          onClick={() => void submit(true)}
        />
      </ModalFooter>
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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleReset = async () => {
    setError(null);
    setBusy(true);
    try {
      const res = await adminResetUserPassword(targetUsername);
      setCredentials({ user: res.user, password: res.password });
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to reset password');
    } finally {
      setBusy(false);
    }
  };

  if (error) {
    return (
      <>
        <ModalHeader>Change password</ModalHeader>
        <ModalBody className="developer-page__add-user-modal">
          <InfoText size="small" variant="error">
            {error}
          </InfoText>
        </ModalBody>
        <ModalFooter>
          <Button
            type="secondary"
            size="medium"
            text="Cancel"
            disabled={busy}
            className="mr-2"
            onClick={onClose}
          />
          <Button
            type="primary"
            size="medium"
            text={busy ? 'Changing…' : 'Try again'}
            disabled={busy}
            onClick={() => void handleReset()}
          />
        </ModalFooter>
      </>
    );
  }

  if (!credentials) {
    return (
      <>
        <ModalHeader>Change password</ModalHeader>
        <ModalBody className="developer-page__add-user-modal">
          <p className="text-b-m">
            Generate a new temporary password for{' '}
            <strong className="text-bold">{targetUsername}</strong>?
          </p>
          <p className="text-light text-b-m">
            Their current password will stop working immediately. Share the new password securely.
          </p>
        </ModalBody>
        <ModalFooter>
          <Button
            type="secondary"
            size="medium"
            text="Cancel"
            disabled={busy}
            className="mr-2"
            onClick={onClose}
          />
          <Button
            type="primary"
            size="medium"
            text={busy ? 'Changing…' : 'Change password'}
            disabled={busy}
            onClick={() => void handleReset()}
          />
        </ModalFooter>
      </>
    );
  }

  return (
    <UserCredentialsModal
      title="New password"
      description={`A new temporary password was generated for ${targetUsername}. Share it securely.`}
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
        {error ? (
          <InfoText size="small" variant="error">
            {error}
          </InfoText>
        ) : null}
      </ModalBody>
      <ModalFooter>
        <Button
          type="secondary"
          size="medium"
          text="Cancel"
          disabled={busy}
          className="mr-2"
          onClick={onClose}
        />
        <Button
          type="primary"
          size="medium"
          text={busy ? 'Deleting…' : 'Delete user'}
          disabled={busy}
          onClick={() => void handleDelete()}
        />
      </ModalFooter>
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
      <Hoverable.Anchor className="flex">
        <Button
          type="tertiary"
          size="medium"
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
  const navigate = useNavigate();
  const { user } = useParams();
  const { me, loading: userLoading } = useUser();
  const [developerData, setDeveloperData] = useState<DeveloperGetResponse | null>(null);
  const [developerError, setDeveloperError] = useState<string | null>(null);
  const [browserNow, setBrowserNow] = useState(() => new Date());
  const [users, setUsers] = useState<ListUserItem[] | null>(null);
  const [usersError, setUsersError] = useState<string | null>(null);
  const canViewDeveloper = userLoading
    ? null
    : isMeLoggedIn(me) && me.username === user
      ? me.admin
      : false;
  const { present, closeModal } = useModal();
  const { showToast } = useToast();

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
    if (user && canViewDeveloper === false) {
      navigate(`/users/${encodeURIComponent(user)}/settings/account`);
    }
  }, [canViewDeveloper, navigate, user]);

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
      <SettingsPageCard
        headerText="Users"
        className="developer-page__users"
        actions={
          <Button
            type="secondary"
            text="Invite user"
            onClick={() => {
              present({
                content: (
                  <InviteUserModal
                    onCreated={(credentials) => {
                      closeModal();
                      void loadUsers();
                      if (credentials.inviteEmailSent && credentials.displayName) {
                        showToast({
                          type: 'success',
                          message: `Invite sent to ${credentials.email}.`,
                        });
                        present({
                          content: (
                            <UserInvitedModal
                              email={credentials.email}
                              displayName={credentials.displayName}
                              onClose={closeModal}
                            />
                          ),
                        });
                        return;
                      }
                      showToast({
                        type: 'success',
                        message: `Created user "${credentials.user}".`,
                      });
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
      >
        <div className="card-padding">
          {usersError ? (
            <p className="text-light text-b-m">Could not load users: {usersError}</p>
          ) : users == null ? (
            <p className="text-light text-b-m">Loading users...</p>
          ) : users.length === 0 ? (
            <p className="text-light text-b-m">No users found.</p>
          ) : (
            <ul className="developer-page__users-list">
              {users.map((userRow) => {
                const { username } = userRow;
                const primaryName = userRow.displayName || username;
                const summaryParts = [
                  userRow.email || 'No email',
                  `Last login: ${formatUnixTimeLocal(userRow.lastLoginAt)}`,
                  formatCount(userRow.habitCount, 'habit'),
                  formatCount(userRow.eventCount, 'event'),
                ];
                const isCurrentUser = username === user;
                return (
                  <li key={username} className="developer-page__users-list-row">
                    <div className="developer-page__users-list-summary">
                      <button
                        type="button"
                        className="text-color-link text-b-m mr-2"
                        onClick={() => {
                          present({
                            content: <UserDetailsModal user={userRow} onClose={closeModal} />,
                          });
                        }}
                      >
                        {primaryName}
                      </button>
                      <span className="developer-page__users-list-meta text-b-s text-light">
                        {summaryParts.join(' · ')}
                      </span>
                    </div>
                    {!isCurrentUser ? (
                      <div className="developer-page__users-list-actions">
                        <UserRowIconAction
                          tooltip="ouc"
                          icon="user-lock"
                          ariaLabel={`Open operate-under session for ${username}`}
                          onClick={() => {
                            void (async () => {
                              try {
                                const res = await createOucSession(username);
                                const opened = openOucWindow(res.user, res.token);
                                showToast({
                                  type: opened ? 'success' : 'error',
                                  message: opened
                                    ? `Opened "${username}" in a new operate-under window.`
                                    : `Could not open operate-under window for "${username}". Allow pop-ups and try again.`,
                                });
                              } catch (e) {
                                showToast({
                                  type: 'error',
                                  message:
                                    e instanceof Error
                                      ? e.message
                                      : 'Failed to create operate-under session.',
                                });
                              }
                            })();
                          }}
                        />
                        <UserRowIconAction
                          tooltip="Change password"
                          icon="key-round"
                          ariaLabel={`Change password for ${username}`}
                          onClick={() => {
                            present({
                              content: (
                                <ResetPasswordModal
                                  targetUsername={username}
                                  onDone={() => {
                                    showToast({
                                      type: 'success',
                                      message: `Generated a new password for "${username}".`,
                                    });
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
                            present({
                              content: (
                                <DeleteUserModal
                                  targetUsername={username}
                                  onDone={() => {
                                    showToast({
                                      type: 'success',
                                      message: `Deleted user "${username}".`,
                                    });
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
      </SettingsPageCard>

      <SettingsPageCard headerText="Time" headerAs="h3" className="developer-page__clocks">
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
      </SettingsPageCard>

      <SettingsPageCard headerText="Version" headerAs="h3" className="developer-page__version">
        <div className="card-padding">
          {developerError ? (
            <p className="text-light text-b-m">Could not load: {developerError}</p>
          ) : version ? (
            <dl className="developer-page__version-list">
              <div className="developer-page__version-row">
                <dt className="text-b-m">Server</dt>
                <dd className="developer-page__version-dd text-b-m">v{version.currentVersion}</dd>
              </div>
            </dl>
          ) : (
            <p className="text-light text-b-m">Loading…</p>
          )}
        </div>
      </SettingsPageCard>
    </div>
  );
}
