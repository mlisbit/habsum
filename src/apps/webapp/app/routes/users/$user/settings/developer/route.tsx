import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router';
import type { ListUserItem } from '@habsum/types/common/misc';
import {
  adminDeleteUser,
  adminResetUserPassword,
  createOucSession,
  getAdministratorEmailSettings,
  listUsers,
  type AdministratorEmailSettingsResponse,
} from '~/api.client';
import { openOucWindow } from '~/ouc.client';
import { SettingsPageCard } from '~/components/SettingsPageCard';
import { Button } from '@habsum/ui/components/Button';
import { Hoverable } from '@habsum/ui/components/Hoverable';
import type { IconName } from '@habsum/ui/components/Icon';
import { InfoText } from '@habsum/ui/components/InfoText';
import { Loader } from '@habsum/ui/components/Loader';
import { ModalBody, ModalFooter, ModalHeader, useModal } from '@habsum/ui/contexts/modal';
import { useToast } from '@habsum/ui/contexts/toast';
import CreateUserModal from '~/components/admin/users/create-user-modal/CreateUserModal';
import SuccessfulUserCreationModal from '~/components/admin/users/create-user-modal/SuccessfulUserCreationModal';
import UserCredentialsModal from '~/components/admin/users/create-user-modal/UserCredentialsModal';

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

export default function AdministratorUsers() {
  const { user } = useParams();
  const [users, setUsers] = useState<ListUserItem[] | null>(null);
  const [emailSettings, setEmailSettings] = useState<AdministratorEmailSettingsResponse | null>(
    null,
  );
  const [usersError, setUsersError] = useState<string | null>(null);
  const { present, closeModal } = useModal();
  const { showToast } = useToast();

  const loadUsers = useCallback(async () => {
    setUsersError(null);
    try {
      const [usersResponse, emailSettingsResponse] = await Promise.all([
        listUsers(),
        getAdministratorEmailSettings().catch(() => null),
      ]);
      setUsers(usersResponse.users);
      setEmailSettings(emailSettingsResponse);
    } catch (e) {
      setUsers(null);
      setEmailSettings(null);
      setUsersError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const canSendInviteEmail = Boolean(
    emailSettings?.emailProvider?.apiKey && emailSettings.emailProvider.email,
  );

  return (
    <div className="developer-page">
      <SettingsPageCard
        headerText="Users"
        className="developer-page__users"
        actions={
          <Button
            type="secondary"
            text="Create user"
            onClick={() => {
              present({
                content: (
                  <CreateUserModal
                    onCreated={(credentials) => {
                      void loadUsers();
                      showToast({
                        type: 'success',
                        message: `Created user "${credentials.user}".`,
                      });
                      present({
                        size: 'large',
                        content: (
                          <SuccessfulUserCreationModal
                            {...credentials}
                            canSendEmail={canSendInviteEmail}
                            onClose={closeModal}
                          />
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
            <Loader className="developer-page__users-loader" label="Loading users" size="medium" />
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
    </div>
  );
}
