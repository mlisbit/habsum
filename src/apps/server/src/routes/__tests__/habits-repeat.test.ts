import request from 'supertest';
import { dayFromString } from '@habsum/types/common/day';
import { yamlString } from '@habsum/types/common/misc';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../app.js';
import { ConfigService } from '../../services/config-service.js';
import { HabitRepository } from '../../repositories/habit-repository.js';
import { UserAndAuthRepository } from '../../repositories/user-and-auth-repository.js';
import { SESSION_COOKIE_NAME } from '../../utils/cookie-session-utils.js';

const configService = new ConfigService();
const habitRepository = new HabitRepository();
const userAndAuthRepository = new UserAndAuthRepository();

function writeUserConfig(user: string, text: string) {
  const created = configService.createEmptyUserConfig(user);
  if (!created.ok) throw new Error(created.error);
  const written = configService.writeUserConfigText(user, yamlString(text));
  if (!written.ok) throw new Error(written.error);
}

describe('GET /users/:user/habits repeat config', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns habit title URLs filtered to each requested day for every habit type', async () => {
    const user = 'habits-title-link-user';
    writeUserConfig(
      user,
      `habits:
  Push ups:
    type: summation
  Morning routine:
    type: single_select
    options: [yes, no]
  Journal:
    type: text
`,
    );
    userAndAuthRepository.setUserPassword(user, 'test-password');
    const session = userAndAuthRepository.createUserSession(user, 3600);
    const app = createApp();

    for (const date of ['2026-07-22', '2026-07-23']) {
      const response = await request(app)
        .get(`/users/${user}/habits`)
        .query({ date, today: '2026-07-23' })
        .set('Cookie', `${SESSION_COOKIE_NAME}=${session}`)
        .expect(200);

      expect(response.body.habits).toEqual([
        expect.objectContaining({
          name: 'Push ups',
          ctaUrl: `/users/${user}/habits/detail?filter=push-ups&date=${date}`,
        }),
        expect.objectContaining({
          name: 'Morning routine',
          ctaUrl: `/users/${user}/habits/detail?filter=morning-routine&date=${date}`,
        }),
        expect.objectContaining({
          name: 'Journal',
          ctaUrl: `/users/${user}/habits/detail?filter=journal&date=${date}`,
        }),
      ]);
    }
  });

  it('returns server-owned page copy with a familiar display name and dynamic subheader token', async () => {
    const user = 'habits-page-copy-user';
    writeUserConfig(
      user,
      `habits:
  every day:
    type: summation
  daily goal:
    type: summation
    goal: 10
`,
    );
    userAndAuthRepository.setUserPassword(user, 'test-password');
    userAndAuthRepository.patchUserProfile(user, { displayName: 'Alex Morgan' });
    habitRepository.applyHabitMutation({
      kind: 'set_total',
      user,
      habit: 'every day',
      date: dayFromString('2999-06-01'),
      total: 1,
      createdAt: '2999-06-01 08:00:00',
    });
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2999-07-01T09:00:00.000Z'));
    const session = userAndAuthRepository.createUserSession(user, 24 * 3600);

    const morning = await request(createApp())
      .get(`/users/${user}/habits?date=2999-07-01&today=2999-07-01&clientHour=9`)
      .set('Cookie', `${SESSION_COOKIE_NAME}=${session}`)
      .expect(200);

    expect(morning.body.page).toMatchObject({
      heading: 'Good morning, Alex',
      subheader: '{{timeLeftInDay}} until end of day',
      progress: {
        percent: 0,
        caption: '0% of goals completed · 1 other habit remaining',
        isComplete: false,
        ariaLabel: '0% weighted average habit completion for the day',
      },
    });

    vi.setSystemTime(new Date('2999-07-01T13:00:00.000Z'));
    const afternoon = await request(createApp())
      .get(`/users/${user}/habits?date=2999-07-01&today=2999-07-01&clientHour=13`)
      .set('Cookie', `${SESSION_COOKIE_NAME}=${session}`)
      .expect(200);

    expect(afternoon.body.page.heading).toBe('Good afternoon, Alex');

    vi.setSystemTime(new Date('2999-07-01T17:00:00.000Z'));
    const evening = await request(createApp())
      .get(`/users/${user}/habits?date=2999-07-01&today=2999-07-01&clientHour=17`)
      .set('Cookie', `${SESSION_COOKIE_NAME}=${session}`)
      .expect(200);

    expect(evening.body.page.heading).toBe('Hi, Alex');

    const yesterday = await request(createApp())
      .get(`/users/${user}/habits?date=2999-06-30&today=2999-07-01`)
      .set('Cookie', `${SESSION_COOKIE_NAME}=${session}`)
      .expect(200);

    expect(yesterday.body.page).toMatchObject({
      heading: 'Your day yesterday',
      subheader: 'June 30, 2999',
    });

    const withinPastWeek = await request(createApp())
      .get(`/users/${user}/habits?date=2999-06-27&today=2999-07-01`)
      .set('Cookie', `${SESSION_COOKIE_NAME}=${session}`)
      .expect(200);

    expect(withinPastWeek.body.page).toMatchObject({
      heading: 'This past Thursday',
      subheader: 'June 27, 2999',
    });

    const older = await request(createApp())
      .get(`/users/${user}/habits?date=2999-06-22&today=2999-07-01`)
      .set('Cookie', `${SESSION_COOKIE_NAME}=${session}`)
      .expect(200);

    expect(older.body.page).toMatchObject({
      heading: 'June 22',
      subheader: 'June 22, 2999',
    });

    const past = await request(createApp())
      .get(`/users/${user}/habits?date=2000-01-01&today=2999-07-01`)
      .set('Cookie', `${SESSION_COOKIE_NAME}=${session}`)
      .expect(200);

    expect(past.body.page).toMatchObject({
      heading: 'January 1',
      subheader: 'January 1, 2000',
    });
  });

  it('returns a welcome heading for new users', async () => {
    const user = 'habits-new-user-heading';
    writeUserConfig(user, `habits: {}\n`);
    userAndAuthRepository.setUserPassword(user, 'test-password');
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2999-07-01T09:00:00.000Z'));
    const session = userAndAuthRepository.createUserSession(user, 24 * 3600);

    const res = await request(createApp())
      .get(`/users/${user}/habits?date=2999-07-01&today=2999-07-01`)
      .set('Cookie', `${SESSION_COOKIE_NAME}=${session}`)
      .expect(200);

    expect(res.body.page).toMatchObject({
      heading: 'Welcome to Habsum',
      subheader: '',
      showEmptyIntro: true,
    });
  });

  it('only returns habits configured for the requested weekday', async () => {
    const user = 'habits-repeat-user';
    writeUserConfig(
      user,
      `habits:
  every day:
    type: summation
  midweek mood:
    type: single_select
    repeat: [wednesday]
    options: [good, okay, bad]
  friday reps:
    type: summation
    repeat: [friday]
`,
    );
    userAndAuthRepository.setUserPassword(user, 'test-password');
    const session = userAndAuthRepository.createUserSession(user, 3600);

    const wednesday = await request(createApp())
      .get(`/users/${user}/habits?date=2026-07-01`)
      .set('Cookie', `${SESSION_COOKIE_NAME}=${session}`)
      .expect(200);

    expect(wednesday.body.habits.map((habit: { name: string }) => habit.name)).toEqual([
      'every day',
      'midweek mood',
    ]);
    expect(wednesday.body.page.showEmptyIntro).toBe(false);

    const friday = await request(createApp())
      .get(`/users/${user}/habits?date=2026-07-03`)
      .set('Cookie', `${SESSION_COOKIE_NAME}=${session}`)
      .expect(200);

    expect(friday.body.habits.map((habit: { name: string }) => habit.name)).toEqual([
      'every day',
      'friday reps',
    ]);
  });

  it('reports configured habits when none repeat on the requested day', async () => {
    const user = 'habits-no-active-repeat-user';
    writeUserConfig(
      user,
      `habits:
  friday reps:
    type: summation
    repeat: [friday]
`,
    );
    userAndAuthRepository.setUserPassword(user, 'test-password');
    const session = userAndAuthRepository.createUserSession(user, 3600);

    const res = await request(createApp())
      .get(`/users/${user}/habits?date=2026-07-01`)
      .set('Cookie', `${SESSION_COOKIE_NAME}=${session}`)
      .expect(200);

    expect(res.body.habits).toEqual([]);
    expect(res.body.page.showEmptyIntro).toBe(false);
    expect(res.body.page.progress.caption).toBe('No habits for this day');
  });

  it('sets empty intro when the user has no configured habits', async () => {
    const user = 'habits-empty-config-user';
    writeUserConfig(user, `habits: {}\n`);
    userAndAuthRepository.setUserPassword(user, 'test-password');
    const session = userAndAuthRepository.createUserSession(user, 3600);

    const res = await request(createApp())
      .get(`/users/${user}/habits?date=2026-07-01`)
      .set('Cookie', `${SESSION_COOKIE_NAME}=${session}`)
      .expect(200);

    expect(res.body.habits).toEqual([]);
    expect(res.body.page.showEmptyIntro).toBe(true);
  });

  it('filters history rows by each habit repeat schedule', async () => {
    const user = 'habits-repeat-history-user';
    writeUserConfig(
      user,
      `habits:
  midweek reps:
    type: summation
    repeat: [wednesday]
  friday reps:
    type: summation
    repeat: [friday]
`,
    );
    userAndAuthRepository.setUserPassword(user, 'test-password');
    habitRepository.applyHabitMutation({
      kind: 'set_total',
      user,
      habit: 'midweek reps',
      date: dayFromString('2026-07-01'),
      total: 12,
      createdAt: '2026-07-01 08:00:00',
    });
    habitRepository.applyHabitMutation({
      kind: 'set_total',
      user,
      habit: 'midweek reps',
      date: dayFromString('2026-07-03'),
      total: 20,
      createdAt: '2026-07-03 08:00:00',
    });
    habitRepository.applyHabitMutation({
      kind: 'set_total',
      user,
      habit: 'friday reps',
      date: dayFromString('2026-07-03'),
      total: 5,
      createdAt: '2026-07-03 08:00:00',
    });
    const session = userAndAuthRepository.createUserSession(user, 3600);

    const res = await request(createApp())
      .get(`/users/${user}/habits/history?filter=midweek-reps,friday-reps&date=2026-07-03`)
      .set('Cookie', `${SESSION_COOKIE_NAME}=${session}`)
      .expect(200);

    expect(res.body.data.map((habit: { name: string }) => habit.name)).toEqual(['friday reps']);
    expect(res.body.data[0].details).toMatchObject({ goal: null, total: 5 });
    expect(res.body.data[0]).not.toHaveProperty('goal');
    expect(res.body.data[0]).not.toHaveProperty('total');
    expect(
      res.body.history.user
        .find((day: { day: string }) => day.day === '2026-07-03')
        ?.habits.map((habit: { name: string }) => habit.name),
    ).toEqual(['friday reps']);
  });
});
