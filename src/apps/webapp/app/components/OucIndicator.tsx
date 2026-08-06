import { useEffect, useMemo } from 'react';
import { logoutOuc } from '~/api.client';
import { useAuth } from '~/context/auth';
import {
  closeOucPopupWindow,
  getOucSessionToken,
  isOucSessionTokenPrefix,
  OUC_CHANGED_EVENT,
} from '~/ouc.client';

export function OucIndicator() {
  const { user, refresh } = useAuth();

  useEffect(() => {
    const onOucChanged = () => {
      void refresh();
    };
    window.addEventListener(OUC_CHANGED_EVENT, onOucChanged);
    return () => window.removeEventListener(OUC_CHANGED_EVENT, onOucChanged);
  }, [refresh]);

  const oucUser = useMemo(() => {
    if (typeof window === 'undefined') return null;
    if (!getOucSessionToken()) return null;
    if (user != null && isOucSessionTokenPrefix(user.sessionTokenPrefix)) {
      return user.username;
    }
    return null;
  }, [user]);

  if (!oucUser) return null;

  return (
    <div className="ouc-indicator" title={`Operating as ${oucUser}`}>
      <span className="ouc-indicator__label text-b-s">
        UOC <span className="ouc-indicator__username">{oucUser}</span>
      </span>
      <button
        type="button"
        className="ouc-indicator__dismiss text-dismiss-glyph"
        aria-label="End operate-under session"
        onClick={() => {
          void logoutOuc().finally(() => {
            closeOucPopupWindow();
          });
        }}
      >
        ×
      </button>
    </div>
  );
}
