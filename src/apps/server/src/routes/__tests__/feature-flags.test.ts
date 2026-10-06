import request from 'supertest';
import { FEATURE_FLAG_ENABLED_VALUE, FEATURE_FLAG_KEYS } from '@habsum/feature-flags/feature-flags';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../app.js';
import { UserAndAuthRepository } from '../../repositories/user-and-auth-repository.js';
import { db } from '../../repositories/_private/db.js';
import { SESSION_COOKIE_NAME } from '../../utils/cookie-session-utils.js';

const userAndAuthRepository = new UserAndAuthRepository();
const mutableFlagKey = 'enable-user-account-creation';

function administratorSessionCookie(): string {
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
    db.prepare(
      `
      INSERT OR REPLACE INTO feature_flags (key, value, last_modified_at)
      VALUES ('show-version-in-footer', 'enabled', 1)
    `,
    ).run();

    const response = await request(createApp()).get('/feature-flags').expect(200);

    expect(response.body.flags.map((flag: { key: string }) => flag.key)).toEqual([
      ...FEATURE_FLAG_KEYS,
    ]);
    expect(response.body.flags[0]).toMatchObject({
      key: mutableFlagKey,
      lastModifiedAt: expect.any(Number),
    });
    expect(
      response.body.flags[0].value === null || typeof response.body.flags[0].value === 'string',
    ).toBe(true);
  });

  it('only lets administrators update configured flags and stores a UTC Unix timestamp', async () => {
    const app = createApp();

    await request(app)
      .post('/feature-flags')
      .send({ key: mutableFlagKey, value: FEATURE_FLAG_ENABLED_VALUE })
      .expect(401);

    userAndAuthRepository.setUserPassword('feature-flags-regular', 'secret');
    const regularSession = userAndAuthRepository.createUserSession('feature-flags-regular', 3600);
    await request(app)
      .post('/feature-flags')
      .set('Cookie', `${SESSION_COOKIE_NAME}=${regularSession}`)
      .send({ key: mutableFlagKey, value: FEATURE_FLAG_ENABLED_VALUE })
      .expect(403);

    vi.spyOn(Date, 'now').mockReturnValue(1_900_000_000_000);
    const response = await request(app)
      .post('/feature-flags')
      .set('Cookie', administratorSessionCookie())
      .send({ key: mutableFlagKey, value: FEATURE_FLAG_ENABLED_VALUE })
      .expect(200);

    expect(response.body).toEqual({
      flag: {
        key: mutableFlagKey,
        value: FEATURE_FLAG_ENABLED_VALUE,
        lastModifiedAt: 1_900_000_000,
      },
    });
    const getResponse = await request(app).get('/feature-flags').expect(200);
    expect(getResponse.body.flags).toContainEqual(response.body.flag);
  });

  it('rejects removed and unknown keys', async () => {
    for (const key of ['show-version-in-footer', 'unknown-flag']) {
      await request(createApp())
        .post('/feature-flags')
        .set('Cookie', administratorSessionCookie())
        .send({ key, value: FEATURE_FLAG_ENABLED_VALUE })
        .expect(400, { error: 'invalid feature flag key' });
    }
  });
});
