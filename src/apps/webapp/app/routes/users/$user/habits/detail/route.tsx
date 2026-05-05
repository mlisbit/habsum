import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from '@remix-run/react';
import { Calendar, type CalendarDataRender } from '~/components/Calendar';
import { Button } from '~/core-components/Button';
import { InfoText } from '~/core-components/InfoText';
import { ProgressBar } from '~/core-components/ProgressBar';
import { SingleSelectWidget, SummationWidget } from '~/components/widgets';
import { getHabitHistory, patchHabit, type Habit } from '~/api.client';
import { dasherize, toDateKey } from '@habsum/utils';

type HabitHistory = Awaited<ReturnType<typeof getHabitHistory>>;

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function withoutHistory<T extends Habit>(habit: T): T {
  const { history: _omit, ...rest } = habit;
  return rest as T;
}

function parseHabitFilters(raw: string | null): string[] {
  const seen = new Set<string>();
  return (raw ?? '')
    .split(',')
    .map((x) => x.trim())
    .filter((x) => {
      if (!x || seen.has(x)) return false;
      seen.add(x);
      return true;
    });
}

function blankHabitFrom(habit: Habit): Habit {
  if (habit.type === 'single_select') {
    return withoutHistory({
      name: habit.name,
      type: 'single_select',
      goal: habit.goal,
      options: habit.options,
      value: null,
    } satisfies Habit);
  }

  return withoutHistory({
    name: habit.name,
    type: 'summation',
    goal: habit.goal,
    total: null,
    ...(habit.summationOptions != null ? { summationOptions: habit.summationOptions } : {}),
  } satisfies Habit);
}

function upsertDayHabit(
  rows: HabitHistory['data']['user'],
  day: string,
  nextHabit: Habit,
): HabitHistory['data']['user'] {
  const idx = rows.findIndex((r) => r.day === day);
  if (idx === -1) {
    return [...rows, { day, habits: [nextHabit] }].sort((a, b) =>
      a.day < b.day ? -1 : a.day > b.day ? 1 : 0,
    );
  }

  const copy = rows.slice();
  const prevHabits = copy[idx].habits;
  const habitIdx = prevHabits.findIndex((h) => h.name === nextHabit.name);
  copy[idx] = {
    ...copy[idx],
    habits:
      habitIdx === -1
        ? [...prevHabits, nextHabit]
        : prevHabits.map((h, i) => (i === habitIdx ? nextHabit : h)),
  };
  return copy;
}

function renderCalendarDot(habit: Habit) {
  const scale =
    habit.type === 'summation'
      ? (() => {
          const goal = habit.goal ?? 0;
          if (goal <= 0) return 1;
          const ratio = (habit.total ?? 0) / goal;
          // Map 0..1..2+ -> 0.6..1.2..1.5 (clamped)
          return clamp(0.6 + ratio * 0.6, 0.6, 1.5);
        })()
      : 1;

  return (
    <span
      key={habit.name}
      className="calendar__dot"
      aria-hidden
      style={{ transform: `scale(${scale})` }}
    />
  );
}

function calendarHoverContent(habits: Habit[]) {
  return (
    <div className="habit-history__calendar-day-hover">
      {habits.map((h) => (
        <div key={h.name} className="habit-history__calendar-day-hover-habit">
          {h.type === 'summation' ? (
            <>
              <strong>{h.name}</strong>
              {h.goal != null && h.goal > 0 ? (
                <ProgressBar
                  className="habit-history__calendar-day-hover-progress"
                  value={h.total ?? 0}
                  max={h.goal}
                  aria-label={`${h.name}: ${h.total ?? 0} of ${h.goal}`}
                />
              ) : (
                <div className="text-light text-b-m">
                  {h.total == null ? '—' : h.total}
                  {h.goal != null ? ` / ${h.goal}` : ''}
                </div>
              )}
            </>
          ) : (
            <>
              <strong>{h.name}</strong>
              <div className="text-light text-b-m">
                {h.value ?? '—'}
                {h.options.length > 0 ? <span> · {h.options.join(', ')}</span> : null}
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
}

// Habit detail — /users/:user/habits/detail?filter=:habitId or :habitId,:habitId
export default function HabitDetailRoute() {
  const { user: routeUser } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const query = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const user = routeUser ?? '';
  const habitIds = useMemo(() => parseHabitFilters(query.get('filter')), [query]);
  const habitFilterKey = habitIds.join(',');
  const selectedDate = query.get('date');
  const [history, setHistory] = useState<HabitHistory | null>(null);
  const [habitError, setHabitError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const tzOffsetMinutes = useMemo(() => new Date().getTimezoneOffset(), []);
  const today = useMemo(() => toDateKey(new Date(), tzOffsetMinutes), [tzOffsetMinutes]);
  const effectiveDate = selectedDate ?? today;

  useEffect(() => {
    if (habitIds.length === 0 || !user) {
      setIsLoading(false);
      setHistory(null);
      setHabitError(user ? 'filter is required' : null);
      return;
    }

    let ignore = false;
    setIsLoading(true);
    setHabitError(null);
    setHistory(null);

    getHabitHistory(user, habitIds)
      .then((nextHistory) => {
        if (!ignore) setHistory(nextHistory);
      })
      .catch((e) => {
        if (!ignore) setHabitError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (!ignore) setIsLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [habitFilterKey, habitIds, user]);

  const representativeHabits = useMemo(() => {
    const byId = new Map<string, Habit>();
    for (const row of history?.data.user ?? []) {
      for (const habit of row.habits) {
        const id = dasherize(habit.name);
        if (!byId.has(id)) byId.set(id, withoutHistory(habit));
      }
    }
    return habitIds.map((habitId) => byId.get(habitId)).filter((habit): habit is Habit => !!habit);
  }, [habitIds, history]);

  const widgets = useMemo(() => {
    const row = history?.data.user.find((r) => r.day === effectiveDate);
    return representativeHabits.map((representative) => {
      const fromRow = row?.habits.find((h) => h.name === representative.name);
      return fromRow ? withoutHistory(fromRow) : blankHabitFrom(representative);
    });
  }, [effectiveDate, history, representativeHabits]);

  const setSelectedDateInUrl = (date: string) => {
    const qs = new URLSearchParams(location.search);
    qs.set('date', date);
    navigate(`${location.pathname}?${qs.toString()}`);
  };

  const onHabitPatched = (updated: Habit) => {
    setHistory((prev) =>
      prev
        ? {
            ...prev,
            data: {
              ...prev.data,
              user: upsertDayHabit(prev.data.user, effectiveDate, updated),
            },
          }
        : prev,
    );
  };

  const dataRenders = useMemo<CalendarDataRender[]>(
    () =>
      (history?.data.user ?? []).map((row) => ({
        date: row.day,
        callRender: () =>
          row.habits.length === 1 ? (
            renderCalendarDot(row.habits[0])
          ) : (
            <span className="habit-history__calendar-dots" aria-hidden>
              {row.habits.map(renderCalendarDot)}
            </span>
          ),
        hoverContent: () => calendarHoverContent(row.habits),
      })),
    [history],
  );

  const title =
    representativeHabits.length > 0
      ? representativeHabits.map((habit) => habit.name).join(', ')
      : habitFilterKey || 'Habit';

  return (
    <div>
      <div className="habit-history__header">
        <Button
          type="secondary"
          icon="chevronBack"
          circle
          text=""
          title="Back to habits"
          aria-label="Back to habits"
          onClick={() =>
            window.location.assign(
              `/users/${encodeURIComponent(user)}/habits${
                selectedDate ? `?date=${encodeURIComponent(selectedDate)}` : ''
              }`,
            )
          }
        />
        <h1 className="text-h-xl">{title}</h1>
      </div>

      <div className="habit-history">
        <div className="habit-history__calendar">
          <div className="card">
            <Calendar
              tzOffsetMinutes={tzOffsetMinutes}
              lastData={toDateKey(new Date(), tzOffsetMinutes)}
              firstDate={history?.firstDate ?? undefined}
              selectedDate={selectedDate ?? undefined}
              onDaySelect={setSelectedDateInUrl}
              dataRenders={dataRenders}
              greyOutDaysWithoutData
            />
          </div>
        </div>

        <div className="habit-history__widget">
          {habitError ? <InfoText variant="error">{habitError}</InfoText> : null}
          {!habitError && habitIds.length === 0 ? (
            <p className="text-light text-b-m">Choose a habit to view details.</p>
          ) : null}
          {!habitError && habitIds.length > 0 && isLoading ? (
            <p className="text-light text-b-m" aria-busy>
              Loading habit data…
            </p>
          ) : null}
          {!habitError && !isLoading
            ? widgets.map((habitForWidget) =>
                habitForWidget.type === 'single_select' ? (
                  <SingleSelectWidget
                    key={habitForWidget.name}
                    user={user}
                    habit={habitForWidget}
                    onSelectOption={async (opt) => {
                      const updated = await patchHabit(
                        user,
                        { habit: habitForWidget.name, value: opt },
                        { date: effectiveDate },
                      );
                      onHabitPatched({ ...habitForWidget, ...updated, value: opt } as Habit);
                    }}
                    onClearSelection={async () => {
                      const updated = await patchHabit(
                        user,
                        { habit: habitForWidget.name, action: 'clear' },
                        { date: effectiveDate },
                      );
                      onHabitPatched({ ...habitForWidget, ...updated } as Habit);
                    }}
                  />
                ) : (
                  <SummationWidget
                    key={habitForWidget.name}
                    user={user}
                    habit={habitForWidget}
                    onAddAmount={async (delta) => {
                      const updated = await patchHabit(
                        user,
                        { habit: habitForWidget.name, total: delta },
                        { date: effectiveDate },
                      );
                      onHabitPatched({ ...habitForWidget, ...updated } as Habit);
                    }}
                    onClearTotal={async () => {
                      const updated = await patchHabit(
                        user,
                        { habit: habitForWidget.name, action: 'clear' },
                        { date: effectiveDate },
                      );
                      onHabitPatched({ ...habitForWidget, ...updated } as Habit);
                    }}
                  />
                ),
              )
            : null}
        </div>
      </div>
    </div>
  );
}
