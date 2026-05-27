import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../app.js';
import { ensureUserPins, patchUserProfile } from '../db.js';
import * as passwordResetEmail from '../password-reset-email.js';

describe('POST /auth/forgot-password', () => {
  it('returns the same success message whether or not the email is registered', async () => {
    const app = createApp();
    const sendSpy = vi.spyOn(passwordResetEmail, 'sendPasswordResetEmail');

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
    expect(sendSpy).toHaveBeenCalledWith('forgot-password-user', 'known@example.com');

    sendSpy.mockRestore();
  });

  it('rejects missing or invalid emails', async () => {
    const app = createApp();

    await request(app).post('/auth/forgot-password').send({}).expect(400);
    await request(app).post('/auth/forgot-password').send({ email: 'not-an-email' }).expect(400);
  });

  it('rate limits repeat reset requests for the same user', async () => {
    const app = createApp();
    const sendSpy = vi.spyOn(passwordResetEmail, 'sendPasswordResetEmail');
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
});
