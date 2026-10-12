import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import { createApp } from '../../app.js';
import { UserAndAuthRepository } from '../../repositories/user-and-auth-repository.js';
import { RegistrationSettingsRepository } from '../../repositories/registration-settings-repository.js';

const repository = new RegistrationSettingsRepository();
afterEach(() => repository.setAccountSignupEnabled(false));

describe('administrator registration settings', () => {
  it('requires administrator access', async () => {
    const app = createApp();
    await request(app).get('/administrator/registration-settings').expect(401);
    await request(app)
      .put('/administrator/registration-settings')
      .send({ accountSignup: true })
      .expect(401);
    const users = new UserAndAuthRepository();
    users.setUserPassword('regular', 'secret');
    const session = users.createUserSession('regular');
    await request(app)
      .put('/administrator/registration-settings')
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
      .put('/administrator/registration-settings')
      .set('Cookie', cookie)
      .send({ accountSignup: 'true' })
      .expect(400);
    await request(app)
      .put('/administrator/registration-settings')
      .set('Cookie', cookie)
      .send({ accountSignup: true })
      .expect(200, { accountSignup: true });
    await request(app)
      .get('/administrator/registration-settings')
      .set('Cookie', cookie)
      .expect(200, { accountSignup: true });
    const status = await request(app).get('/auth/status').expect(200);
    expect(status.body.features.accountSignup).toBe(true);
  });
});
