import { Link, useNavigate } from '@remix-run/react';
import type { MetaFunction } from '@remix-run/node';
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { dayFromString } from '@habsum/types/common/day';
import { getHabits, logout, patchHabit, type Habit } from '~/api.client';
import { Footer } from '~/components/Footer';
import { TopNav } from '~/components/TopNav';
import HabitRenderer from '@habsum/habit-render';
import { InfoText } from '@habsum/ui/components/InfoText';
import { useToast } from '@habsum/ui/contexts/toast';
import { useUser } from '~/context/user';
import { ensureUserSessionForRoute } from '~/utils/user-session-guard';
import { awaitOucPopupBootstrap, getOucSessionToken } from '~/ouc.client';
import { useTodayDateKey } from '~/utils/use-today-date-key';
import { getProgress } from '~/utils/habit-helpers';
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

type HabitsState = { user: string; habits: Habit[] };

function toListHabit(habit: Habit): Habit {
  if (habit.type === 'single_select') return habit;
  const { events: _events, ...listHabit } = habit;
  return listHabit;
}

export default function HabitsPage() {
  const navigate = useNavigate();
  const { showToast, dismissToast } = useToast();
  const {
    me,
    loading: userLoading,
    isNewUser,
    hasDismissedIntro,
    dismissIntro,
    refresh: refreshUser,
  } = useUser();
  const introToastOfferedRef = useRef(false);
  const syncedEntitlementsAfterFirstActivityRef = useRef(false);
  const [user, setUser] = useState<string>('');
  // Source of truth: the URL. `null` means "today" (clean URL).
  const [urlDate, setUrlDate] = useState<string | null>(null);
  const [firstDate, setFirstDate] = useState<string | null>(null);
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
    introToastOfferedRef.current = false;
  }, [user]);

  useEffect(() => {
    if (userLoading || !isNewUser || !user || hasDismissedIntro || introToastOfferedRef.current) {
      return;
    }
    introToastOfferedRef.current = true;
    showToast({
      type: 'info',
      title: 'Welcome to Habsum!',
      titleIcon: 'hand',
      message: 'We added a few example habits to help you get started.',
      persistent: true,
      ctaTitle: 'Customize habits',
      ctaLocation: `/users/${encodeURIComponent(user)}/settings/config`,
      onDismiss: dismissIntro,
    });
  }, [userLoading, isNewUser, user, hasDismissedIntro, showToast, dismissIntro]);

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
      dismissToast();
      void refreshUser();
    }
  };

  const wideTwoColumn = useWideHabitsLayout();
  const dayProgress = useMemo(() => getProgress(state?.habits ?? []), [state?.habits]);

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
        }}
      />
    );
  }

  return (
    <div className="habits-page">
      <TopNav
        username={user}
        displayName={me.username === user ? me.displayName : null}
        effectiveDate={effectiveDate}
        tzOffsetMinutes={tzOffsetMinutes}
        firstDate={firstDate}
        onChangeDate={goToDate}
        onBack={() => {
          void logout().then(() => window.location.assign('/login'));
        }}
        onSettings={() => navigate(`/users/${encodeURIComponent(user)}/settings/account`)}
        progress={dayProgress}
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

      {state && user ? (
        <Link
          to={`/users/${encodeURIComponent(user)}/settings/config?showAddModal=1`}
          className="button button--secondary button--medium habits-page__add-habit"
        >
          Add habit
        </Link>
      ) : null}

      <Footer />
    </div>
  );
}
