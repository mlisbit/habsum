import request from 'supertest';
import { yamlString } from '@habsum/types/common/misc';
import { describe, expect, it } from 'vitest';
import { toDateKey } from '@habsum/utils/date';
import { createApp } from '../../app.js';
import { ConfigService } from '../../services/config-service.js';
import { UserAndAuthRepository } from '../../repositories/user-and-auth-repository.js';
import { SESSION_COOKIE_NAME } from '../../utils/cookie-session-utils.js';

const configService = new ConfigService();
const userAndAuthRepository = new UserAndAuthRepository();

describe('single-select heatmap', () => {
  it('returns the heatmap after updating a selection', async () => {
    const user = 'single-select-heatmap-user';
    const created = configService.createEmptyUserConfig(user);
    if (!created.ok) throw new Error(created.error);
    const written = configService.writeUserConfigText(
      user,
      yamlString(`habits:
  read:
    type: single_select
    options: [yes, no]
    history:
      displays: [heatmap]
      period: 3w
`),
    );
    if (!written.ok) throw new Error(written.error);

    userAndAuthRepository.setUserPassword(user, 'test-password');
    const session = userAndAuthRepository.createUserSession(user, 3600);
    const app = createApp();
    const tzOffsetMinutes = new Date().getTimezoneOffset();
    const date = toDateKey(new Date(), tzOffsetMinutes);

    const res = await request(app)
      .patch(`/users/${user}/habits`)
      .set('Cookie', `${SESSION_COOKIE_NAME}=${session}`)
      .send({ habit: 'read', value: 'yes', date, tzOffsetMinutes });

    expect(res.status).toBe(200);
    expect(res.body.details).toMatchObject({
      value: 'yes',
      options: ['yes', 'no'],
    });
    expect(res.body).not.toHaveProperty('value');
    expect(res.body).not.toHaveProperty('options');
    expect(res.body).not.toHaveProperty('goal');
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
    expect(listRes.body.habits?.[0]?.details).toMatchObject({
      value: 'yes',
      options: ['yes', 'no'],
    });
    expect(listRes.body.habits?.[0]).not.toHaveProperty('value');
    expect(listRes.body.habits?.[0]).not.toHaveProperty('options');
    expect(
      listRes.body.habits?.[0]?.widgets?.find(
        (widget: { title: string }) => widget.title === 'History',
      )?.body?.[0]?.kind,
    ).toBe('streakGraph');
  });
});
