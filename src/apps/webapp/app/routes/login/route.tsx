import { useEffect, useState } from 'react';
import { getAuthMe, loginUser } from '~/api.client';
import { Button } from '~/core-components/Button';
import { InfoText } from '~/core-components/InfoText';
import { Input } from '~/core-components/Input';
import { clearLegacyClientLoginMarkers } from '~/cookies.client';

function LoginForm() {
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLogin = async () => {
    const user = username.trim();
    const nextPin = pin.trim();
    if (!user) {
      setError('Enter your username');
      return;
    }
    if (!nextPin) {
      setError('Enter your PIN');
      return;
    }

    setError(null);
    setIsLoggingIn(true);
    try {
      await loginUser(user, nextPin);
      window.location.assign(`/users/${encodeURIComponent(user)}/habits`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'login failed');
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <>
      <p className="text-light text-b-m users-index__hint">
        Enter your username and PIN to continue.
      </p>
      <form
        className="users-index__login-form"
        onSubmit={(e) => {
          e.preventDefault();
          void handleLogin();
        }}
      >
        <Input
          className="users-index__username-input"
          placeholder="Username"
          disabled={isLoggingIn}
          dismissable
          submittable={false}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          onChange={setUsername}
        />
        <Input
          className="users-index__pin-input"
          placeholder="PIN"
          disabled={isLoggingIn}
          dismissable
          submittable={false}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          onChange={setPin}
        />
        <button type="submit" style={{ display: 'none' }} aria-hidden />
        <Button
          type="primary"
          size="small"
          text={isLoggingIn ? 'Logging in...' : 'Log in'}
          disabled={isLoggingIn || username.trim() === '' || pin.trim() === ''}
          onClick={() => void handleLogin()}
        />
      </form>
      {error ? <InfoText variant="error">{error}</InfoText> : null}
    </>
  );
}

export default function LoginRoute() {
  const [currentUser, setCurrentUser] = useState<string | null>(null);

  useEffect(() => {
    clearLegacyClientLoginMarkers();
    let cancelled = false;
    getAuthMe()
      .then(({ user }) => {
        if (!cancelled) setCurrentUser(user);
      })
      .catch(() => {
        if (!cancelled) setCurrentUser(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="users-index">
      <div className="card users-index__card">
        <div className="users-index__header">
          <h1 className="text-h-l">Log in</h1>
        </div>

        {currentUser ? (
          <div className="users-index__continue">
            <p className="text-light text-b-m">You're already signed in.</p>
            <Button
              type="primary"
              text={`Continue as ${currentUser}`}
              onClick={() =>
                window.location.assign(`/users/${encodeURIComponent(currentUser)}/habits`)
              }
            />
          </div>
        ) : null}

        <LoginForm />
      </div>
    </div>
  );
}
