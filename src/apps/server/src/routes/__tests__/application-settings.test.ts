import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import { createApp } from '../../app.js';
import { UserAndAuthRepository } from '../../repositories/user-and-auth-repository.js';
import { ApplicationSettingsRepository } from '../../repositories/application-settings-repository.js';
import { EmailSettingsRepository } from '../../repositories/email-settings-repository.js';

const repository = new ApplicationSettingsRepository();
const emailRepository = new EmailSettingsRepository();
afterEach(() => {
  repository.setAccountSignupEnabled(false);
  emailRepository.deleteResendSettings();
});

describe('administrator application settings', () => {
  it('requires administrator access', async () => {
    const app = createApp();
    await request(app).get('/administrator/application-settings').expect(401);
    await request(app)
      .put('/administrator/application-settings')
      .send({ accountSignup: true })
      .expect(401);
    const users = new UserAndAuthRepository();
    users.setUserPassword('regular', 'secret');
    const session = users.createUserSession('regular');
    await request(app)
      .get('/administrator/application-settings')
      .set('Cookie', `habsum_sid=${session}`)
      .expect(403);
    await request(app)
      .put('/administrator/application-settings')
      .set('Cookie', `habsum_sid=${session}`)
      .send({ accountSignup: true })
      .expect(403);
  });

  it('validates and updates the signup capability', async () => {
    const users = new UserAndAuthRepository();
    users.createInitialAdminUser('owner', 'secret');
    const session = users.createUserSession('owner');
    const app = createApp();
    const cookie = `habsum_sid=${session}`;
    await request(app)
      .put('/administrator/application-settings')
      .set('Cookie', cookie)
      .send({ accountSignup: 'true' })
      .expect(400);
    await request(app)
      .put('/administrator/application-settings')
      .set('Cookie', cookie)
      .send({ accountSignup: true })
      .expect(200, { accountSignup: true });
    await request(app)
      .get('/administrator/application-settings')
      .set('Cookie', cookie)
      .expect(200, { accountSignup: true });
    const status = await request(app).get('/application').expect(200);
    expect(status.body.features.accountSignup).toBe(true);
  });

  it('preserves signup and email settings when either section is changed or email is cleared', async () => {
    const users = new UserAndAuthRepository();
    users.createInitialAdminUser('settings-owner', 'secret');
    const session = users.createUserSession('settings-owner');
    const app = createApp();
    const cookie = `habsum_sid=${session}`;
    const emailProvider = {
      name: 'resend',
      apiKey: 're_shared_settings',
      email: 'sender@example.com',
    };

    await request(app)
      .put('/administrator/application-settings')
      .set('Cookie', cookie)
      .send({ accountSignup: true })
      .expect(200, { accountSignup: true });
    const emailResponse = await request(app)
      .put('/administrator/email-settings')
      .set('Cookie', cookie)
      .send({ emailProvider })
      .expect(200);
    await request(app)
      .get('/administrator/application-settings')
      .set('Cookie', cookie)
      .expect(200, { accountSignup: true });

    await request(app)
      .put('/administrator/application-settings')
      .set('Cookie', cookie)
      .send({ accountSignup: false })
      .expect(200, { accountSignup: false });
    await request(app)
      .get('/administrator/email-settings')
      .set('Cookie', cookie)
      .expect(200, emailResponse.body);
    const configured = await request(app).get('/application').expect(200);
    expect(configured.body.features).toEqual({ accountSignup: false, forgotPassword: true });

    await request(app)
      .put('/administrator/application-settings')
      .set('Cookie', cookie)
      .send({ accountSignup: true })
      .expect(200);
    await request(app)
      .put('/administrator/email-settings')
      .set('Cookie', cookie)
      .send({ emailProvider: { name: 'resend' } })
      .expect(200, { updatedAt: null });
    await request(app)
      .get('/administrator/application-settings')
      .set('Cookie', cookie)
      .expect(200, { accountSignup: true });
    const cleared = await request(app).get('/application').expect(200);
    expect(cleared.body.features).toEqual({ accountSignup: true, forgotPassword: false });
  });
});
