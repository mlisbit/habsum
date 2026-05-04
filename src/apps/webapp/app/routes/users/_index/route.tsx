import { useEffect, useState } from 'react';
import { Link } from '@remix-run/react';
import { createUser, listUsers } from '~/api.client';
import { Button } from '~/core-components/Button';
import { setSelectedUser } from '~/cookies.client';

export default function UsersIndex() {
  const [users, setUsers] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

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
            <Button
              type="secondary"
              icon="plus"
              disabled={isCreating}
              size="small"
              text="Add user"
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
