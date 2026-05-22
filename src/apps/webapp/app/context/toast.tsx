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
import { classBuilder } from '~/utils/class-builder';

export type ToastType = 'error' | 'success' | 'info' | 'notification';

export type ShowToastOptions = {
  message: string;
  type: ToastType;
};

/** Shown after redirect from a user URL when the session is missing or does not match that user. */
export const LOGIN_TOAST_USER_AREA: ShowToastOptions = {
  type: 'error',
  message: 'Sign in to access this account.',
};

export const SERVER_CONNECTION_ERROR_TOAST: ShowToastOptions = {
  type: 'error',
  message: 'Error connecting to server',
};

const PENDING_LOGIN_TOAST_KEY = 'habsum:pendingLoginToast';

type ToastContextValue = {
  showToast: (options: ShowToastOptions) => void;
  dismissToast: () => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

function isToastPayload(value: unknown): value is ShowToastOptions {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.message === 'string' &&
    v.message.length > 0 &&
    (v.type === 'error' || v.type === 'success' || v.type === 'info' || v.type === 'notification')
  );
}

/** Stores a toast for the next full-page load of `/login`, then redirects there. */
export function redirectToLoginWithToast(options: ShowToastOptions): void {
  try {
    sessionStorage.setItem(PENDING_LOGIN_TOAST_KEY, JSON.stringify(options));
  } catch {
    // ignore quota / private mode
  }
  window.location.replace('/login');
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<ShowToastOptions | null>(null);
  const timeoutRef = useRef<number | null>(null);

  const dismissToast = useCallback(() => {
    if (timeoutRef.current != null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setActive(null);
  }, []);

  const showToast = useCallback(
    (options: ShowToastOptions) => {
      if (timeoutRef.current != null) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setActive(options);
      timeoutRef.current = window.setTimeout(dismissToast, 6500);
    },
    [dismissToast],
  );

  useEffect(() => {
    return () => {
      if (timeoutRef.current != null) window.clearTimeout(timeoutRef.current);
    };
  }, []);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(PENDING_LOGIN_TOAST_KEY);
      if (!raw) return;
      sessionStorage.removeItem(PENDING_LOGIN_TOAST_KEY);
      const parsed: unknown = JSON.parse(raw);
      if (isToastPayload(parsed)) showToast(parsed);
    } catch {
      sessionStorage.removeItem(PENDING_LOGIN_TOAST_KEY);
    }
  }, [showToast]);

  const value = useMemo(() => ({ showToast, dismissToast }), [showToast, dismissToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {active ? (
        <div
          className="toast__viewport"
          aria-live={active.type === 'error' ? 'assertive' : 'polite'}
        >
          <div
            className={classBuilder(
              {
                'toast--error': active.type === 'error',
                'toast--success': active.type === 'success',
                'toast--info': active.type === 'info',
                'toast--notification': active.type === 'notification',
              },
              'toast',
            )}
            role={active.type === 'error' ? 'alert' : 'status'}
          >
            <p
              className={[
                'toast__message',
                'text-b-m',
                active.type === 'error' ? 'text-error' : null,
                active.type === 'success' ? 'text-success' : null,
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {active.message}
            </p>
            <button
              type="button"
              className="toast__dismiss text-dismiss-glyph"
              aria-label="Dismiss notification"
              onClick={dismissToast}
            >
              ×
            </button>
          </div>
        </div>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
