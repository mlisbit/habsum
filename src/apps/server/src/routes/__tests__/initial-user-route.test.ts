import request from 'supertest';
import { ProductEntitlement } from '@habsum/types/common/entitlement';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../app.js';
import { ConfigService } from '../../services/config-service.js';
import { UserAndAuthRepository } from '../../repositories/user-and-auth-repository.js';

describe('POST /auth/initial-user', () => {
  it('creates and signs in the database first user as an administrator', async () => {
    const app = createApp();
    const configService = new ConfigService();
    const userAndAuthRepository = new UserAndAuthRepository();

    await request(app).post('/auth/initial-user').send({}).expect(400, {
      error: 'username is required',
    });
    await request(app)
      .post('/auth/initial-user')
      .send({ username: 'admin', password: 'secret' })
      .expect(400, { error: 'invalid username' });
    await request(app)
      .post('/auth/initial-user')
      .send({ username: 'first-owner' })
      .expect(400, { error: 'password is required' });

    const response = await request(app)
      .post('/auth/initial-user')
      .send({ username: 'first-owner', password: 'chosen-secret', admin: false })
      .expect(201);

    expect(response.body).toEqual({ ok: true, user: 'first-owner' });
    expect(configService.loadUserConfig('first-owner')?.habits).toEqual([]);
    expect(userAndAuthRepository.isUserAdmin('first-owner')).toBe(true);
    expect(userAndAuthRepository.isUserPasswordValid('first-owner', 'chosen-secret')).toBe(true);

    const sessionCookie = response.headers['set-cookie']?.[0]?.split(';')[0];
    expect(sessionCookie).toMatch(/^habsum_sid=/);
    const meResponse = await request(app)
      .get('/users/me')
      .set('Cookie', sessionCookie!)
      .expect(200);
    expect(meResponse.body).toMatchObject({ username: 'first-owner', admin: true });
    expect(meResponse.body.entitlements).toContain(ProductEntitlement.DEVELOPER);
    await request(app).get('/auth/status').expect(200, { hasUsers: true });

    await request(app)
      .post('/auth/initial-user')
      .send({ username: 'second-owner', password: 'another-secret' })
      .expect(409, { error: 'the initial user already exists' });
    expect(configService.loadUserConfig('second-owner')).toBeNull();
  });
});
