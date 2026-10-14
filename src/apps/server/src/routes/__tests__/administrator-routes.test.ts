import request from 'supertest';
import type { IncomingMessage } from 'node:http';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../app.js';
import { DatabaseRepository } from '../../repositories/database-repository.js';
import { db } from '../../repositories/_private/db.js';
import { UserAndAuthRepository } from '../../repositories/user-and-auth-repository.js';
import { EmailService } from '../../services/email-service.js';
import { SESSION_COOKIE_NAME } from '../../utils/cookie-session-utils.js';

const userAndAuthRepository = new UserAndAuthRepository();

function administratorSession(): { cookie: string; username: string } {
  let row = db.prepare('SELECT username FROM users WHERE admin = 1 LIMIT 1').get() as
    | { username: string }
    | undefined;
  if (!row) {
    userAndAuthRepository.createInitialAdminUser('email-settings-admin', 'secret');
    row = { username: 'email-settings-admin' };
  }
  const session = userAndAuthRepository.createUserSession(row.username, 3600);
  return { cookie: `${SESSION_COOKIE_NAME}=${session}`, username: row.username };
}

describe('/administrator', () => {
  beforeEach(() => {
    db.prepare("DELETE FROM email_settings WHERE provider = 'resend'").run();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uses the application URL for diagnostics and removes the old endpoints', async () => {
    const { cookie } = administratorSession();
    await request(createApp()).get('/application').expect(200);
    await request(createApp()).get('/auth/status').expect(404);
    await request(createApp()).get('/administrator').expect(404);
    await request(createApp()).get('/administrator/database').set('Cookie', cookie).expect(404);
    await request(createApp()).get('/developer').expect(404);
  });

  it('only lets administrators read or update email settings', async () => {
    const app = createApp();
    await request(app).get('/administrator/email-settings').expect(401);
    await request(app).get('/administrator').expect(404);
    await request(app).get('/administrator/database/download').expect(401);
    await request(app)
      .delete('/administrator/database')
      .send({ confirmation: 'delete' })
      .expect(401);

    userAndAuthRepository.setUserPassword('email-settings-regular', 'secret');
    const session = userAndAuthRepository.createUserSession('email-settings-regular', 3600);
    await request(app)
      .put('/administrator/email-settings')
      .set('Cookie', `${SESSION_COOKIE_NAME}=${session}`)
      .send({ provider: 'resend', apiKey: 're_secret', fromEmail: 'sender@example.com' })
      .expect(403);
  });

  it('returns the configured database path without authentication', async () => {
    const response = await request(createApp()).get('/application').expect(200);

    expect(response.body).toEqual({
      apiVersion: expect.any(String),
      redirectPath: null,
      features: { accountSignup: expect.any(Boolean), forgotPassword: expect.any(Boolean) },
      serverTime: { iso: expect.any(String), timezone: expect.any(String) },
      database: { path: expect.stringMatching(/habsum\.db$/) },
    });
  });

  it('downloads a complete SQLite database file', async () => {
    const { cookie } = administratorSession();
    const response = await request(createApp())
      .get('/administrator/database/download')
      .set('Cookie', cookie)
      .buffer(true)
      .parse((res: IncomingMessage, callback: (error: Error | null, body?: Buffer) => void) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => callback(null, Buffer.concat(chunks)));
      })
      .expect('Content-Type', /application\/vnd\.sqlite3/)
      .expect('Content-Disposition', 'attachment; filename="habsum.db"')
      .expect(200);

    expect(Buffer.isBuffer(response.body)).toBe(true);
    expect(response.body.subarray(0, 16).toString()).toBe('SQLite format 3\u0000');
  });

  it('requires exact typed confirmation before deleting the database', async () => {
    const { cookie } = administratorSession();
    const deleteDatabase = vi
      .spyOn(DatabaseRepository.prototype, 'delete')
      .mockImplementation(() => {});
    const app = createApp();

    await request(app)
      .delete('/administrator/database')
      .set('Cookie', cookie)
      .send({ confirmation: 'DELETE' })
      .expect(400, { error: 'confirmation must be exactly "delete"' });
    expect(deleteDatabase).not.toHaveBeenCalled();

    await request(app)
      .delete('/administrator/database')
      .set('Cookie', cookie)
      .send({ confirmation: 'delete' })
      .expect(200, { ok: true });
    expect(deleteDatabase).toHaveBeenCalledOnce();
  });

  it('stores and returns Resend settings to an administrator', async () => {
    const { cookie } = administratorSession();
    const response = await request(createApp())
      .put('/administrator/email-settings')
      .set('Cookie', cookie)
      .send({
        emailProvider: {
          name: 'resend',
          apiKey: 're_super_secret',
          email: 'sender@example.com',
        },
      })
      .expect(200);

    expect(response.body).toEqual({
      emailProvider: {
        name: 'resend',
        apiKey: 're_super_secret',
        email: 'sender@example.com',
      },
      updatedAt: expect.any(Number),
    });
    expect(
      db.prepare("SELECT api_key FROM email_settings WHERE provider = 'resend'").get(),
    ).toEqual({ api_key: 're_super_secret' });
  });

  it('omits the email provider when email is not configured', async () => {
    const { cookie } = administratorSession();

    const response = await request(createApp())
      .get('/administrator/email-settings')
      .set('Cookie', cookie)
      .expect(200);

    expect(response.body).toEqual({ updatedAt: null });
    expect(response.body).not.toHaveProperty('emailProvider');
  });

  it('rejects display-name sender formats', async () => {
    const { cookie } = administratorSession();
    await request(createApp())
      .put('/administrator/email-settings')
      .set('Cookie', cookie)
      .send({
        emailProvider: {
          name: 'resend',
          apiKey: 're_secret',
          email: 'Habsum <sender@example.com>',
        },
      })
      .expect(400, { error: 'invalid email address' });
  });

  it('removes Resend settings when both fields are cleared', async () => {
    const { cookie } = administratorSession();
    const app = createApp();
    await request(app)
      .put('/administrator/email-settings')
      .set('Cookie', cookie)
      .send({
        emailProvider: { name: 'resend', apiKey: 're_keep_me', email: 'first@example.com' },
      })
      .expect(200);
    await request(app)
      .put('/administrator/email-settings')
      .set('Cookie', cookie)
      .send({ emailProvider: { name: 'resend' } })
      .expect(200, {
        updatedAt: null,
      });

    expect(
      db.prepare("SELECT api_key, from_email FROM email_settings WHERE provider = 'resend'").get(),
    ).toBeUndefined();
  });

  it('rejects partially configured Resend settings', async () => {
    const { cookie } = administratorSession();
    const app = createApp();

    await request(app)
      .put('/administrator/email-settings')
      .set('Cookie', cookie)
      .send({ emailProvider: { name: 'resend', apiKey: 're_secret' } })
      .expect(400, { error: 'email address is required' });

    await request(app)
      .put('/administrator/email-settings')
      .set('Cookie', cookie)
      .send({ emailProvider: { name: 'resend', email: 'sender@example.com' } })
      .expect(400, { error: 'Resend API key is required' });
  });

  it('sends a test message to Resend without requiring an administrator email', async () => {
    const { cookie } = administratorSession();
    const sendEmail = vi
      .spyOn(EmailService.prototype, 'sendEmailUsingSettings')
      .mockResolvedValue();

    const response = await request(createApp())
      .post('/administrator/email-settings/test')
      .set('Cookie', cookie)
      .send({
        recipient: 'recipient@example.com',
        emailProvider: { name: 'resend', apiKey: 're_draft', email: 'draft@example.com' },
      })
      .expect(200);

    expect(response.body).toEqual({ ok: true, recipient: 'recipient@example.com' });
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        deliveryName: 'administrator test email',
        to: 'recipient@example.com',
        subject: 'Habsum test email',
      }),
      { apiKey: 're_draft', fromEmail: 'draft@example.com' },
    );
  });

  it('returns the Resend error when the test configuration is rejected', async () => {
    const { cookie } = administratorSession();
    vi.spyOn(EmailService.prototype, 'sendEmailUsingSettings').mockRejectedValue(
      new Error('API key is not active'),
    );

    await request(createApp())
      .post('/administrator/email-settings/test')
      .set('Cookie', cookie)
      .send({
        recipient: 'recipient@example.com',
        emailProvider: { name: 'resend', apiKey: 're_invalid', email: 'draft@example.com' },
      })
      .expect(503, { error: 'API key is not active' });
  });

  it('validates draft settings before sending a test message', async () => {
    const { cookie } = administratorSession();

    await request(createApp())
      .post('/administrator/email-settings/test')
      .set('Cookie', cookie)
      .send({
        recipient: 'recipient@example.com',
        emailProvider: { name: 'resend', apiKey: 're_draft', email: 'not-an-email' },
      })
      .expect(400, { error: 'invalid email address' });
  });

  it('validates the test email recipient', async () => {
    const { cookie } = administratorSession();
    const sendEmail = vi.spyOn(EmailService.prototype, 'sendEmailUsingSettings');

    await request(createApp())
      .post('/administrator/email-settings/test')
      .set('Cookie', cookie)
      .send({
        recipient: 'not-an-email',
        emailProvider: { name: 'resend', apiKey: 're_draft', email: 'draft@example.com' },
      })
      .expect(400, { error: 'invalid recipient email address' });

    expect(sendEmail).not.toHaveBeenCalled();
  });
});
