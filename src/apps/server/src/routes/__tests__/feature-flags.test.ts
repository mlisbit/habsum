import request from 'supertest';
import { FEATURE_FLAG_ENABLED_VALUE, FEATURE_FLAG_KEYS } from '@habsum/feature-flags/feature-flags';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../app.js';
import { UserAndAuthRepository } from '../../repositories/user-and-auth-repository.js';
import { SESSION_COOKIE_NAME } from '../../utils/cookie-session-utils.js';

const userAndAuthRepository = new UserAndAuthRepository();

function developerSessionCookie(): string {
  if (userAndAuthRepository.countAdmins() === 0) {
    userAndAuthRepository.createInitialAdminUser('feature-flags-developer', 'secret');
  }
  const session = userAndAuthRepository.createUserSession('feature-flags-developer', 3600);
  return `${SESSION_COOKIE_NAME}=${session}`;
}

describe('/feature-flags', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns every configured flag publicly', async () => {
    const response = await request(createApp()).get('/feature-flags').expect(200);

    expect(response.body.flags.map((flag: { key: string }) => flag.key)).toEqual(
      expect.arrayContaining([...FEATURE_FLAG_KEYS]),
    );
    const footerFlag = response.body.flags.find(
      (flag: { key: string }) => flag.key === 'show-version-in-footer',
    );
    expect(footerFlag).toMatchObject({
      key: 'show-version-in-footer',
      lastModifiedAt: expect.any(Number),
    });
    expect(footerFlag.value === null || typeof footerFlag.value === 'string').toBe(true);
  });

  it('only lets developers update configured flags and stores a UTC Unix timestamp', async () => {
    const app = createApp();

    await request(app)
      .post('/feature-flags')
      .send({ key: 'show-version-in-footer', value: FEATURE_FLAG_ENABLED_VALUE })
      .expect(401);

    userAndAuthRepository.setUserPassword('feature-flags-regular', 'secret');
    const regularSession = userAndAuthRepository.createUserSession('feature-flags-regular', 3600);
    await request(app)
      .post('/feature-flags')
      .set('Cookie', `${SESSION_COOKIE_NAME}=${regularSession}`)
      .send({ key: 'show-version-in-footer', value: FEATURE_FLAG_ENABLED_VALUE })
      .expect(403);

    vi.spyOn(Date, 'now').mockReturnValue(1_900_000_000_000);
    const response = await request(app)
      .post('/feature-flags')
      .set('Cookie', developerSessionCookie())
      .send({ key: 'show-version-in-footer', value: FEATURE_FLAG_ENABLED_VALUE })
      .expect(200);

    expect(response.body).toEqual({
      flag: {
        key: 'show-version-in-footer',
        value: FEATURE_FLAG_ENABLED_VALUE,
        lastModifiedAt: 1_900_000_000,
      },
    });
    const getResponse = await request(app).get('/feature-flags').expect(200);
    expect(getResponse.body.flags).toContainEqual(response.body.flag);
  });

  it('rejects unknown keys', async () => {
    await request(createApp())
      .post('/feature-flags')
      .set('Cookie', developerSessionCookie())
      .send({ key: 'unknown-flag', value: FEATURE_FLAG_ENABLED_VALUE })
      .expect(400, { error: 'invalid feature flag key' });
  });
});
