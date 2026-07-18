import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../../app.js';
import { ConfigService } from '../../services/config-service.js';
import { ensureUserPins, isUserPinValid, patchUserProfile, setUserPin } from '../../db.js';
import { issuePasswordResetToken } from '../../password-reset-token.js';
import * as passwordResetEmail from '../../password-reset-email.js';

const configService = new ConfigService();

describe('POST /auth/forgot-password', () => {
  it('returns the same success message whether or not the email is registered', async () => {
    const app = createApp();
    const sendSpy = vi
      .spyOn(passwordResetEmail, 'sendPasswordResetEmail')
      .mockResolvedValue(undefined);

    ensureUserPins(['forgot-password-user']);
    patchUserProfile('forgot-password-user', { email: 'known@example.com' });

    const unknownRes = await request(app)
      .post('/auth/forgot-password')
      .send({ email: 'unknown@example.com' })
      .expect(200);

    expect(unknownRes.body).toEqual({
      ok: true,
      message: 'If an account exists for that email, reset instructions will be sent shortly.',
    });
    expect(sendSpy).not.toHaveBeenCalled();

    const knownRes = await request(app)
      .post('/auth/forgot-password')
      .send({ email: 'known@example.com' })
      .expect(200);

    expect(knownRes.body).toEqual({
      ok: true,
      message: 'If an account exists for that email, reset instructions will be sent shortly.',
    });
    expect(sendSpy).toHaveBeenCalledOnce();
    expect(sendSpy).toHaveBeenCalledWith(
      'forgot-password-user',
      'known@example.com',
      expect.any(String),
    );

    sendSpy.mockRestore();
  });

  it('rejects missing or invalid emails', async () => {
    const app = createApp();

    await request(app).post('/auth/forgot-password').send({}).expect(400);
    await request(app).post('/auth/forgot-password').send({ email: 'not-an-email' }).expect(400);
  });

  it('rate limits repeat reset requests for the same user', async () => {
    const app = createApp();
    const sendSpy = vi
      .spyOn(passwordResetEmail, 'sendPasswordResetEmail')
      .mockResolvedValue(undefined);
    const now = 1_700_000_000_000;
    vi.spyOn(Date, 'now').mockReturnValue(now);

    ensureUserPins(['rate-limit-user']);
    patchUserProfile('rate-limit-user', { email: 'ratelimit@example.com' });

    await request(app)
      .post('/auth/forgot-password')
      .send({ email: 'ratelimit@example.com' })
      .expect(200);
    expect(sendSpy).toHaveBeenCalledOnce();

    vi.spyOn(Date, 'now').mockReturnValue(now + 10_000);

    const res = await request(app)
      .post('/auth/forgot-password')
      .send({ email: 'ratelimit@example.com' })
      .expect(200);

    expect(res.body).toEqual({
      ok: true,
      message: 'please wait a little while longer',
      timeout: 20,
    });
    expect(sendSpy).toHaveBeenCalledOnce();

    sendSpy.mockRestore();
    vi.restoreAllMocks();
  });

  it('returns an error to the client when email delivery fails for a known user', async () => {
    const app = createApp();
    vi.spyOn(passwordResetEmail, 'sendPasswordResetEmail').mockRejectedValue(
      new Error('RESEND_API_KEY is not configured'),
    );

    ensureUserPins(['email-fail-user']);
    patchUserProfile('email-fail-user', { email: 'fail@example.com' });

    const res = await request(app)
      .post('/auth/forgot-password')
      .send({ email: 'fail@example.com' })
      .expect(503);

    expect(res.body).toEqual({ error: 'Something went wrong with your request' });

    vi.restoreAllMocks();
  });
});

describe('password reset token flow', () => {
  it('validates and consumes a reset token to change the password', async () => {
    const app = createApp();
    ensureUserPins(['reset-token-user']);
    setUserPin('reset-token-user', 'old-secret');

    const { token } = issuePasswordResetToken('reset-token-user', 'reset');

    const validateRes = await request(app).get('/auth/reset-password').query({ token }).expect(200);
    expect(validateRes.body).toEqual({
      ok: true,
      purpose: 'reset',
    });

    await request(app)
      .post('/auth/reset-password')
      .send({ token, newPin: 'new-secret' })
      .expect(200);

    expect(isUserPinValid('reset-token-user', 'new-secret')).toBe(true);
    expect(isUserPinValid('reset-token-user', 'old-secret')).toBe(false);

    await request(app).get('/auth/reset-password').query({ token }).expect(400);
  });

  it('rejects expired reset tokens', async () => {
    const app = createApp();
    ensureUserPins(['expired-token-user']);
    const now = 1_700_000_000_000;
    vi.spyOn(Date, 'now').mockReturnValue(now * 1000);

    const { token } = issuePasswordResetToken('expired-token-user', 'reset', now);

    vi.spyOn(Date, 'now').mockReturnValue((now + 16 * 60) * 1000);

    await request(app).get('/auth/reset-password').query({ token }).expect(400);

    vi.restoreAllMocks();
  });

  it('returns display name for invite tokens and auto-logs in after password set', async () => {
    configService.ensureConfigLayout();
    const app = createApp();
    configService.createEmptyUserConfig('invite-setup-user');
    setUserPin('invite-setup-user', 'temp-secret');
    patchUserProfile('invite-setup-user', { displayName: 'Alex', email: 'alex@example.com' });

    const { token } = issuePasswordResetToken('invite-setup-user', 'invite');

    const validateRes = await request(app).get('/auth/reset-password').query({ token }).expect(200);
    expect(validateRes.body).toEqual({
      ok: true,
      purpose: 'invite',
      displayName: 'Alex',
    });

    const resetRes = await request(app)
      .post('/auth/reset-password')
      .send({ token, newPin: 'chosen-secret' })
      .expect(200);

    expect(resetRes.body).toEqual({ ok: true, user: 'invite-setup-user' });
    const sessionCookie = resetRes.headers['set-cookie']?.[0]?.split(';')[0];
    expect(sessionCookie).toMatch(/^habsum_sid=/);
    expect(isUserPinValid('invite-setup-user', 'chosen-secret')).toBe(true);

    const meRes = await request(app).get('/auth/me').set('Cookie', sessionCookie!).expect(200);

    expect(meRes.body).toMatchObject({ username: 'invite-setup-user', displayName: 'Alex' });
  });
});
