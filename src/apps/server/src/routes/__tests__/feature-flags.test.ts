import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../app.js';
import { FEATURE_FLAG_KEYS } from '../../constants.js';
import { EmailSettingsRepository } from '../../repositories/email-settings-repository.js';
import { FeatureFlagRepository } from '../../repositories/feature-flag-repository.js';
import { UserAndAuthRepository } from '../../repositories/user-and-auth-repository.js';
import { db } from '../../repositories/_private/db.js';
import { SESSION_COOKIE_NAME } from '../../utils/cookie-session-utils.js';

const userAndAuthRepository = new UserAndAuthRepository();
const emailSettingsRepository = new EmailSettingsRepository();
const featureFlagRepository = new FeatureFlagRepository();
const mutableFlagKey = 'enable-user-account-creation';
const mutableFlagValue = 'noVerify';
const featureFlagOptions = {
  noVerify: { text: 'With no email verification' },
  verify: {
    text: 'With email verification',
    disabled: 'requires email configuration to be enabled',
  },
};

function administratorSessionCookie(): string {
  if (userAndAuthRepository.countAdmins() === 0) {
    userAndAuthRepository.createInitialAdminUser('feature-flags-developer', 'secret');
  }
  const session = userAndAuthRepository.createUserSession('feature-flags-developer', 3600);
  return `${SESSION_COOKIE_NAME}=${session}`;
}

describe('/feature-flags', () => {
  beforeEach(() => {
    emailSettingsRepository.deleteResendSettings();
    featureFlagRepository.setFeatureFlagValue(mutableFlagKey, null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('removes retired flags from the database and returns configured flags with context', async () => {
    db.prepare(
      `
      INSERT OR REPLACE INTO feature_flags (key, value, last_modified_at)
      VALUES ('show-version-in-footer', 'enabled', 1)
    `,
    ).run();
    db.prepare(
      `UPDATE feature_flags SET value = 'enabled' WHERE key = 'enable-user-account-creation'`,
    ).run();

    new FeatureFlagRepository();

    const response = await request(createApp()).get('/feature-flags').expect(200);

    expect(
      db.prepare(`SELECT key FROM feature_flags WHERE key = 'show-version-in-footer'`).get(),
    ).toBeUndefined();
    expect(response.body.flags.map((flag: { key: string }) => flag.key)).toEqual([
      ...FEATURE_FLAG_KEYS,
    ]);
    expect(response.body.flags[0]).toMatchObject({
      key: mutableFlagKey,
      name: 'User registration',
      description: 'Allow users to create their own accounts.',
      options: featureFlagOptions,
      value: mutableFlagValue,
      lastModifiedAt: expect.any(Number),
    });
  });

  it('only lets administrators update configured flags and stores a UTC Unix timestamp', async () => {
    const app = createApp();

    await request(app)
      .post('/feature-flags')
      .send({ key: mutableFlagKey, value: mutableFlagValue })
      .expect(401);

    userAndAuthRepository.setUserPassword('feature-flags-regular', 'secret');
    const regularSession = userAndAuthRepository.createUserSession('feature-flags-regular', 3600);
    await request(app)
      .post('/feature-flags')
      .set('Cookie', `${SESSION_COOKIE_NAME}=${regularSession}`)
      .send({ key: mutableFlagKey, value: mutableFlagValue })
      .expect(403);

    vi.spyOn(Date, 'now').mockReturnValue(1_900_000_000_000);
    const response = await request(app)
      .post('/feature-flags')
      .set('Cookie', administratorSessionCookie())
      .send({ key: mutableFlagKey, value: mutableFlagValue })
      .expect(200);

    expect(response.body).toEqual({
      flag: {
        key: mutableFlagKey,
        value: mutableFlagValue,
        lastModifiedAt: 1_900_000_000,
        name: 'User registration',
        description: 'Allow users to create their own accounts.',
        options: featureFlagOptions,
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
        .send({ key, value: mutableFlagValue })
        .expect(400, { error: 'invalid feature flag key' });
    }
  });

  it('rejects unknown and disabled option values', async () => {
    for (const value of ['enabled', 'unknown-option', 'verify']) {
      await request(createApp())
        .post('/feature-flags')
        .set('Cookie', administratorSessionCookie())
        .send({ key: mutableFlagKey, value })
        .expect(400, { error: 'invalid feature flag value' });
    }
  });

  it('enables email verification when email is configured', async () => {
    emailSettingsRepository.setResendSettings({
      apiKey: 're_secret',
      fromEmail: 'sender@example.com',
      updatedAt: 1_900_000_000,
    });

    const getResponse = await request(createApp()).get('/feature-flags').expect(200);
    expect(getResponse.body.flags[0].options.verify).toEqual({
      text: 'With email verification',
    });

    const postResponse = await request(createApp())
      .post('/feature-flags')
      .set('Cookie', administratorSessionCookie())
      .send({ key: mutableFlagKey, value: 'verify' })
      .expect(200);
    expect(postResponse.body.flag).toMatchObject({
      value: 'verify',
      options: {
        verify: { text: 'With email verification' },
      },
    });
  });
});
