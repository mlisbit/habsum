import request from 'supertest';
import { yamlString } from '@habsum/types/common/misc';
import { describe, expect, it } from 'vitest';
import { toDateKey, toDateKeyWithTime } from '@habsum/utils/date';
import { createApp } from '../../app.js';
import { ConfigService } from '../../services/config-service.js';
import { UserAndAuthRepository } from '../../repositories/user-and-auth-repository.js';
import { SESSION_COOKIE_NAME } from '../../utils/cookie-session-utils.js';

const configService = new ConfigService();
const userAndAuthRepository = new UserAndAuthRepository();

function writeSummationUserConfig(user: string, historyBlock = '    history:\n      period: 1w') {
  const created = configService.createEmptyUserConfig(user);
  if (!created.ok) throw new Error(created.error);
  const written = configService.writeUserConfigText(
    user,
    yamlString(`habits:
  push ups:
    type: summation
    goal: 100
${historyBlock}
`),
  );
  if (!written.ok) throw new Error(written.error);
}

describe('PATCH /users/:user/habits summation history', () => {
  it('returns history for the view day after the total is updated', async () => {
    const user = 'patch-history-user';
    writeSummationUserConfig(user);
    userAndAuthRepository.setUserPassword(user, 'test-password');
    const session = userAndAuthRepository.createUserSession(user, 3600);
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
    expect(res.body.events).toEqual([expect.objectContaining({ amount: 5 })]);
    const historyWidget = res.body.widgets?.find(
      (widget: { title: string }) => widget.title === 'History',
    );
    const barGraph = historyWidget?.body?.find(
      (body: { kind: string }) => body.kind === 'barGraph',
    );
    expect(barGraph?.data?.[date]?.value).toBe(5);
    expect(barGraph?.data?.[date]?.top).toBe(100);
  });

  it('combines weekly history, heatmap, and streak insights in one history widget', async () => {
    const user = 'patch-history-heatmap-user';
    writeSummationUserConfig(
      user,
      `    history:
      displays: [heatmap, weekly_history]
      period: 1w
    streak:
      options: ['100']
      show_longest: true`,
    );
    userAndAuthRepository.setUserPassword(user, 'test-password');
    const session = userAndAuthRepository.createUserSession(user, 3600);
    const app = createApp();

    const tzOffsetMinutes = new Date().getTimezoneOffset();
    const date = toDateKey(new Date(), tzOffsetMinutes);
    const clientCreatedAt = toDateKeyWithTime(new Date(), tzOffsetMinutes);

    const res = await request(app)
      .patch(`/users/${user}/habits`)
      .set('Cookie', `${SESSION_COOKIE_NAME}=${session}`)
      .send({
        habit: 'push ups',
        total: 100,
        date,
        clientCreatedAt,
        tzOffsetMinutes,
      });

    expect(res.status).toBe(200);
    const historyWidget = res.body.widgets?.find(
      (widget: { title: string }) => widget.title === 'History',
    );
    expect(historyWidget?.body?.map((body: { kind: string }) => body.kind)).toEqual([
      'barGraph',
      'streakGraph',
      'insights',
    ]);
    expect(historyWidget?.body?.[2]?.insights).toEqual(
      expect.arrayContaining([expect.objectContaining({ header: 'Average/day' })]),
    );
    expect(
      res.body.widgets?.some(
        (widget: { title: string }) =>
          widget.title === 'Data Visualization' || widget.title === 'Streak',
      ),
    ).toBe(false);
    expect(
      historyWidget?.body
        ?.find((body: { kind: string }) => body.kind === 'streakGraph')
        ?.graph?.data?.flat()
        .find((datum: { date: string }) => datum.date === date)?.fill,
    ).toBe(5);

    const listRes = await request(app)
      .get(`/users/${user}/habits`)
      .query({ date, tzOffsetMinutes })
      .set('Cookie', `${SESSION_COOKIE_NAME}=${session}`);

    expect(listRes.status).toBe(200);
    const listHistoryWidget = listRes.body.habits?.[0]?.widgets?.find(
      (widget: { title: string }) => widget.title === 'History',
    );
    expect(listHistoryWidget?.body?.map((body: { kind: string }) => body.kind)).toEqual([
      'barGraph',
      'streakGraph',
      'insights',
    ]);
    expect(
      listRes.body.habits?.[0]?.widgets?.some(
        (widget: { title: string }) => widget.title === 'Streak',
      ),
    ).toBe(false);
  });

  it('returns independently selected insights with the configured bar graph', async () => {
    const user = 'patch-history-independent-insights-user';
    writeSummationUserConfig(
      user,
      `    data_visualization:
      bargraph:
        period: 1w
    insights: [longest_streak, average]
    streak_options:
      frequency: 7d`,
    );
    userAndAuthRepository.setUserPassword(user, 'test-password');
    const session = userAndAuthRepository.createUserSession(user, 3600);
    const app = createApp();
    const tzOffsetMinutes = new Date().getTimezoneOffset();
    const date = toDateKey(new Date(), tzOffsetMinutes);

    const res = await request(app)
      .patch(`/users/${user}/habits`)
      .set('Cookie', `${SESSION_COOKIE_NAME}=${session}`)
      .send({
        habit: 'push ups',
        total: 100,
        date,
        clientCreatedAt: toDateKeyWithTime(new Date(), tzOffsetMinutes),
        tzOffsetMinutes,
      });

    expect(res.status).toBe(200);
    const historyWidget = res.body.widgets?.find(
      (widget: { title: string }) => widget.title === 'History',
    );
    expect(historyWidget?.body?.map((body: { kind: string }) => body.kind)).toEqual([
      'barGraph',
      'insights',
    ]);
    const headers = historyWidget?.body?.[1]?.insights?.map(
      (insight: { header: string }) => insight.header,
    );
    expect(headers).toEqual(['Longest streak', 'Average/day']);
  });
});
