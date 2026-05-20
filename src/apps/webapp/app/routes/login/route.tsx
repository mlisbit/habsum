import { useEffect, useState } from 'react';
import { getAuthMe, isServerConnectionFailure, loginUser, logout } from '~/api.client';
import { Footer } from '~/components/Footer';
import { Button } from '~/core-components/Button';
import { InfoText } from '~/core-components/InfoText';
import { Input } from '~/core-components/Input';
import { clearLegacyClientLoginMarkers } from '~/cookies.client';
import { SERVER_CONNECTION_ERROR_TOAST, useToast } from '~/context/toast';
import { applyUiTheme } from '~/theme.client';
import { isMeLoggedIn, userDefaultAppPath } from '~/utils/user-session-guard';

function LoginForm({
  anotherAccountHint,
  formDisabled = false,
}: {
  anotherAccountHint: boolean;
  formDisabled?: boolean;
}) {
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLogin = async () => {
    const id = loginId.trim();
    const nextPassword = password.trim();
    if (!id) {
      setError('Enter your username or email');
      return;
    }
    if (!nextPassword) {
      setError('Enter your password');
      return;
    }

    setError(null);
    setIsLoggingIn(true);
    try {
      const res = await loginUser(id, nextPassword);
      window.location.assign(userDefaultAppPath(res.user, res.forcePasswordReset));
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
          placeholder="Username or email"
          disabled={isLoggingIn || formDisabled}
          dismissable
          submittable={false}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          autoComplete="username"
          onChange={setLoginId}
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
          disabled={isLoggingIn || formDisabled || loginId.trim() === '' || password.trim() === ''}
          onClick={() => void handleLogin()}
        />
      </form>
    </>
  );
}

export default function LoginRoute() {
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [signOutBusy, setSignOutBusy] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    clearLegacyClientLoginMarkers();
    let cancelled = false;
    getAuthMe()
      .then((me) => {
        if (!cancelled) {
          setCurrentUser(me.username);
          applyUiTheme(me.username ? me.theme : 'dark');
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setCurrentUser(null);
          if (isServerConnectionFailure(e)) {
            showToast(SERVER_CONNECTION_ERROR_TOAST);
          }
        }
      });
    return () => {
      cancelled = true;
    };
  }, [showToast]);

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
      <div className="users-index__main">
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
                onClick={() => {
                  void getAuthMe()
                    .then((me) => {
                      if (isMeLoggedIn(me) && me.username === currentUser) {
                        window.location.assign(
                          userDefaultAppPath(currentUser, me.forcePasswordReset),
                        );
                      } else {
                        window.location.assign(`/users/${encodeURIComponent(currentUser)}/habits`);
                      }
                    })
                    .catch((e) => {
                      if (isServerConnectionFailure(e)) {
                        showToast(SERVER_CONNECTION_ERROR_TOAST);
                      }
                    });
                }}
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

      <Footer />
    </div>
  );
}
