import request from 'supertest';
import { Logger } from '@habsum/tracking/server/logger';
import { yamlString } from '@habsum/types/common/misc';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../app.js';
import { UserAndAuthRepository } from '../../repositories/user-and-auth-repository.js';
import { ConfigService } from '../../services/config-service.js';
import { SESSION_COOKIE_NAME } from '../../utils/cookie-session-utils.js';

const configService = new ConfigService();
const userAndAuthRepository = new UserAndAuthRepository();

describe('habit action tracking', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('emits one typed event after each successful habit action', async () => {
    const logEvent = vi.spyOn(Logger.prototype, 'logEvent').mockImplementation(() => undefined);
    const user = 'habit-action-tracking-user';
    const created = configService.createEmptyUserConfig(user);
    if (!created.ok) throw new Error(created.error);
    const written = configService.writeUserConfigText(
      user,
      yamlString(`habits:
  push ups:
    type: summation
  mood:
    type: single_select
    options: [good, bad]
  journal:
    type: text
`),
    );
    if (!written.ok) throw new Error(written.error);

    userAndAuthRepository.setUserPassword(user, 'test-password');
    const session = userAndAuthRepository.createUserSession(user, 3600);
    const cookie = `${SESSION_COOKIE_NAME}=${session}`;
    const app = createApp();
    const date = '2026-08-05';

    await request(app)
      .patch(`/users/${user}/habits`)
      .set('Cookie', cookie)
      .send({
        habit: 'push ups',
        total: 5,
        date,
        today: date,
        clientCreatedAt: `${date} 08:00:00`,
      })
      .expect(200);

    await request(app)
      .patch(`/users/${user}/habits`)
      .set('Cookie', cookie)
      .send({ habit: 'mood', value: 'good', date, today: date })
      .expect(200);

    await request(app)
      .patch(`/users/${user}/habits`)
      .set('Cookie', cookie)
      .send({ habit: 'journal', text: 'Tracked note', date, today: date })
      .expect(200);

    expect(logEvent).toHaveBeenCalledTimes(3);
    expect(logEvent).toHaveBeenNthCalledWith(1, {
      name: 'HabitAction',
      body: { habitType: 'summation' },
    });
    expect(logEvent).toHaveBeenNthCalledWith(2, {
      name: 'HabitAction',
      body: { habitType: 'single_select' },
    });
    expect(logEvent).toHaveBeenNthCalledWith(3, {
      name: 'HabitAction',
      body: { habitType: 'text' },
    });
  });

  it('does not emit an event when the habit action is rejected', async () => {
    const logEvent = vi.spyOn(Logger.prototype, 'logEvent').mockImplementation(() => undefined);
    const user = 'rejected-habit-action-tracking-user';
    const created = configService.createEmptyUserConfig(user);
    if (!created.ok) throw new Error(created.error);
    const written = configService.writeUserConfigText(
      user,
      yamlString(`habits:
  push ups:
    type: summation
`),
    );
    if (!written.ok) throw new Error(written.error);

    userAndAuthRepository.setUserPassword(user, 'test-password');
    const session = userAndAuthRepository.createUserSession(user, 3600);

    await request(createApp())
      .patch(`/users/${user}/habits`)
      .set('Cookie', `${SESSION_COOKIE_NAME}=${session}`)
      .send({ habit: 'push ups', total: 'not-a-number', date: '2026-08-05' })
      .expect(400);

    expect(logEvent).not.toHaveBeenCalled();
  });
});
