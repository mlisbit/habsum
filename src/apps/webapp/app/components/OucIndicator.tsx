import { useCallback, useEffect, useState } from 'react';
import { useLocation } from '@remix-run/react';
import { getAuthMe, logoutOuc } from '~/api.client';
import {
  closeOucPopupWindow,
  getOucSessionToken,
  isOucSessionTokenPrefix,
  OUC_CHANGED_EVENT,
} from '~/ouc.client';

export function OucIndicator() {
  const location = useLocation();
  const [oucUser, setOucUser] = useState<string | null>(null);

  const refresh = useCallback(() => {
    if (!getOucSessionToken()) {
      setOucUser(null);
      return;
    }

    getAuthMe()
      .then((me) => {
        if (
          me.username != null &&
          'sessionTokenPrefix' in me &&
          isOucSessionTokenPrefix(me.sessionTokenPrefix)
        ) {
          setOucUser(me.username);
        } else {
          setOucUser(null);
        }
      })
      .catch(() => setOucUser(null));
  }, []);

  useEffect(() => {
    refresh();
    window.addEventListener(OUC_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(OUC_CHANGED_EVENT, refresh);
  }, [refresh, location.pathname]);

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
            setOucUser(null);
            closeOucPopupWindow();
          });
        }}
      >
        ×
      </button>
    </div>
  );
}
