import { createContext, useCallback, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { useRevalidator } from 'react-router';
import type { MeGetLoggedIn, MeGetResponse } from '@habsum/types/api-responses/me-get';
import { ProductEntitlement } from '@habsum/types/common/entitlement';
import { loginUser, logout } from '~/api.client';
import { syncTheme } from '~/theme.client';
import { isMeLoggedIn } from '~/utils/user-session-guard';

type AuthContextValue = {
  status: 'authenticated' | 'anonymous';
  user: MeGetLoggedIn | null;
  signIn: (loginId: string, password: string) => ReturnType<typeof loginUser>;
  signOut: () => Promise<void>;
  /** Revalidates the root auth loader after account or entitlement changes. */
  refresh: () => Promise<void>;
  isNewUser: boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({
  children,
  me,
  onResolution,
}: {
  children: ReactNode;
  me: MeGetResponse;
  onResolution?: (me: MeGetResponse) => void;
}) {
  const { revalidate } = useRevalidator();
  const user = isMeLoggedIn(me) ? me : null;

  const refresh = useCallback(async () => {
    await revalidate();
  }, [revalidate]);

  const signIn = useCallback(
    async (loginId: string, password: string) => {
      const response = await loginUser(loginId, password);
      await refresh();
      return response;
    },
    [refresh],
  );

  const signOut = useCallback(async () => {
    await logout();
    await refresh();
  }, [refresh]);

  useEffect(() => {
    onResolution?.(me);
  }, [me, onResolution]);

  useEffect(() => {
    syncTheme(user?.theme ?? null);
    if (user?.theme != null) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => syncTheme(null);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [user?.theme]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status: user ? 'authenticated' : 'anonymous',
      user,
      signIn,
      signOut,
      refresh,
      isNewUser: user?.entitlements.includes(ProductEntitlement.NEW_USER) ?? false,
    }),
    [user, signIn, signOut, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
