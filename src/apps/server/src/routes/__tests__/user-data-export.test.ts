import request from 'supertest';
import { dayFromString } from '@habsum/types/common/day';
import { yamlString } from '@habsum/types/common/misc';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../app.js';
import { ConfigService } from '../../services/config-service.js';
import { UserHabitRepository } from '../../repositories/user-habit-repository.js';
import { UserAndAuthRepository } from '../../repositories/user-and-auth-repository.js';
import { SESSION_COOKIE_NAME } from '../../utils/cookie-session-utils.js';

const configService = new ConfigService();
const userAndAuthRepository = new UserAndAuthRepository();

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
  journal:
    type: text
`),
  );
  if (!written.ok) throw new Error(written.error);
}

describe('GET /users/:user/data', () => {
  it('downloads daily selects, summation events, and text entries as csv', async () => {
    const user = 'export-data-user';
    writeExportUserConfig(user);
    userAndAuthRepository.setUserPassword(user, 'test-password');
    const habitRepository = new UserHabitRepository(user, configService);
    habitRepository.applyHabitMutation({
      kind: 'set_select',
      habit: 'mood',
      date: dayFromString('2026-01-02'),
      value: 'tricky, value',
    });
    habitRepository.applyHabitMutation({
      kind: 'add_total',
      habit: 'push ups',
      date: dayFromString('2026-01-03'),
      total: 12,
      createdAt: '2026-01-03 08:15:00',
    });
    habitRepository.applyHabitMutation({
      kind: 'set_text',
      habit: 'journal',
      date: dayFromString('2026-01-04'),
      text: 'line one\nline two',
    });
    const session = userAndAuthRepository.createUserSession(user, 3600);
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
    expect(res.text).toContain('text,journal,2026-01-04,"line one\nline two",,,');
  });
});
