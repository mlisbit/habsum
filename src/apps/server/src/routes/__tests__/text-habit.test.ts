import request from 'supertest';
import { yamlString } from '@habsum/types/common/misc';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../app.js';
import { ConfigService } from '../../services/config-service.js';
import { UserAndAuthRepository } from '../../repositories/user-and-auth-repository.js';
import { SESSION_COOKIE_NAME } from '../../utils/cookie-session-utils.js';

const configService = new ConfigService();
const userAndAuthRepository = new UserAndAuthRepository();

describe('text habits', () => {
  it('stores a different plain-text entry for each day and clears one day independently', async () => {
    const user = 'text-habit-user';
    const created = configService.createEmptyUserConfig(user);
    if (!created.ok) throw new Error(created.error);
    const written = configService.writeUserConfigText(
      user,
      yamlString(`habits:
  journal:
    type: text
    data_visualization: ignored
    insights: [average, current_streak]
    streak_options: ignored
`),
    );
    if (!written.ok) throw new Error(written.error);

    userAndAuthRepository.setUserPassword(user, 'test-password');
    const session = userAndAuthRepository.createUserSession(user, 3600);
    const cookie = `${SESSION_COOKIE_NAME}=${session}`;
    const app = createApp();

    const firstPatch = await request(app)
      .patch(`/users/${user}/habits`)
      .set('Cookie', cookie)
      .send({
        habit: 'journal',
        text: 'First day\nSecond line',
        date: '2026-07-22',
        today: '2026-07-23',
      })
      .expect(200);
    expect(firstPatch.body).toMatchObject({
      habit: 'journal',
      type: 'text',
      details: { text: 'First day\nSecond line' },
    });
    expect(firstPatch.body.widgets).toBeUndefined();

    await request(app)
      .patch(`/users/${user}/habits`)
      .set('Cookie', cookie)
      .send({
        habit: 'journal',
        text: 'Second day',
        date: '2026-07-23',
        today: '2026-07-23',
      })
      .expect(200);

    const firstDay = await request(app)
      .get(`/users/${user}/habits`)
      .query({ date: '2026-07-22', today: '2026-07-23' })
      .set('Cookie', cookie)
      .expect(200);
    expect(firstDay.body.habits).toEqual([
      {
        name: 'journal',
        ctaUrl: `/users/${user}/habits/detail?filter=journal&date=2026-07-22`,
        type: 'text',
        details: { text: 'First day\nSecond line' },
      },
    ]);
    expect(firstDay.body.page.heading).toBe('Your day yesterday');

    const history = await request(app)
      .get(`/users/${user}/habits/history`)
      .query({ filter: 'journal', date: '2026-07-23', today: '2026-07-23' })
      .set('Cookie', cookie)
      .expect(200);
    expect(history.body.history.user).toEqual([
      {
        day: '2026-07-22',
        habits: [
          {
            name: 'journal',
            type: 'text',
            details: { text: 'First day\nSecond line' },
          },
        ],
      },
      {
        day: '2026-07-23',
        habits: [
          {
            name: 'journal',
            type: 'text',
            details: { text: 'Second day' },
          },
        ],
      },
    ]);

    const clearPatch = await request(app)
      .patch(`/users/${user}/habits`)
      .set('Cookie', cookie)
      .send({
        habit: 'journal',
        action: 'clear',
        date: '2026-07-23',
        today: '2026-07-23',
      })
      .expect(200);
    expect(clearPatch.body.details).toEqual({ text: null });

    const firstDayAfterClear = await request(app)
      .get(`/users/${user}/habits`)
      .query({ date: '2026-07-22', today: '2026-07-23' })
      .set('Cookie', cookie)
      .expect(200);
    expect(firstDayAfterClear.body.habits[0].details.text).toBe('First day\nSecond line');
  });

  it('persists the latest note until the configured reset day without merging rows', async () => {
    const user = 'persistent-text-habit-user';
    const created = configService.createEmptyUserConfig(user);
    if (!created.ok) throw new Error(created.error);
    const written = configService.writeUserConfigText(
      user,
      yamlString(`habits:
  journal:
    type: text
    reset: [saturday]
`),
    );
    if (!written.ok) throw new Error(written.error);

    userAndAuthRepository.setUserPassword(user, 'test-password');
    const session = userAndAuthRepository.createUserSession(user, 3600);
    const cookie = `${SESSION_COOKIE_NAME}=${session}`;
    const app = createApp();

    await request(app)
      .patch(`/users/${user}/habits`)
      .set('Cookie', cookie)
      .send({
        habit: 'journal',
        text: 'Monday note',
        date: '2026-07-20',
        today: '2026-07-20',
      })
      .expect(200);

    const tuesdayBeforeEdit = await request(app)
      .get(`/users/${user}/habits`)
      .query({ date: '2026-07-21', today: '2026-07-21' })
      .set('Cookie', cookie)
      .expect(200);
    expect(tuesdayBeforeEdit.body.habits[0].details.text).toBe('Monday note');

    await request(app)
      .patch(`/users/${user}/habits`)
      .set('Cookie', cookie)
      .send({
        habit: 'journal',
        text: 'Tuesday note',
        date: '2026-07-21',
        today: '2026-07-21',
      })
      .expect(200);

    const wednesday = await request(app)
      .get(`/users/${user}/habits`)
      .query({ date: '2026-07-22', today: '2026-07-22' })
      .set('Cookie', cookie)
      .expect(200);
    expect(wednesday.body.habits[0].details.text).toBe('Tuesday note');

    await request(app)
      .patch(`/users/${user}/habits`)
      .set('Cookie', cookie)
      .send({
        habit: 'journal',
        text: '',
        date: '2026-07-22',
        today: '2026-07-22',
      })
      .expect(200);

    const thursdayAfterClear = await request(app)
      .get(`/users/${user}/habits`)
      .query({ date: '2026-07-23', today: '2026-07-23' })
      .set('Cookie', cookie)
      .expect(200);
    expect(thursdayAfterClear.body.habits[0].details.text).toBe('');

    const saturday = await request(app)
      .get(`/users/${user}/habits`)
      .query({ date: '2026-07-25', today: '2026-07-25' })
      .set('Cookie', cookie)
      .expect(200);
    expect(saturday.body.habits[0].details.text).toBeNull();
  });
});
