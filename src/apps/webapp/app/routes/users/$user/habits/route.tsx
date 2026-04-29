import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { getHabits, patchHabit, type Habit } from '~/api.client';
import { TopNav } from '~/components/TopNav';
import { SingleSelectWidget, SummationWidget } from '~/components/widgets';
import { clearSelectedUser } from '~/cookies.client';
import { getProgress } from '~/utils/habit-helpers';
import { toDateKey } from '@habsum/utils';

function useWideHabitsLayout(): boolean {
  return useSyncExternalStore(
    (onStoreChange) => {
      const mq = window.matchMedia('(min-width: 721px)');
      mq.addEventListener('change', onStoreChange);
      return () => mq.removeEventListener('change', onStoreChange);
    },
    () => window.matchMedia('(min-width: 721px)').matches,
    () => true,
  );
}

type HabitsState = { user: string; habits: Habit[] };

export default function HabitsPage() {
  const [user, setUser] = useState<string>('');
  // Source of truth: the URL. `null` means "today" (clean URL).
  const [urlDate, setUrlDate] = useState<string | null>(null);
  const [firstDate, setFirstDate] = useState<string | null>(null);
  const [state, setState] = useState<HabitsState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const tzOffsetMinutes = useMemo(() => new Date().getTimezoneOffset(), []);
  const today = useMemo(() => toDateKey(new Date(), tzOffsetMinutes), [tzOffsetMinutes]);
  const effectiveDate = urlDate ?? today;

  useEffect(() => {
    const match = window.location.pathname.match(/^\/users\/([^/]+)\/habits\/?$/);
    setUser(match ? decodeURIComponent(match[1]) : '');

    const syncFromUrl = () => {
      const q = new URLSearchParams(window.location.search);
      setUrlDate(q.get('date'));
    };

    syncFromUrl();
    window.addEventListener('popstate', syncFromUrl);
    return () => window.removeEventListener('popstate', syncFromUrl);
  }, []);

  useEffect(() => {
    if (!user) return;
    setError(null);
    getHabits(user, effectiveDate)
      .then((r) => {
        setFirstDate(r.firstDate);
        setState({ user: r.user, habits: r.habits });

        // Keep URL clean: don't include ?date= when it's today.
        const qs = new URLSearchParams(window.location.search);
        const hasDate = qs.has('date');
        if (effectiveDate === today && hasDate) {
          qs.delete('date');
          const nextUrl = qs.toString()
            ? `${window.location.pathname}?${qs.toString()}`
            : window.location.pathname;
          window.history.replaceState({}, '', nextUrl);
        }
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, [user, effectiveDate, today]);

  const goToDate = (next: string) => {
    const qs = new URLSearchParams(window.location.search);
    if (next === today) qs.delete('date');
    else qs.set('date', next);

    const nextUrl = qs.toString()
      ? `${window.location.pathname}?${qs.toString()}`
      : window.location.pathname;
    window.history.pushState({}, '', nextUrl);
    setUrlDate(next === today ? null : next);
  };

  const onHabitUpdated = (updated: Habit) => {
    setState((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        habits: prev.habits.map((x) => (x.name === updated.name ? { ...x, ...updated } : x)),
      };
    });
  };

  const wideTwoColumn = useWideHabitsLayout();
  const dayProgress = useMemo(() => getProgress(state?.habits ?? []), [state?.habits]);

  function renderHabit(h: Habit) {
    if (h.type === 'single_select') {
      return (
        <SingleSelectWidget
          key={h.name}
          user={state!.user}
          habit={h}
          onSelectOption={async (opt) => {
            const updated = await patchHabit(
              state!.user,
              { habit: h.name, value: opt },
              { date: effectiveDate },
            );
            onHabitUpdated({ ...h, ...updated, value: opt } as Habit);
          }}
        />
      );
    }
    return (
      <SummationWidget
        key={h.name}
        user={state!.user}
        habit={h}
        onAddAmount={async (delta) => {
          const updated = await patchHabit(
            state!.user,
            { habit: h.name, total: delta },
            { date: effectiveDate },
          );
          onHabitUpdated({ ...h, ...updated } as Habit);
        }}
      />
    );
  }

  return (
    <div className="container container--wide habits-page">
      <TopNav
        username={user}
        effectiveDate={effectiveDate}
        tzOffsetMinutes={tzOffsetMinutes}
        firstDate={firstDate}
        onChangeDate={goToDate}
        onBack={() => {
          clearSelectedUser();
          window.location.assign('/users');
        }}
        onSettings={() =>
          window.location.assign(`/users/${encodeURIComponent(user)}/settings/account`)
        }
        progress={dayProgress}
      />

      {error ? <p className="warn text-b-s">{error}</p> : null}

      {!state ? (
        <p className="text-light text-b-m" aria-busy>
          Loading…
        </p>
      ) : state.habits.length === 0 ? (
        <p className="text-light text-b-m">No habits configured.</p>
      ) : wideTwoColumn ? (
        <div className="habits-page__columns">
          <div className="habits-page__column">
            {state.habits.filter((_h, i) => i % 2 === 0).map((h) => renderHabit(h))}
          </div>
          <div className="habits-page__column">
            {state.habits.filter((_h, i) => i % 2 === 1).map((h) => renderHabit(h))}
          </div>
        </div>
      ) : (
        <div className="habits-page__stack">{state.habits.map((h) => renderHabit(h))}</div>
      )}
    </div>
  );
}
