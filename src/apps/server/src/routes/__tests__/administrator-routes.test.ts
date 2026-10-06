import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../app.js';
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

  it('uses the administrator URL for diagnostics', async () => {
    await request(createApp()).get('/administrator').expect(200);
    await request(createApp()).get('/developer').expect(404);
  });

  it('only lets administrators read or update email settings', async () => {
    const app = createApp();
    await request(app).get('/administrator/email-settings').expect(401);

    userAndAuthRepository.setUserPassword('email-settings-regular', 'secret');
    const session = userAndAuthRepository.createUserSession('email-settings-regular', 3600);
    await request(app)
      .put('/administrator/email-settings')
      .set('Cookie', `${SESSION_COOKIE_NAME}=${session}`)
      .send({ provider: 'resend', apiKey: 're_secret', fromEmail: 'sender@example.com' })
      .expect(403);
  });

  it('stores and returns Resend settings to an administrator', async () => {
    const { cookie } = administratorSession();
    const response = await request(createApp())
      .put('/administrator/email-settings')
      .set('Cookie', cookie)
      .send({
        provider: 'resend',
        apiKey: 're_super_secret',
        fromEmail: 'sender@example.com',
      })
      .expect(200);

    expect(response.body).toEqual({
      provider: 'resend',
      apiKey: 're_super_secret',
      fromEmail: 'sender@example.com',
      updatedAt: expect.any(Number),
    });
    expect(
      db.prepare("SELECT api_key FROM email_settings WHERE provider = 'resend'").get(),
    ).toEqual({ api_key: 're_super_secret' });
  });

  it('rejects display-name sender formats', async () => {
    const { cookie } = administratorSession();
    await request(createApp())
      .put('/administrator/email-settings')
      .set('Cookie', cookie)
      .send({
        provider: 'resend',
        apiKey: 're_secret',
        fromEmail: 'Habsum <sender@example.com>',
      })
      .expect(400, { error: 'invalid email address' });
  });

  it('retains an existing API key when the update omits it', async () => {
    const { cookie } = administratorSession();
    const app = createApp();
    await request(app)
      .put('/administrator/email-settings')
      .set('Cookie', cookie)
      .send({ provider: 'resend', apiKey: 're_keep_me', fromEmail: 'first@example.com' })
      .expect(200);
    await request(app)
      .put('/administrator/email-settings')
      .set('Cookie', cookie)
      .send({ provider: 'resend', fromEmail: 'second@example.com' })
      .expect(200);

    expect(
      db.prepare("SELECT api_key, from_email FROM email_settings WHERE provider = 'resend'").get(),
    ).toEqual({ api_key: 're_keep_me', from_email: 'second@example.com' });
  });

  it('sends a test message to the signed-in administrator account email', async () => {
    const { cookie, username } = administratorSession();
    userAndAuthRepository.patchUserProfile(username, { email: 'admin@example.com' });
    db.prepare(
      `
        INSERT INTO email_settings (provider, api_key, from_email, updated_at)
        VALUES ('resend', 're_test', 'sender@example.com', 1)
      `,
    ).run();
    const sendEmail = vi.spyOn(EmailService.prototype, 'sendEmail').mockResolvedValue();

    const response = await request(createApp())
      .post('/administrator/email-settings/test')
      .set('Cookie', cookie)
      .send({})
      .expect(200);

    expect(response.body).toEqual({ ok: true, recipient: 'admin@example.com' });
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        deliveryName: 'administrator test email',
        to: 'admin@example.com',
        subject: 'Habsum test email',
      }),
    );
  });
});
