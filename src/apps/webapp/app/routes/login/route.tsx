import { useEffect, useState } from 'react';
import { getAuthMe, loginUser, logout } from '~/api.client';
import { Button } from '~/core-components/Button';
import { InfoText } from '~/core-components/InfoText';
import { Input } from '~/core-components/Input';
import { clearLegacyClientLoginMarkers } from '~/cookies.client';
import { applyUiTheme } from '~/theme.client';

function LoginForm({
  anotherAccountHint,
  formDisabled = false,
}: {
  anotherAccountHint: boolean;
  formDisabled?: boolean;
}) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLogin = async () => {
    const user = username.trim();
    const nextPassword = password.trim();
    if (!user) {
      setError('Enter your username');
      return;
    }
    if (!nextPassword) {
      setError('Enter your password');
      return;
    }

    setError(null);
    setIsLoggingIn(true);
    try {
      await loginUser(user, nextPassword);
      window.location.assign(`/users/${encodeURIComponent(user)}/habits`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'login failed');
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <>
      {anotherAccountHint && (
        <>
          <hr className="mt-4 mb-4" />
          <h2 className="text-h-m users-index__hint">Sign in with a different account.</h2>
        </>
      )}
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
          disabled={isLoggingIn || formDisabled}
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
          disabled={isLoggingIn || formDisabled}
          dismissable
          submittable={false}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          onChange={setPassword}
        />
        <button type="submit" style={{ display: 'none' }} aria-hidden />

        {error ? (
          <InfoText className="mt-1 mb-1" variant="error">
            {error}
          </InfoText>
        ) : null}

        <Button
          type="primary"
          size="medium"
          text={isLoggingIn ? 'Logging in...' : 'Log in'}
          disabled={isLoggingIn || formDisabled || username.trim() === '' || password.trim() === ''}
          onClick={() => void handleLogin()}
        />
      </form>
    </>
  );
}

export default function LoginRoute() {
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [signOutBusy, setSignOutBusy] = useState(false);

  useEffect(() => {
    clearLegacyClientLoginMarkers();
    let cancelled = false;
    getAuthMe()
      .then(({ username, theme }) => {
        if (!cancelled) {
          setCurrentUser(username);
          applyUiTheme(username ? theme : 'dark');
        }
      })
      .catch(() => {
        if (!cancelled) setCurrentUser(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSignOut = async () => {
    setSignOutBusy(true);
    try {
      await logout();
      setCurrentUser(null);
    } finally {
      setSignOutBusy(false);
    }
  };

  return (
    <div className="users-index">
      <div className="card users-index__card">
        <div className="users-index__header">
          {currentUser ? (
            <h1 className="text-h-l">You're already signed in.</h1>
          ) : (
            <h1 className="text-h-l">Log in</h1>
          )}
        </div>

        {currentUser ? (
          <div className="users-index__continue">
            <Button
              type="primary"
              text={`Continue as ${currentUser}`}
              disabled={signOutBusy}
              onClick={() =>
                window.location.assign(`/users/${encodeURIComponent(currentUser)}/habits`)
              }
            />
            <Button
              type="secondary"
              text={signOutBusy ? 'Signing out…' : 'Sign out'}
              disabled={signOutBusy}
              onClick={() => void handleSignOut()}
            />
          </div>
        ) : null}

        <LoginForm anotherAccountHint={currentUser != null} formDisabled={signOutBusy} />
      </div>
    </div>
  );
}
