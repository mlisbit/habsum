import { Link, useNavigate } from '@remix-run/react';
import { useEffect, useState } from 'react';
import { useTracking } from '@habsum/tracking/react';
import { loginUser, logout } from '~/api.client';
import { Footer } from '~/components/Footer';
import { Button } from '@habsum/ui/components/Button';
import { InfoText } from '@habsum/ui/components/InfoText';
import { Input } from '@habsum/ui/components/Input';
import { clearLegacyClientLoginMarkers } from '~/cookies.client';
import { useUser } from '~/context/user';
import { webappTrackingSpec } from '~/tracking-spec';
import { isMeLoggedIn, userDefaultAppPath } from '~/utils/user-session-guard';

function LoginForm({
  anotherAccountHint,
  formDisabled = false,
}: {
  anotherAccountHint: boolean;
  formDisabled?: boolean;
}) {
  const tracking = useTracking<typeof webappTrackingSpec>();
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
      window.location.assign(userDefaultAppPath(res.user));
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
        <Link to="/forgot-password" className="text-b-s text-link users-index__forgot-password">
          Forgot password?
        </Link>
        <button type="submit" style={{ display: 'none' }} aria-hidden />

        {error ? (
          <InfoText size="small" className="mt-1 mb-1" variant="error">
            {error}
          </InfoText>
        ) : null}

        <Button
          type="primary"
          size="medium"
          text={isLoggingIn ? 'Logging in...' : 'Log in'}
          disabled={isLoggingIn || formDisabled || loginId.trim() === '' || password.trim() === ''}
          onClick={() => {
            tracking.trackClick('login-click');
            void handleLogin();
          }}
        />
      </form>
    </>
  );
}

export default function LoginRoute() {
  const navigate = useNavigate();
  const { me, refresh } = useUser();
  const currentUser = me.username;
  const [signOutBusy, setSignOutBusy] = useState(false);

  useEffect(() => {
    clearLegacyClientLoginMarkers();
  }, []);

  const handleSignOut = async () => {
    setSignOutBusy(true);
    try {
      await logout();
      await refresh();
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
                  if (isMeLoggedIn(me) && me.username === currentUser) {
                    navigate(userDefaultAppPath(currentUser));
                  } else {
                    navigate(`/users/${encodeURIComponent(currentUser)}/habits`);
                  }
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
