import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { MeGetResponse } from '@habsum/types/api-responses/me-get';
import { ProductEntitlement } from '@habsum/types/common/entitlement';
import { getAuthMe } from '~/api.client';
import { syncTheme } from '~/theme.client';
import { isMeLoggedIn } from '~/utils/user-session-guard';

const LOGGED_OUT_ME: MeGetResponse = {
  username: null,
  displayName: null,
  theme: null,
  email: null,
  createdAt: null,
  entitlements: [],
};

type UserContextValue = {
  me: MeGetResponse;
  loading: boolean;
  /** Re-fetches `GET /users/me` (e.g. after the user logs their first habit event). */
  refresh: () => Promise<void>;
  isNewUser: boolean;
  /** Whether this account has dismissed the new-user intro toast this app session. */
  hasDismissedIntro: boolean;
  /** Records intro dismissal for the signed-in user. */
  dismissIntro: () => void;
};

const UserContext = createContext<UserContextValue | null>(null);

export function UserProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<MeGetResponse>(LOGGED_OUT_ME);
  const [loading, setLoading] = useState(true);
  const [introDismissedByUser, setIntroDismissedByUser] = useState<Record<string, boolean>>({});
  const refreshInFlightRef = useRef<Promise<void> | null>(null);

  const refresh = useCallback(async () => {
    if (refreshInFlightRef.current) return refreshInFlightRef.current;

    const run = (async () => {
      try {
        const next = await getAuthMe();
        setMe(next);
      } catch {
        setMe(LOGGED_OUT_ME);
      } finally {
        setLoading(false);
      }
    })();

    refreshInFlightRef.current = run;
    try {
      await run;
    } finally {
      if (refreshInFlightRef.current === run) refreshInFlightRef.current = null;
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (loading) return;
    const theme = isMeLoggedIn(me) ? me.theme : null;
    syncTheme(theme);
    if (theme != null) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => syncTheme(null);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [me, loading]);

  const hasDismissedIntro = useMemo(
    () => (isMeLoggedIn(me) ? introDismissedByUser[me.username] === true : false),
    [me, introDismissedByUser],
  );

  const dismissIntro = useCallback(() => {
    if (!isMeLoggedIn(me)) return;
    setIntroDismissedByUser((prev) =>
      prev[me.username] ? prev : { ...prev, [me.username]: true },
    );
  }, [me]);

  const isNewUser = useMemo(
    () => isMeLoggedIn(me) && me.entitlements.includes(ProductEntitlement.NEW_USER),
    [me],
  );

  const value = useMemo(
    () => ({ me, loading, refresh, isNewUser, hasDismissedIntro, dismissIntro }),
    [me, loading, refresh, isNewUser, hasDismissedIntro, dismissIntro],
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser must be used within UserProvider');
  return ctx;
}
