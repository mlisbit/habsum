import { Link, useNavigate, useRouteLoaderData } from 'react-router';
import { useEffect, useRef, useState } from 'react';
import { useFeatures } from '~/context/features';
import { useTracking } from '@habsum/tracking/client/react';
import { HomeLink } from '~/components/HomeLink';
import { Button } from '@habsum/ui/components/Button';
import { InfoText } from '@habsum/ui/components/InfoText';
import { Input } from '@habsum/ui/components/Input';
import { clearLegacyClientLoginMarkers } from '~/cookies.client';
import { useAuth } from '~/context/auth';
import { webappTrackingSpec } from '~/tracking-spec';
import { userDefaultAppPath } from '~/utils/user-session-guard';
import type { loader as rootLoader } from '~/root';

function LoginForm({
  anotherAccountHint,
  formDisabled = false,
}: {
  anotherAccountHint: boolean;
  formDisabled?: boolean;
}) {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const tracking = useTracking<typeof webappTrackingSpec>();
  const features = useFeatures();
  const rootData = useRouteLoaderData<typeof rootLoader>('root');
  const demoEnabled = rootData?.application.demoEnabled ?? false;
  const demoUser = rootData?.application.demoUser;
  const formRef = useRef<HTMLFormElement>(null);
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isDemoLoginPending, setIsDemoLoginPending] = useState(false);

  useEffect(() => {
    if (!isDemoLoginPending) return;
    const timeout = window.setTimeout(() => {
      setIsDemoLoginPending(false);
      formRef.current?.querySelector<HTMLButtonElement>('[data-login-submit]')?.click();
    }, 1_000);
    return () => window.clearTimeout(timeout);
  }, [isDemoLoginPending]);

  const handleLogin = async () => {
    setIsDemoLoginPending(false);
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
      const res = await signIn(id, nextPassword);
      navigate(userDefaultAppPath(res.user));
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
      {demoEnabled ? (
        <div className="card users-index__demo">
          <p className="text-b-m">This is a demo instance of Habsum. It is regularly reset.</p>
          <p className="text-b-s text-light">Functionality will be limited to prevent abuse</p>
          <Button
            type="secondary"
            text="Login as demo user"
            disabled={!demoUser || isDemoLoginPending || isLoggingIn || formDisabled}
            onClick={() => {
              if (!demoUser) return;
              setError(null);
              setLoginId(demoUser.username);
              setPassword(demoUser.password);
              setIsDemoLoginPending(true);
            }}
          />
        </div>
      ) : null}
      <form
        ref={formRef}
        className="users-index__login-form"
        onSubmit={(e) => {
          e.preventDefault();
          void handleLogin();
        }}
      >
        <Input
          className="users-index__username-input"
          value={loginId}
          placeholder="Username or email"
          disabled={isLoggingIn || isDemoLoginPending || formDisabled}
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
          value={password}
          placeholder="Password"
          disabled={isLoggingIn || isDemoLoginPending || formDisabled}
          dismissable
          submittable={false}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          onChange={setPassword}
        />
        {features.forgotPassword ? (
          <Link to="/forgot-password" className="text-b-s text-link users-index__forgot-password">
            Forgot password?
          </Link>
        ) : null}
        <button type="submit" style={{ display: 'none' }} aria-hidden />

        {error ? (
          <InfoText size="small" className="mt-1 mb-1" variant="error">
            {error}
          </InfoText>
        ) : null}

        <Button
          data-login-submit
          type="primary"
          size="medium"
          text={isLoggingIn ? 'Logging in...' : 'Log in'}
          disabled={isLoggingIn || formDisabled || loginId.trim() === '' || password.trim() === ''}
          onClick={() => {
            tracking.trackClick('login-click');
            void handleLogin();
          }}
        />
        {features.accountSignup ? (
          <p className="users-index__signup text-b-s text-light">
            Don&apos;t have an account?{' '}
            <Link to="/signup" className="text-link">
              Sign up
            </Link>
          </p>
        ) : null}
      </form>
    </>
  );
}

export default function LoginRoute() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const currentUser = user?.username ?? null;
  const [signOutBusy, setSignOutBusy] = useState(false);

  useEffect(() => {
    clearLegacyClientLoginMarkers();
  }, []);

  const handleSignOut = async () => {
    setSignOutBusy(true);
    try {
      await signOut();
    } finally {
      setSignOutBusy(false);
    }
  };

  return (
    <div className="users-index">
      <HomeLink />
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
                  navigate(userDefaultAppPath(currentUser));
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
    </div>
  );
}
