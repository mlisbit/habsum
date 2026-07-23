import { Link, useNavigate } from '@remix-run/react';
import type { MetaFunction } from '@remix-run/node';
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { dayFromString } from '@habsum/types/common/day';
import { getHabits, logout, patchHabit, type Habit, type HabitsResponse } from '~/api.client';
import { Footer } from '~/components/Footer';
import { TopNav } from '~/components/TopNav';
import HabitRenderer from '@habsum/habit-render';
import { Icon } from '@habsum/ui/components/Icon';
import { InfoText } from '@habsum/ui/components/InfoText';
import { useUser } from '~/context/user';
import { ensureUserSessionForRoute } from '~/utils/user-session-guard';
import { awaitOucPopupBootstrap, getOucSessionToken } from '~/ouc.client';
import { useTodayDateKey } from '~/utils/use-today-date-key';
import { getMediaQuerySnapshot, subscribeToMediaQuery } from '~/utils/media-query-store';
import { userPageTitle } from '~/utils/page-title';

export const meta: MetaFunction = ({ params }) => [{ title: userPageTitle(params.user) }];

function useWideHabitsLayout(): boolean {
  return useSyncExternalStore(
    (onStoreChange) => subscribeToMediaQuery('(min-width: 721px)', onStoreChange),
    () => getMediaQuerySnapshot('(min-width: 721px)'),
    () => true,
  );
}

type HabitsState = {
  user: string;
  page: HabitsResponse['page'];
  habits: Habit[];
};
const EMPTY_PAGE_PROGRESS: HabitsResponse['page']['progress'] = {
  percent: null,
  caption: 'No habits for this day',
  isComplete: false,
  ariaLabel: 'Day progress — no habits for this day',
};

function toListHabit(habit: Habit): Habit {
  if (habit.type === 'single_select') return habit;
  const { events: _events, ...details } = habit.details;
  return { ...habit, details };
}

function EmptyHabits({ user }: { user: string }) {
  return (
    <section className="habits-page__empty" aria-labelledby="habits-page-empty-heading">
      <div className="habits-page__empty-icon">
        <Icon name="pencil-sparkles" sizePx={40} />
      </div>
      <div className="habits-page__empty-copy">
        <h2 id="habits-page-empty-heading" className="text-h-l">
          Let’s build your first habit.
        </h2>
        <p className="text-light text-b-m">Add your first habit to start tracking today.</p>
      </div>
      <Link
        to={`/users/${encodeURIComponent(user)}/settings/habits?showAddModal=1`}
        className="button button--primary button--large habits-page__empty-add-habit"
      >
        Add your first habit
      </Link>
    </section>
  );
}

function NoHabitsForDay() {
  return (
    <div className="habits-page__stack">
      <p className="habits-page__no-day-habits text-light text-b-m">
        No habits to complete for this day.
      </p>
    </div>
  );
}

export default function HabitsPage() {
  const navigate = useNavigate();
  const { me, loading: userLoading, isNewUser, refresh: refreshUser } = useUser();
  const syncedEntitlementsAfterFirstActivityRef = useRef(false);
  const [user, setUser] = useState<string>('');
  // Source of truth: the URL. `null` means "today" (clean URL).
  const [urlDate, setUrlDate] = useState<string | null>(null);
  const [state, setState] = useState<HabitsState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const tzOffsetMinutes = useMemo(() => new Date().getTimezoneOffset(), []);
  const today = useTodayDateKey(tzOffsetMinutes);
  const effectiveDate = urlDate ?? today;
  const viewDate = dayFromString(effectiveDate);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const bootstrapped = await awaitOucPopupBootstrap();
      if (cancelled) return;
      if (window.opener && !bootstrapped && !getOucSessionToken()) {
        setError('Operate-under session failed to start.');
        return;
      }
    })();

    const syncFromUrl = () => {
      const q = new URLSearchParams(window.location.search);
      const raw = q.get('date');
      setUrlDate(raw && raw.length > 0 ? raw : null);
    };

    syncFromUrl();
    window.addEventListener('popstate', syncFromUrl);
    return () => {
      cancelled = true;
      window.removeEventListener('popstate', syncFromUrl);
    };
  }, []);

  useEffect(() => {
    if (userLoading) return;
    const match = window.location.pathname.match(/^\/users\/([^/]+)\/habits\/?$/);
    const routeUser = match ? decodeURIComponent(match[1]) : '';
    if (!routeUser) {
      setUser('');
      return;
    }
    if (!ensureUserSessionForRoute(routeUser, me, { navigate })) return;
    setUser(routeUser);
  }, [me, userLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    setError(null);
    getHabits(user, effectiveDate)
      .then((r) => {
        setState({
          user: r.user,
          page: r.page,
          habits: r.habits,
        });

        // Keep URL clean: don't include ?date= when it's today.
        const qs = new URLSearchParams(window.location.search);
        const hasDate = qs.has('date');
        if (effectiveDate === today && hasDate) {
          qs.delete('date');
          const nextUrl = qs.toString()
            ? `${window.location.pathname}?${qs.toString()}`
            : window.location.pathname;
          window.history.replaceState({}, '', nextUrl);
          setUrlDate(null);
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

  const refreshHabits = async () => {
    const refreshed = await getHabits(user, effectiveDate);
    setState({
      user: refreshed.user,
      page: refreshed.page,
      habits: refreshed.habits,
    });
  };

  const onHabitUpdated = (updated: Habit) => {
    setState((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        habits: prev.habits.map((x) =>
          x.name === updated.name ? toListHabit({ ...x, ...updated }) : x,
        ),
      };
    });
    if (isNewUser && !syncedEntitlementsAfterFirstActivityRef.current) {
      syncedEntitlementsAfterFirstActivityRef.current = true;
      void refreshUser();
    }
  };

  const wideTwoColumn = useWideHabitsLayout();

  function renderHabit(h: Habit) {
    return (
      <HabitRenderer
        key={h.name}
        user={state!.user}
        habit={h}
        viewDate={viewDate}
        LinkComponent={({ to, className, children }) => (
          <Link className={className} to={to}>
            {children}
          </Link>
        )}
        onNavigate={navigate}
        onUpdate={async (patch) => {
          const updated = await patchHabit(state!.user, patch, { date: effectiveDate });
          onHabitUpdated({ ...h, ...updated } as Habit);
          await refreshHabits();
        }}
      />
    );
  }

  return (
    <div className="habits-page">
      <TopNav
        heading={state?.page.heading ?? ''}
        subheader={state?.page.subheader ?? ''}
        effectiveDate={effectiveDate}
        tzOffsetMinutes={tzOffsetMinutes}
        firstDate={null}
        onChangeDate={goToDate}
        onBack={() => {
          void logout().then(() => window.location.assign('/login'));
        }}
        onSettings={() => navigate(`/users/${encodeURIComponent(user)}/settings/account`)}
        progress={state?.page.progress ?? EMPTY_PAGE_PROGRESS}
        hideDayNavigation={state?.page.showEmptyIntro === true}
      />

      {error ? (
        <InfoText size="small" variant="error">
          {error}
        </InfoText>
      ) : null}

      {!state ? (
        <p className="text-light text-b-m" aria-busy>
          Loading…
        </p>
      ) : state.habits.length === 0 ? (
        state.page.showEmptyIntro ? (
          <EmptyHabits user={state.user} />
        ) : (
          <NoHabitsForDay />
        )
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

      <Footer />
    </div>
  );
}
