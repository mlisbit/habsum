import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '@habsum/ui/components/Button';
import { InfoText } from '@habsum/ui/components/InfoText';
import { Input } from '@habsum/ui/components/Input';
import { createInitialUser } from '~/api.client';
import { HomeLink } from '~/components/HomeLink';
import { useAuth } from '~/context/auth';
import { userDefaultAppPath } from '~/utils/user-session-guard';

export default function WelcomeRoute() {
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    const nextUsername = username.trim();
    const nextPassword = password.trim();
    if (!nextUsername) {
      setError('Enter a username');
      return;
    }
    if (!nextPassword) {
      setError('Enter a password');
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      const response = await createInitialUser(nextUsername, nextPassword);
      await refresh();
      navigate(userDefaultAppPath(response.user), { replace: true });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'failed to create initial user');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="users-index">
      <HomeLink />
      <div className="users-index__main">
        <div className="card users-index__card">
          <div className="users-index__header">
            <h1 className="text-h-l">Welcome</h1>
          </div>
          <p className="text-b-m users-index__hint">Create the first administrator account.</p>
          <form
            className="users-index__login-form"
            onSubmit={(event) => {
              event.preventDefault();
              void handleSubmit();
            }}
          >
            <Input
              className="users-index__username-input"
              placeholder="Username"
              disabled={isSubmitting}
              dismissable
              submittable={false}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              autoComplete="username"
              onChange={setUsername}
            />
            <Input
              type="password"
              className="users-index__password-input"
              placeholder="Password"
              disabled={isSubmitting}
              dismissable
              submittable={false}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              autoComplete="new-password"
              onChange={setPassword}
            />
            <button type="submit" style={{ display: 'none' }} aria-hidden />

            {error ? (
              <InfoText size="small" className="mt-1 mb-1" variant="error">
                {error}
              </InfoText>
            ) : null}

            <Button
              type="primary"
              size="medium"
              text={isSubmitting ? 'Creating account…' : 'Create account'}
              disabled={isSubmitting || username.trim() === '' || password.trim() === ''}
              onClick={() => void handleSubmit()}
            />
          </form>
        </div>
      </div>
    </div>
  );
}
