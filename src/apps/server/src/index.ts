import type {
  Habit,
  HabitDetailResponse,
  HabitsResponse,
  HealthResponse,
  ListUsersResponse,
  PatchHabitResponse,
  PurgeUserDataResponse,
  UserConfigGetResponse,
  UserConfigPutResponse,
  UsersPatchRequest,
} from '@habsum/api-types';
import express, { type Request, type Response } from 'express';
import cors from 'cors';
import { join, resolve } from 'node:path';
import {
  listUsers,
  createUserFromSampleConfig,
  renameUserConfigFile,
  deleteUserConfigFile,
  loadUserConfig,
  readUserConfigFileText,
  writeUserConfigFileText,
} from './config.js';
import { dasherize, fromDateKey, toDateKey } from '@habsum/utils';
import {
  addToTotal,
  closeDb,
  deleteDailySelect,
  deleteDailyTotal,
  getAllSelects,
  getAllTotals,
  getFirstDate,
  getHabitFirstDate,
  getSelect,
  getSeries,
  getSummationDayTotal,
  purgeUserData,
  setSelect,
  setTotal,
} from './db.js';

type PatchBody = {
  habit?: unknown;
  total?: unknown;
  action?: unknown;
  value?: unknown;
};

function todayUtc(): string {
  return toDateKey(new Date(), 0);
}

function parseDateParam(value: unknown): string | null {
  if (typeof value !== 'string' || value.length === 0) return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

function addDaysUtc(date: string, delta: number) {
  const dt = fromDateKey(date, 0);
  const next = new Date(dt.getTime() + delta * 86_400_000);
  return toDateKey(next, 0);
}

function parsePeriodDays(period: string): number | null {
  const m = period.match(/^(\d+)([dw])$/);
  if (!m) return null;
  const n = Number(m[1]);
  if (!Number.isFinite(n) || n <= 0) return null;
  const unit = m[2];
  return unit === 'w' ? n * 7 : n;
}

function isSafeConfigUserId(user: string): boolean {
  if (user.length === 0 || user.length > 200) return false;
  if (/[/\\]/.test(user) || user.includes('..')) return false;
  return true;
}

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  const body: HealthResponse = { ok: true };
  res.json(body);
});

app.get('/users', (_req, res) => {
  const body: ListUsersResponse = { users: listUsers() };
  res.json(body);
});

app.post('/users', (req, res) => {
  const name = typeof req.query.name === 'string' ? req.query.name : '';
  if (!name) return res.status(400).json({ error: 'name is required' });
  if (!isSafeConfigUserId(name)) {
    return res.status(400).json({ error: 'invalid user' });
  }

  const out = createUserFromSampleConfig(name);
  if (!out.ok) {
    const status = out.error.includes('already exists') ? 409 : 400;
    return res.status(status).json({ error: out.error });
  }

  return res.status(201).json({ ok: true, user: out.user });
});

app.patch(
  '/users/:user',
  (req: Request<{ user: string }, unknown, UsersPatchRequest>, res: Response) => {
    const { user } = req.params;
    if (!isSafeConfigUserId(user)) {
      return res.status(400).json({ error: 'invalid user' });
    }

    const nextName = typeof req.body?.name === 'string' ? req.body.name : '';
    if (!nextName) return res.status(400).json({ error: 'name is required' });
    if (!isSafeConfigUserId(nextName)) {
      return res.status(400).json({ error: 'invalid user' });
    }
    if (nextName === user) {
      return res.status(400).json({ error: 'name is unchanged' });
    }

    const out = renameUserConfigFile(user, nextName);
    if (!out.ok) {
      const status = out.error.includes('already exists')
        ? 409
        : out.error === 'user not found'
          ? 404
          : 400;
      return res.status(status).json({ error: out.error });
    }

    return res.json({ ok: true, user: out.user });
  },
);

app.delete('/users/:user', (req: Request<{ user: string }>, res: Response) => {
  const { user } = req.params;
  if (!isSafeConfigUserId(user)) {
    return res.status(400).json({ error: 'invalid user' });
  }

  try {
    purgeUserData(user);
  } catch (e) {
    return res.status(400).json({ error: e instanceof Error ? e.message : 'purge failed' });
  }

  const out = deleteUserConfigFile(user);
  if (!out.ok) {
    const status = out.error === 'user not found' ? 404 : 400;
    return res.status(status).json({ error: out.error });
  }

  return res.json({ ok: true, user: out.user });
});

app.get(
  '/users/:user/habits',
  (req: Request<{ user: string }, unknown, unknown, { date?: string }>, res: Response) => {
    const { user } = req.params;
    const config = loadUserConfig(user);
    if (!config) return res.status(404).json({ error: 'user not found' });

    const firstDate = getFirstDate(user);
    const date = parseDateParam(req.query.date) ?? todayUtc();

    const habits = config.habits.map((h) => {
      const base = {
        name: h.name,
        goal: h.goal,
        ...(h.history
          ? (() => {
              const days = parsePeriodDays(h.history.period) ?? 7;
              const start = addDaysUtc(date, -(days - 1));
              const rows = getSeries(user, h.name, start, date);
              const byDate = new Map(rows.map((r) => [r.date, r.total]));
              const series = Array.from({ length: days }, (_, i) => {
                const d = addDaysUtc(start, i);
                if (firstDate && d < firstDate) return null;
                return byDate.get(d) ?? 0;
              });
              return {
                history: { display: h.history.display, data: { user: series } },
              };
            })()
          : {}),
      };
      if (h.type === 'single_select') {
        return {
          ...base,
          type: 'single_select' as const,
          options: h.options ?? [],
          value: getSelect(user, h.name, date),
        } satisfies Habit;
      }
      return {
        ...base,
        type: 'summation' as const,
        total: getSummationDayTotal(user, h.name, date),
      } satisfies Habit;
    });
    const body: HabitsResponse = {
      user,
      date,
      firstDate,
      habits,
      serverTime: new Date().toISOString(),
    };
    res.json(body);
  },
);

app.get(
  '/users/:user/habits/history',
  (req: Request<{ user: string }, unknown, unknown, { habitId?: string }>, res: Response) => {
    const { user } = req.params;
    const habitId = typeof req.query.habitId === 'string' ? req.query.habitId : '';
    if (!habitId) return res.status(400).json({ error: 'habitId is required' });

    const config = loadUserConfig(user);
    if (!config) return res.status(404).json({ error: 'user not found' });

    const habitDef = config.habits.find((h) => dasherize(h.name) === habitId);
    if (!habitDef) {
      return res.status(404).json({ error: 'habit not configured' });
    }
    const habitName = habitDef.name;

    const firstDate = getHabitFirstDate(user, habitName);

    const data: HabitDetailResponse['data'] = {
      user:
        habitDef.type === 'single_select'
          ? getAllSelects(user, habitName).map((r) => ({
              day: r.date,
              habits: [
                {
                  name: habitName,
                  type: 'single_select',
                  goal: habitDef.goal,
                  options: habitDef.options ?? [],
                  value: r.value,
                } satisfies Habit,
              ],
            }))
          : getAllTotals(user, habitName).map((r) => ({
              day: r.date,
              habits: [
                {
                  name: habitName,
                  type: 'summation',
                  goal: habitDef.goal ?? null,
                  total: r.total,
                } satisfies Habit,
              ],
            })),
    };

    const body: HabitDetailResponse = {
      user,
      habitId,
      habitName,
      habitType: habitDef.type,
      habitGoal: habitDef.goal,
      habitOptions: habitDef.type === 'single_select' ? (habitDef.options ?? []) : [],
      firstDate,
      data,
      serverTime: new Date().toISOString(),
    };
    res.json(body);
  },
);

// Backwards compat: old URL used path param for habitId.
// Must be registered AFTER the explicit `/history` route.
app.get('/users/:user/habits/:habitId', (req, res) => {
  const { user, habitId } = req.params;
  const qs = new URLSearchParams({ habitId });
  res.redirect(307, `/users/${encodeURIComponent(user)}/habits/history?${qs.toString()}`);
});

app.patch(
  '/users/:user/habits',
  (req: Request<{ user: string }, unknown, PatchBody, { date?: string }>, res: Response) => {
    const { user } = req.params;
    const config = loadUserConfig(user);
    if (!config) return res.status(404).json({ error: 'user not found' });

    const date = parseDateParam(req.query.date) ?? todayUtc();

    const { habit, total, action, value } = req.body ?? {};
    if (typeof habit !== 'string' || habit.length === 0) {
      return res.status(400).json({ error: 'habit is required' });
    }

    const known = config.habits.find((h) => h.name === habit);
    if (!known) {
      return res.status(404).json({ error: `habit "${habit}" not configured` });
    }

    if (known.type === 'single_select') {
      const mode = typeof action === 'string' ? action : undefined;
      if (mode === 'clear') {
        deleteDailySelect(user, habit, date);
        const opts = known.options ?? [];
        const out: PatchHabitResponse = {
          user,
          date,
          habit,
          value: null,
          type: known.type,
          options: opts,
        };
        return res.json(out);
      }

      if (typeof value !== 'string' || value.length === 0) {
        return res.status(400).json({ error: 'value is required' });
      }
      const opts = known.options ?? [];
      if (opts.length && !opts.includes(value)) {
        return res.status(400).json({ error: 'invalid option' });
      }
      const next = setSelect(user, habit, date, value);
      const out: PatchHabitResponse = {
        user,
        date,
        habit,
        value: next,
        type: known.type,
        options: opts,
      };
      return res.json(out);
    }

    const mode = typeof action === 'string' ? action : 'add';

    if (mode === 'clear') {
      deleteDailyTotal(user, habit, date);
      const out: PatchHabitResponse = {
        user,
        date,
        habit,
        total: null,
        type: known.type,
        goal: known.goal,
      };
      return res.json(out);
    }

    const numericTotal = Number(total);
    if (!Number.isFinite(numericTotal)) {
      return res.status(400).json({ error: 'total must be a number' });
    }

    let next: number;
    if (mode === 'add') {
      next = addToTotal(user, habit, date, numericTotal);
    } else if (mode === 'set') {
      next = setTotal(user, habit, date, numericTotal);
    } else {
      return res.status(400).json({ error: `unknown action "${mode}"` });
    }

    const out: PatchHabitResponse = {
      user,
      date,
      habit,
      total: next,
      type: known.type,
      goal: known.goal,
    };
    return res.json(out);
  },
);

app.get('/users/:user/config', (req: Request<{ user: string }>, res: Response) => {
  const { user } = req.params;
  if (!isSafeConfigUserId(user)) {
    return res.status(400).json({ error: 'invalid user' });
  }
  const text = readUserConfigFileText(user);
  if (text == null) return res.status(404).json({ error: 'user not found' });
  const body: UserConfigGetResponse = { text };
  res.json(body);
});

app.put(
  '/users/:user/config',
  (req: Request<{ user: string }, unknown, { text?: unknown }>, res: Response) => {
    const { user } = req.params;
    if (!isSafeConfigUserId(user)) {
      return res.status(400).json({ error: 'invalid user' });
    }
    const { text } = req.body ?? {};
    if (typeof text !== 'string') {
      return res.status(400).json({ error: 'text is required' });
    }
    const out = writeUserConfigFileText(user, text);
    if (!out.ok) {
      return res.status(400).json({ error: out.error });
    }
    const body: UserConfigPutResponse = { ok: true, user };
    res.json(body);
  },
);

app.delete('/users/:user/data', (req: Request<{ user: string }>, res: Response) => {
  const { user } = req.params;
  const config = loadUserConfig(user);
  if (!config) return res.status(404).json({ error: 'user not found' });
  purgeUserData(user);
  const body: PurgeUserDataResponse = { ok: true, user };
  res.json(body);
});

const PORT = Number(process.env.PORT ?? 3001);
const server = app.listen(PORT, () => {
  const rawDir = process.env.HABSUM_CONFIG_DIR;
  const dataDir = rawDir ? resolve(rawDir) : '(missing)';
  const dbPath = rawDir ? join(dataDir, 'habsum.db') : '(missing)';
  const usersDir = rawDir ? join(dataDir, 'users') : '(missing)';
  console.log(`[habsum] HABSUM_CONFIG_DIR=${dataDir}`);
  console.log(`[habsum] DB=${dbPath}`);
  console.log(`[habsum] users=${usersDir}`);
  console.log(`[habsum] server listening on http://localhost:${PORT}`);
});

let isShuttingDown = false;
async function shutdown(signal: string) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`[habsum] received ${signal}, shutting down...`);

  await new Promise<void>((resolve) => {
    server.close(() => resolve());
  });

  try {
    closeDb();
  } catch (e) {
    console.warn('[habsum] error closing db', e);
  }
}

process.on('SIGINT', () => {
  shutdown('SIGINT')
    .catch((e) => console.error(e))
    .finally(() => process.exit(0));
});
process.on('SIGTERM', () => {
  shutdown('SIGTERM')
    .catch((e) => console.error(e))
    .finally(() => process.exit(0));
});
