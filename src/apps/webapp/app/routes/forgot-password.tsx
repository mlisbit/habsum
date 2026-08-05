import { Link } from 'react-router';
import { useEffect, useState } from 'react';
import { requestForgotPassword } from '~/api.client';
import { Footer } from '~/components/Footer';
import { Button } from '@habsum/ui/components/Button';
import { InfoText } from '@habsum/ui/components/InfoText';
import { Input } from '@habsum/ui/components/Input';

export default function ForgotPasswordRoute() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [retryAfterSeconds, setRetryAfterSeconds] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (retryAfterSeconds <= 0) return;
    const id = window.setInterval(() => {
      setRetryAfterSeconds((seconds) => (seconds <= 1 ? 0 : seconds - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [retryAfterSeconds]);

  const handleSubmit = async () => {
    const nextEmail = email.trim();
    if (!nextEmail) {
      setError('Enter your email');
      return;
    }

    setError(null);
    setSuccessMessage(null);
    setIsRateLimited(false);
    setIsSubmitting(true);
    try {
      const res = await requestForgotPassword(nextEmail);
      setSuccessMessage(res.message);
      if (res.timeout != null && res.timeout > 0) {
        setIsRateLimited(true);
        setRetryAfterSeconds(res.timeout);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'request failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitDisabled = isSubmitting || retryAfterSeconds > 0 || email.trim() === '';

  return (
    <div className="users-index">
      <div className="users-index__main">
        <div className="card users-index__card">
          <div className="users-index__header">
            <h1 className="text-h-l">Forgot password</h1>
          </div>

          <p className="text-b-m users-index__hint">
            Enter the email address for your account and we&apos;ll send reset instructions.
          </p>

          <form
            className="users-index__login-form"
            onSubmit={(e) => {
              e.preventDefault();
              void handleSubmit();
            }}
          >
            <Input
              className="users-index__username-input"
              placeholder="Email"
              type="string"
              disabled={isSubmitting}
              dismissable
              submittable={false}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              autoComplete="email"
              onChange={setEmail}
            />
            <button type="submit" style={{ display: 'none' }} aria-hidden />

            {error ? (
              <InfoText size="small" className="mt-1 mb-1" variant="error">
                {error}
              </InfoText>
            ) : null}

            {successMessage ? (
              <InfoText
                size="small"
                className="mt-1 mb-1"
                variant={isRateLimited ? 'info' : 'success'}
              >
                {successMessage}
                {retryAfterSeconds > 0 ? ` Try again in ${retryAfterSeconds}s.` : null}
              </InfoText>
            ) : null}

            <Button
              type="primary"
              size="medium"
              text={
                isSubmitting
                  ? 'Sending…'
                  : retryAfterSeconds > 0
                    ? `Wait ${retryAfterSeconds}s`
                    : 'Send reset link'
              }
              disabled={submitDisabled}
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
