import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { toDateKey, toDateKeyWithTime } from '@habsum/utils/date';
import { createApp } from '../app.js';
import { createEmptyUserConfig, writeUserConfigFileText } from '../config.js';
import { createUserSession, ensureUserPins } from '../db.js';
import { SESSION_COOKIE_NAME } from '../session-cookie.js';

function writeSummationUserConfig(user: string) {
  const created = createEmptyUserConfig(user);
  if (!created.ok) throw new Error(created.error);
  const written = writeUserConfigFileText(
    user,
    `habits:
  push ups:
    type: summation
    goal: 100
    history:
      period: 1w
`,
  );
  if (!written.ok) throw new Error(written.error);
}

describe('PATCH /users/:user/habits summation history', () => {
  it('returns history for the view day after the total is updated', async () => {
    const user = 'patch-history-user';
    writeSummationUserConfig(user);
    ensureUserPins([user]);
    const session = createUserSession(user, 3600);
    const app = createApp();

    const tzOffsetMinutes = new Date().getTimezoneOffset();
    const date = toDateKey(new Date(), tzOffsetMinutes);
    const clientCreatedAt = toDateKeyWithTime(new Date(), tzOffsetMinutes);

    const res = await request(app)
      .patch(`/users/${user}/habits`)
      .set('Cookie', `${SESSION_COOKIE_NAME}=${session}`)
      .send({
        habit: 'push ups',
        total: 5,
        date,
        clientCreatedAt,
        tzOffsetMinutes,
      });

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(5);
    const historyWidget = res.body.widgets?.find(
      (widget: { title: string }) => widget.title === 'History',
    );
    const barGraph = historyWidget?.body?.find(
      (body: { kind: string }) => body.kind === 'barGraph',
    );
    expect(barGraph?.data?.[date]?.value).toBe(5);
    expect(barGraph?.data?.[date]?.top).toBe(100);
  });
});
