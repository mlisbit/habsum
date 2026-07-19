import request from 'supertest';
import { yamlString } from '@habsum/types/common/misc';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../app.js';
import { ConfigService } from '../../services/config-service.js';
import { addToTotal, createUserSession, ensureUserPins, setSelect } from '../../db.js';
import { SESSION_COOKIE_NAME } from '../../session-cookie.js';

const configService = new ConfigService();

function writeExportUserConfig(user: string) {
  const created = configService.createEmptyUserConfig(user);
  if (!created.ok) throw new Error(created.error);
  const written = configService.writeUserConfigText(
    user,
    yamlString(`habits:
  mood:
    type: single_select
    options: ['good', 'tricky, value']
  push ups:
    type: summation
`),
  );
  if (!written.ok) throw new Error(written.error);
}

describe('GET /users/:user/data', () => {
  it('downloads daily selects and summation events as csv', async () => {
    const user = 'export-data-user';
    writeExportUserConfig(user);
    ensureUserPins([user]);
    setSelect(user, 'mood', '2026-01-02', 'tricky, value');
    addToTotal(user, 'push ups', '2026-01-03', 12, '2026-01-03 08:15:00');
    const session = createUserSession(user, 3600);
    const app = createApp();

    const res = await request(app)
      .get(`/users/${user}/data`)
      .set('Cookie', `${SESSION_COOKIE_NAME}=${session}`)
      .expect(200);

    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.headers['content-disposition']).toBe(
      'attachment; filename="export-data-user-habsum-data.csv"',
    );
    expect(res.text).toContain(
      'record_type,habit,date,value,event_id,amount,created_at\n' +
        'daily_select,mood,2026-01-02,"tricky, value",,,',
    );
    expect(res.text).toMatch(/summation_event,push ups,2026-01-03,,\d+,12,2026-01-03 08:15:00/);
  });
});
