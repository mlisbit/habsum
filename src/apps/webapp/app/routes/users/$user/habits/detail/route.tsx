import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from '@remix-run/react';
import { Calendar, type CalendarDataRender } from '~/components/Calendar';
import { CellDataDisplay } from '~/components/CellDataDisplay';
import { CellHoverDisplay } from '~/components/CellHoverDisplay';
import { DayNav } from '~/components/DayNav';
import { Button } from '~/core-components/Button';
import { InfoText } from '~/core-components/InfoText';
import { Pill } from '~/core-components/Pill';
import { SingleSelectWidget, SummationWidget } from '~/components/widgets';
import { getHabitHistory, patchHabit, type Habit } from '~/api.client';
import { toDateKey } from '@habsum/utils';
import { addDays } from '~/utils/date-utils';

type HistoryGetPayload = Awaited<ReturnType<typeof getHabitHistory>>;

function withoutHistory<T extends Habit>(habit: T): T {
  const { history: _omit, ...rest } = habit;
  return rest as T;
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
  const [historyRes, setHistoryRes] = useState<HistoryGetPayload | null>(null);
  const [habitError, setHabitError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const tzOffsetMinutes = useMemo(() => new Date().getTimezoneOffset(), []);
  const today = useMemo(() => toDateKey(new Date(), tzOffsetMinutes), [tzOffsetMinutes]);
  const effectiveDate = selectedDate && selectedDate.length > 0 ? selectedDate : today;
  const showJumpToToday = effectiveDate !== today;

  const fetchHistory = useCallback(
    async (options: { mode: 'initial' | 'refresh'; cancelled?: { current: boolean } }) => {
      const { mode, cancelled } = options;
      if (habitIds.length === 0 || !user) return;

      if (mode === 'initial') {
        setIsLoading(true);
        setHistoryRes(null);
      }
      setHabitError(null);

      try {
        const nextHistory = await getHabitHistory(user, habitIds, effectiveDate);
        if (cancelled?.current) return;
        setHistoryRes(nextHistory);
      } catch (e) {
        if (cancelled?.current) return;
        setHabitError(e instanceof Error ? e.message : String(e));
      } finally {
        if (mode === 'initial' && !cancelled?.current) {
          setIsLoading(false);
        }
      }
    },
    [user, habitIds, effectiveDate],
  );

  useEffect(() => {
    if (habitIds.length === 0 || !user) {
      setIsLoading(false);
      setHistoryRes(null);
      setHabitError(user ? 'filter is required' : null);
      return;
    }

    const cancelled = { current: false };
    void fetchHistory({ mode: 'initial', cancelled });

    return () => {
      cancelled.current = true;
    };
  }, [fetchHistory, user, habitFilterKey, effectiveDate]);

  const widgets = useMemo(
    () => (historyRes?.data ?? []).map((h) => withoutHistory(h)),
    [historyRes],
  );

  const setSelectedDateInUrl = (date: string) => {
    const qs = new URLSearchParams(location.search);
    qs.set('date', date);
    navigate(`${location.pathname}?${qs.toString()}`);
  };

  const setHabitFilterInUrl = (habitId: string, checked: boolean) => {
    const nextHabitIds = checked ? [...habitIds, habitId] : habitIds.filter((id) => id !== habitId);

    if (nextHabitIds.length === 0) return;

    const qs = new URLSearchParams(location.search);
    qs.set('filter', nextHabitIds.join(','));
    navigate(`${location.pathname}?${qs.toString()}`);
  };

  const dataRenders = useMemo<CalendarDataRender[]>(() => {
    if (!historyRes) return [];

    const rangeStart = historyRes.firstDate ?? today;
    const rangeEnd = today;
    if (rangeStart > rangeEnd) return [];

    const byDay = new Map(historyRes.history.user.map((row) => [row.day, row.habits]));
    const templates = historyRes.data;
    if (templates.length === 0) {
      return (historyRes.history.user ?? []).map((row) => ({
        date: row.day,
        callRender: () => (
          <CellDataDisplay
            date={row.day}
            rangeStart={rangeStart}
            rangeEnd={rangeEnd}
            habits={row.habits}
          />
        ),
        hoverContent: () => <CellHoverDisplay habits={row.habits} />,
      }));
    }

    const blanks = templates.map((h) => blankHabitFrom(h));
    const list: CalendarDataRender[] = [];
    let d = rangeStart;
    while (d <= rangeEnd) {
      const dayKey = d;
      const habitsForDay = byDay.get(dayKey) ?? blanks;
      list.push({
        date: dayKey,
        callRender: () => (
          <CellDataDisplay
            date={dayKey}
            rangeStart={rangeStart}
            rangeEnd={rangeEnd}
            habits={habitsForDay}
          />
        ),
        hoverContent: () => <CellHoverDisplay habits={habitsForDay} />,
      });
      d = addDays(d, 1, tzOffsetMinutes);
    }
    return list;
  }, [historyRes, today, tzOffsetMinutes]);

  return (
    <div>
      <div className="habit-history__header">
        <div className="habit-history__header-left">
          <Button
            type="tertiary"
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
          {historyRes ? (
            <div className="habit-history__filter-pills">
              {Object.entries(historyRes.habits).map(([habitId, habitName]) => (
                <Pill
                  key={habitId}
                  selected={habitIds.includes(habitId)}
                  className="text-b-m"
                  onToggle={(nextSelected) => setHabitFilterInUrl(habitId, nextSelected)}
                >
                  {habitName}
                </Pill>
              ))}
            </div>
          ) : (
            <h1 className="text-h-xl">{habitFilterKey || 'Habit'}</h1>
          )}
        </div>
        <DayNav
          className="habit-history__day-nav"
          date={effectiveDate}
          tzOffsetMinutes={tzOffsetMinutes}
          today={today}
          onChangeDate={setSelectedDateInUrl}
          showJumpToToday={showJumpToToday}
        />
      </div>

      <div className="habit-history">
        <div className="habit-history__calendar">
          <div className="card">
            <Calendar
              tzOffsetMinutes={tzOffsetMinutes}
              lastData={toDateKey(new Date(), tzOffsetMinutes)}
              firstDate={historyRes ? (historyRes.firstDate ?? today) : undefined}
              selectedDate={effectiveDate}
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
                      await patchHabit(
                        user,
                        { habit: habitForWidget.name, value: opt },
                        { date: effectiveDate },
                      );
                      await fetchHistory({ mode: 'refresh' });
                    }}
                    onClearSelection={async () => {
                      await patchHabit(
                        user,
                        { habit: habitForWidget.name, action: 'clear' },
                        { date: effectiveDate },
                      );
                      await fetchHistory({ mode: 'refresh' });
                    }}
                  />
                ) : (
                  <SummationWidget
                    key={habitForWidget.name}
                    user={user}
                    habit={habitForWidget}
                    dayKey={effectiveDate}
                    onAddAmount={async (delta) => {
                      await patchHabit(
                        user,
                        { habit: habitForWidget.name, total: delta },
                        { date: effectiveDate },
                      );
                      await fetchHistory({ mode: 'refresh' });
                    }}
                    onClearTotal={async () => {
                      await patchHabit(
                        user,
                        { habit: habitForWidget.name, action: 'clear' },
                        { date: effectiveDate },
                      );
                      await fetchHistory({ mode: 'refresh' });
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
