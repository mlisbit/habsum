import { useEffect } from 'react';
import { loginWithOucToken } from '~/api.client';
import { installOucPopupListener, setOucSessionToken } from '~/ouc.client';

/** Accepts operate-under tokens from the opener window in OUC popups. */
export function OucPopupBootstrap() {
  useEffect(() => {
    return installOucPopupListener(async (token, user) => {
      const res = await loginWithOucToken(token);
      if (res.user !== user) {
        throw new Error('Token user mismatch.');
      }
      setOucSessionToken(token);
    });
  }, []);

  return null;
}
