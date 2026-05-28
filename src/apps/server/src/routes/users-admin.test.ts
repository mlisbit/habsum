import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../app.js';
import { ensureConfigLayout } from '../config.js';
import { countAdmins, createInitialAdminUser, createUserSession, ensureUserPins } from '../db.js';
import * as inviteEmail from '../invite-email.js';
import { SESSION_COOKIE_NAME } from '../session-cookie.js';

function adminSessionCookie(): string {
  ensureConfigLayout();
  ensureUserPins(['admin']);
  if (countAdmins() === 0) {
    createInitialAdminUser('admin', 'secret');
  }
  const adminSession = createUserSession('admin', 3600);
  return `${SESSION_COOKIE_NAME}=${adminSession}`;
}

describe('POST /users', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('only allows admins to create users', async () => {
    ensureConfigLayout();
    const app = createApp();

    await request(app).post('/users').send({ email: 'nobody@example.com' }).expect(401);

    ensureUserPins(['regular']);
    const regularSession = createUserSession('regular', 3600);

    await request(app)
      .post('/users')
      .set('Cookie', `${SESSION_COOKIE_NAME}=${regularSession}`)
      .send({ email: 'regular@example.com' })
      .expect(403);

    createInitialAdminUser('admin', 'secret');
    const adminSession = createUserSession('admin', 3600);

    const res = await request(app)
      .post('/users')
      .set('Cookie', `${SESSION_COOKIE_NAME}=${adminSession}`)
      .send({ email: 'new-user@example.com' });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ ok: true, user: expect.any(String) });
  });

  it('stores display name and sends invite email when requested', async () => {
    const app = createApp();
    const sendInviteEmail = vi.spyOn(inviteEmail, 'sendInviteEmail').mockResolvedValue();

    const res = await request(app).post('/users').set('Cookie', adminSessionCookie()).send({
      email: 'invited@example.com',
      displayName: 'Alex',
      sendInviteEmail: true,
    });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      ok: true,
      user: expect.any(String),
      inviteEmailSent: true,
    });
    expect(sendInviteEmail).toHaveBeenCalledWith('invited@example.com', 'Alex', expect.any(String));
  });

  it('requires display name to send invite email', async () => {
    const app = createApp();

    const res = await request(app).post('/users').set('Cookie', adminSessionCookie()).send({
      email: 'missing-name@example.com',
      sendInviteEmail: true,
    });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'displayName is required to send invite email' });
  });
});
