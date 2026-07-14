import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { toDateKey } from '@habsum/utils/date';
import { createApp } from '../app.js';
import { createEmptyUserConfig, writeUserConfigFileText } from '../config.js';
import { createUserSession, ensureUserPins } from '../db.js';
import { SESSION_COOKIE_NAME } from '../session-cookie.js';

describe('single-select heatmap', () => {
  it('returns the heatmap after updating a selection', async () => {
    const user = 'single-select-heatmap-user';
    const created = createEmptyUserConfig(user);
    if (!created.ok) throw new Error(created.error);
    const written = writeUserConfigFileText(
      user,
      `habits:
  read:
    type: single_select
    options: [yes, no]
    history:
      displays: [heatmap]
      period: 3w
`,
    );
    if (!written.ok) throw new Error(written.error);

    ensureUserPins([user]);
    const session = createUserSession(user, 3600);
    const app = createApp();
    const tzOffsetMinutes = new Date().getTimezoneOffset();
    const date = toDateKey(new Date(), tzOffsetMinutes);

    const res = await request(app)
      .patch(`/users/${user}/habits`)
      .set('Cookie', `${SESSION_COOKIE_NAME}=${session}`)
      .send({ habit: 'read', value: 'yes', date, tzOffsetMinutes });

    expect(res.status).toBe(200);
    const historyWidget = res.body.widgets?.find(
      (widget: { title: string }) => widget.title === 'History',
    );
    expect(historyWidget?.body?.map((body: { kind: string }) => body.kind)).toEqual([
      'streakGraph',
    ]);
    expect(
      historyWidget?.body?.[0]?.graph?.data
        ?.flat()
        .find((datum: { date: string }) => datum.date === date)?.fill,
    ).toBe(5);

    const listRes = await request(app)
      .get(`/users/${user}/habits`)
      .query({ date, tzOffsetMinutes })
      .set('Cookie', `${SESSION_COOKIE_NAME}=${session}`);

    expect(listRes.status).toBe(200);
    expect(
      listRes.body.habits?.[0]?.widgets?.find(
        (widget: { title: string }) => widget.title === 'History',
      )?.body?.[0]?.kind,
    ).toBe('streakGraph');
  });
});
