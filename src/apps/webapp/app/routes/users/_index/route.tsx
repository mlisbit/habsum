import { useEffect, useState } from 'react';
import { createUser, listUsers } from '~/api.client';
import { Button } from '~/core-components/Button';
import { getSelectedUser, setSelectedUser } from '~/cookies.client';

export default function UsersIndex() {
  const [users, setUsers] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    setSelected(getSelectedUser());
    listUsers()
      .then((r) => setUsers(r.users))
      .catch(() => setUsers([]));
  }, []);

  return (
    <div className="container users-index">
      <div className="header-row">
        <h1 className="text-h-xl">Pick a user</h1>
        <div className="users-index__actions">
          {selected ? <span className="text-light text-b-m">current: {selected}</span> : null}
          <Button
            type="primary"
            icon="plus"
            text={isCreating ? 'Adding…' : 'Add user'}
            disabled={isCreating}
            onClick={async () => {
              setError(null);
              setIsCreating(true);
              try {
                await createUser('user');
                const next = await listUsers();
                setUsers(next.users);
              } catch (e) {
                setError(e instanceof Error ? e.message : 'failed to create user');
              } finally {
                setIsCreating(false);
              }
            }}
          />
        </div>
      </div>

      {error ? <p className="warn text-b-s users-index__error">{error}</p> : null}

      {users.length === 0 ? (
        <p className="text-light text-b-m">
          No users found. Use “Add user” (creates <code>users/user.yaml</code>).
        </p>
      ) : (
        users.map((user) => (
          <div key={user} className="card">
            <div className="row">
              <h2 className="text-h-l">{user}</h2>
              <Button
                type="primary"
                text="Select"
                onClick={() => {
                  setSelectedUser(user);
                  setSelected(user);
                  window.location.assign(`/users/${encodeURIComponent(user)}/habits`);
                }}
              />
            </div>
          </div>
        ))
      )}
    </div>
  );
}
