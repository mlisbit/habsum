import { join } from 'node:path';
import { writeFileSync } from 'node:fs';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../app.js';
import { ensureConfigLayout } from '../config.js';
import { addToTotal, createUserSession, ensureUserPins, setSelect } from '../db.js';
import { SESSION_COOKIE_NAME } from '../session-cookie.js';

function writeExportUserConfig(user: string) {
  ensureConfigLayout();
  const usersDir = join(process.env.HABSUM_CONFIG_DIR!, 'users');
  writeFileSync(
    join(usersDir, `${user}.yaml`),
    `habits:
  mood:
    type: single_select
    options: ['good', 'tricky, value']
  push ups:
    type: summation
`,
    'utf8',
  );
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
