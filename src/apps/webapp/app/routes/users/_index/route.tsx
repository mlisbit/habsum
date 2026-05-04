import { useEffect, useState } from 'react';
import { Link } from '@remix-run/react';
import { createUser, listUsers } from '~/api.client';
import { Button } from '~/core-components/Button';
import { Hoverable } from '~/core-components/Hoverable';
import { InfoText } from '~/core-components/InfoText';
import { Input } from '~/core-components/Input';
import { ModalActions, ModalBody, ModalTitle, useModal } from '~/context/modal';
import { setSelectedUser } from '~/cookies.client';

type AddUserModalProps = {
  onUsersLoaded: (users: string[]) => void;
  onClose: () => void;
};

function AddUserModal({ onUsersLoaded, onClose }: AddUserModalProps) {
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const canCreate = username.trim() !== '';

  const handleCreate = async (rawUsername: string) => {
    const username = rawUsername.trim();
    if (!username || isCreating) return;

    setError(null);
    setIsCreating(true);
    try {
      await createUser(username);
      const next = await listUsers();
      onUsersLoaded(next.users);
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
      <ModalBody className="users-index__add-user-modal">
        <p className="text-light text-b-m">Choose a username for the new user.</p>
        <Input
          className="users-index__username-input"
          placeholder="Username"
          disabled={isCreating}
          dismissable
          submittable={false}
          onChange={setUsername}
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
          text="Create"
          disabled={isCreating || !canCreate}
          onClick={() => void handleCreate(username)}
        />
      </ModalActions>
    </>
  );
}

export default function UsersIndex() {
  const [users, setUsers] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { present, closeModal } = useModal();

  useEffect(() => {
    listUsers()
      .then((r) => setUsers(r.users))
      .catch(() => setUsers([]));
  }, []);

  return (
    <div className="users-index">
      <div className="card users-index__card">
        <div className="users-index__header">
          <h1 className="text-h-l">Select user</h1>
          <div className="users-index__actions">
            <Hoverable.Root>
              <Hoverable.Anchor className="users-index__add-user-anchor">
                <Button
                  type="secondary"
                  icon="user-round-plus"
                  size="small"
                  onClick={() => {
                    setError(null);
                    present({
                      content: <AddUserModal onUsersLoaded={setUsers} onClose={closeModal} />,
                    });
                  }}
                />
              </Hoverable.Anchor>
              <Hoverable.Content className="users-index__add-user-tooltip" side="top">
                Add user
              </Hoverable.Content>
            </Hoverable.Root>
          </div>
        </div>

        {error ? <InfoText variant="error">{error}</InfoText> : null}

        {users.length === 0 ? (
          <p className="text-light text-b-m">
            No users found. Use “Add user” (creates <code>users/user.yaml</code>).
          </p>
        ) : (
          users.map((user) => (
            <Link
              key={user}
              className="card card--clickable users-index__user-card"
              to={`/users/${encodeURIComponent(user)}/habits`}
              onClick={() => setSelectedUser(user)}
            >
              <div className="users-index__user-row">
                <h2 className="text-h-l">{user}</h2>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
