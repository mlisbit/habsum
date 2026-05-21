import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../app.js';
import { ensureConfigLayout } from '../config.js';
import { createInitialAdminUser, createUserSession, ensureUserPins } from '../db.js';
import { SESSION_COOKIE_NAME } from '../session-cookie.js';

describe('POST /users', () => {
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
});
