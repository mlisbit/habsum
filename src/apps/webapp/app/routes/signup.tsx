import { Link, useNavigate } from 'react-router';
import { useEffect, useState } from 'react';
import { useFeatures } from '~/context/features';
import { Button } from '@habsum/ui/components/Button';
import { InfoText } from '@habsum/ui/components/InfoText';
import { Input } from '@habsum/ui/components/Input';
import { signupUser } from '~/api.client';
import { Footer } from '~/components/Footer';
import { HomeLink } from '~/components/HomeLink';
import { useAuth } from '~/context/auth';
import { userDefaultAppPath } from '~/utils/user-session-guard';

function isPlausibleEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function SignupRoute() {
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const features = useFeatures();
  const accountCreationEnabled = features.accountSignup;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!accountCreationEnabled) navigate('/login', { replace: true });
  }, [accountCreationEnabled, navigate]);

  if (!accountCreationEnabled) return null;

  const handleSubmit = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPassword = password.trim();
    if (!normalizedEmail) {
      setError('Enter your email');
      return;
    }
    if (!isPlausibleEmail(normalizedEmail)) {
      setError('Enter a valid email address');
      return;
    }
    if (!normalizedPassword) {
      setError('Enter your password');
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      const response = await signupUser(normalizedEmail, normalizedPassword);
      await refresh();
      navigate(userDefaultAppPath(response.user));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'account creation failed');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="users-index">
      <HomeLink />
      <div className="users-index__main">
        <div className="card users-index__card">
          <div className="users-index__header">
            <h1 className="text-h-l">Create account</h1>
          </div>

          <form
            className="users-index__login-form"
            onSubmit={(event) => {
              event.preventDefault();
              void handleSubmit();
            }}
          >
            <Input
              className="users-index__username-input"
              placeholder="Email"
              disabled={isSubmitting}
              dismissable
              submittable={false}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              autoComplete="email"
              inputMode="email"
              onChange={setEmail}
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
              disabled={isSubmitting || email.trim() === '' || password.trim() === ''}
              onClick={() => void handleSubmit()}
            />
          </form>

          <Link to="/login" className="text-b-s text-link users-index__back-link">
            Back to login
          </Link>
        </div>
      </div>

      <Footer />
    </div>
  );
}
