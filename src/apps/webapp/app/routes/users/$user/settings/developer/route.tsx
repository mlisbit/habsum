import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouteLoaderData } from 'react-router';
import type { ListUserItem } from '@habsum/types/common/misc';
import { ProductEntitlement } from '@habsum/types/common/entitlement';
import {
  adminDeleteUser,
  adminResetUserPassword,
  adminSetUserDemoAccount,
  createOucSession,
  getAdministratorEmailSettings,
  listUsers,
  type AdministratorEmailSettingsResponse,
} from '~/api.client';
import { openOucWindow } from '~/ouc.client';
import { SettingsPageCard } from '~/components/SettingsPageCard';
import { Button } from '@habsum/ui/components/Button';
import { Dropdown } from '@habsum/ui/components/Dropdown';
import { Icon } from '@habsum/ui/components/Icon';
import { InfoText } from '@habsum/ui/components/InfoText';
import { Loader } from '@habsum/ui/components/Loader';
import { ModalBody, ModalFooter, ModalHeader, useModal } from '@habsum/ui/contexts/modal';
import { useToast } from '@habsum/ui/contexts/toast';
import CreateUserModal from '~/components/admin/users/create-user-modal/CreateUserModal';
import SuccessfulUserCreationModal from '~/components/admin/users/create-user-modal/SuccessfulUserCreationModal';
import { useAuth } from '~/context/auth';
import type { loader as rootLoader } from '~/root';

function formatUnixTimeLocal(unixSeconds: number | null): string {
  if (unixSeconds == null) return 'Never';
  const d = new Date(unixSeconds * 1000);
  if (Number.isNaN(d.getTime())) return 'Unknown';
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(d);
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
    <>
      <ModalHeader>New password</ModalHeader>
      <ModalBody className="developer-page__add-user-modal">
        <p className="text-light text-b-m">
          A new temporary password was generated for {targetUsername}. Share it securely.
        </p>
        <dl className="developer-page__credentials">
          <div className="developer-page__credentials-row">
            <dt className="developer-page__credentials-term text-b-m text-light">Username</dt>
            <dd className="developer-page__credentials-value text-b-m text-bold">
              {credentials.user}
            </dd>
          </div>
          <div className="developer-page__credentials-row">
            <dt className="developer-page__credentials-term text-b-m text-light">
              Temporary password
            </dt>
            <dd className="developer-page__credentials-value text-b-m text-bold developer-page__credentials-password">
              {credentials.password}
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

type UserActionsDropdownProps = {
  username: string;
  isCurrentUser: boolean;
  isDemoUser: boolean;
  demoAccountBusy: boolean;
  onToggleDemoAccount?: () => void;
  onOperateUnder: () => void;
  onChangePassword: () => void;
  onDelete: () => void;
};

function UserActionsDropdown({
  username,
  isCurrentUser,
  isDemoUser,
  demoAccountBusy,
  onToggleDemoAccount,
  onOperateUnder,
  onChangePassword,
  onDelete,
}: UserActionsDropdownProps) {
  const [open, setOpen] = useState(false);

  const selectAction = (action: () => void) => {
    setOpen(false);
    action();
  };

  return (
    <Dropdown open={open} onOpenChange={setOpen}>
      <Dropdown.Trigger
        showIcon={false}
        aria-label={`Actions for ${username}`}
        className="developer-page__users-actions-trigger"
      >
        <Icon name="ellipsis-vertical" />
      </Dropdown.Trigger>
      <Dropdown.Content className="developer-page__users-actions-menu">
        {onToggleDemoAccount ? (
          <Button
            type="tertiary"
            size="medium"
            icon="circle-check"
            text={isDemoUser ? 'Remove demo status' : 'Make demo account'}
            aria-pressed={isDemoUser}
            disabled={demoAccountBusy}
            className="developer-page__users-actions-item"
            onClick={() => selectAction(onToggleDemoAccount)}
          />
        ) : null}
        {!isCurrentUser ? (
          <>
            <Button
              type="tertiary"
              size="medium"
              icon="user-lock"
              text="Operate under"
              className="developer-page__users-actions-item"
              onClick={() => selectAction(onOperateUnder)}
            />
            <Button
              type="tertiary"
              size="medium"
              icon="key-round"
              text="Change password"
              className="developer-page__users-actions-item"
              onClick={() => selectAction(onChangePassword)}
            />
            <Button
              type="tertiary"
              color="danger"
              size="medium"
              icon="trash"
              text="Delete user"
              className="developer-page__users-actions-item"
              onClick={() => selectAction(onDelete)}
            />
          </>
        ) : null}
      </Dropdown.Content>
    </Dropdown>
  );
}

export default function AdministratorUsers() {
  const { user } = useParams();
  const rootData = useRouteLoaderData<typeof rootLoader>('root');
  const demoEnabled = rootData?.application.demoEnabled ?? false;
  const { refresh } = useAuth();
  const [updatingDemoUsername, setUpdatingDemoUsername] = useState<string | null>(null);
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

  const handleToggleDemoAccount = async (userRow: ListUserItem) => {
    if (!demoEnabled || updatingDemoUsername !== null) return;
    const demoUser = !userRow.entitlements.includes(ProductEntitlement.DEMO_USER);
    setUpdatingDemoUsername(userRow.username);
    try {
      const response = await adminSetUserDemoAccount(userRow.username, demoUser);
      setUsers(
        (current) =>
          current?.map((row) =>
            row.username === response.user ? { ...row, entitlements: response.entitlements } : row,
          ) ?? null,
      );
      if (response.user === user) await refresh();
      showToast({
        type: 'success',
        message: response.demoUser
          ? `Made "${response.user}" a demo account.`
          : `Removed demo status from "${response.user}".`,
      });
    } catch (error) {
      showToast({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to update demo account.',
      });
    } finally {
      setUpdatingDemoUsername(null);
    }
  };

  return (
    <div className="developer-page">
      <SettingsPageCard
        headerText="Users"
        className="developer-page__users"
        actions={
          <Button
            type="primary"
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
        <div className="">
          {usersError ? (
            <p className="text-light text-b-m">Could not load users: {usersError}</p>
          ) : users == null ? (
            <Loader className="developer-page__users-loader" label="Loading users" size="medium" />
          ) : users.length === 0 ? (
            <p className="text-light text-b-m">No users found.</p>
          ) : (
            <div className="developer-page__users-table-scroll">
              <table className="developer-page__users-table" aria-label="Users">
                <thead>
                  <tr>
                    <th
                      scope="col"
                      className="developer-page__users-table-cell developer-page__users-table-heading"
                    >
                      Username
                    </th>
                    <th
                      scope="col"
                      className="developer-page__users-table-cell developer-page__users-table-heading"
                    >
                      Last activity
                    </th>
                    <th
                      scope="col"
                      className="developer-page__users-table-cell developer-page__users-table-heading developer-page__users-table-count"
                    >
                      Habits
                    </th>
                    <th
                      scope="col"
                      className="developer-page__users-table-cell developer-page__users-table-heading developer-page__users-table-count"
                    >
                      Events
                    </th>
                    <th
                      scope="col"
                      aria-label="Actions"
                      className="developer-page__users-table-cell developer-page__users-table-heading developer-page__users-table-actions-heading"
                    />
                  </tr>
                </thead>
                <tbody>
                  {users.map((userRow) => {
                    const { username } = userRow;
                    const isCurrentUser = username === user;
                    return (
                      <tr key={username} className="developer-page__users-table-row">
                        <th scope="row" className="developer-page__users-table-cell">
                          <button
                            type="button"
                            className="text-color-link text-b-m"
                            onClick={() => {
                              present({
                                content: <UserDetailsModal user={userRow} onClose={closeModal} />,
                              });
                            }}
                          >
                            {username}
                          </button>
                        </th>
                        <td className="developer-page__users-table-cell text-b-m text-light">
                          {formatUnixTimeLocal(userRow.lastLoginAt)}
                        </td>
                        <td className="developer-page__users-table-cell developer-page__users-table-count text-b-m">
                          {userRow.habitCount}
                        </td>
                        <td className="developer-page__users-table-cell developer-page__users-table-count text-b-m">
                          {userRow.eventCount}
                        </td>
                        <td className="developer-page__users-table-cell developer-page__users-table-actions">
                          {!isCurrentUser || demoEnabled ? (
                            <UserActionsDropdown
                              username={username}
                              isCurrentUser={isCurrentUser}
                              isDemoUser={userRow.entitlements.includes(
                                ProductEntitlement.DEMO_USER,
                              )}
                              demoAccountBusy={updatingDemoUsername !== null}
                              onToggleDemoAccount={
                                demoEnabled
                                  ? () => void handleToggleDemoAccount(userRow)
                                  : undefined
                              }
                              onOperateUnder={() => {
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
                              onChangePassword={() => {
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
                              onDelete={() => {
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
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </SettingsPageCard>
    </div>
  );
}
