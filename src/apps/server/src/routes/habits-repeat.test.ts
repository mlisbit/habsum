import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../app.js';
import { createUserFromSampleConfig, writeUserConfigFileText } from '../config.js';
import { createUserSession, ensureUserPins, setTotal } from '../db.js';
import { SESSION_COOKIE_NAME } from '../session-cookie.js';

function writeUserConfig(user: string, text: string) {
  const created = createUserFromSampleConfig(user);
  if (!created.ok) throw new Error(created.error);
  const written = writeUserConfigFileText(user, text);
  if (!written.ok) throw new Error(written.error);
}

describe('GET /users/:user/habits repeat config', () => {
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
    ensureUserPins([user]);
    const session = createUserSession(user, 3600);

    const wednesday = await request(createApp())
      .get(`/users/${user}/habits?date=2026-07-01`)
      .set('Cookie', `${SESSION_COOKIE_NAME}=${session}`)
      .expect(200);

    expect(wednesday.body.habits.map((habit: { name: string }) => habit.name)).toEqual([
      'every day',
      'midweek mood',
    ]);

    const friday = await request(createApp())
      .get(`/users/${user}/habits?date=2026-07-03`)
      .set('Cookie', `${SESSION_COOKIE_NAME}=${session}`)
      .expect(200);

    expect(friday.body.habits.map((habit: { name: string }) => habit.name)).toEqual([
      'every day',
      'friday reps',
    ]);
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
    ensureUserPins([user]);
    setTotal(user, 'midweek reps', '2026-07-01', 12, '2026-07-01 08:00:00');
    setTotal(user, 'midweek reps', '2026-07-03', 20, '2026-07-03 08:00:00');
    setTotal(user, 'friday reps', '2026-07-03', 5, '2026-07-03 08:00:00');
    const session = createUserSession(user, 3600);

    const res = await request(createApp())
      .get(`/users/${user}/habits/history?filter=midweek-reps,friday-reps&date=2026-07-03`)
      .set('Cookie', `${SESSION_COOKIE_NAME}=${session}`)
      .expect(200);

    expect(res.body.data.map((habit: { name: string }) => habit.name)).toEqual(['friday reps']);
    expect(
      res.body.history.user
        .find((day: { day: string }) => day.day === '2026-07-03')
        ?.habits.map((habit: { name: string }) => habit.name),
    ).toEqual(['friday reps']);
  });
});
