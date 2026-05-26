import { Link } from '@remix-run/react';
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
import { Icon, type IconName } from '~/core-components/Icon';
import { classBuilder } from '~/utils/class-builder';

export type ToastType = 'error' | 'success' | 'info';

export type ShowToastOptions = {
  message: string;
  type: ToastType;
  /** Optional heading above the message. */
  title?: string;
  /** Icon shown beside `title` when set. */
  titleIcon?: IconName;
  /** When true, the toast stays until the user dismisses it (no auto-hide timer). */
  persistent?: boolean;
  /** Inline link label shown immediately after `message`. */
  ctaTitle?: string;
  /** Route path for the inline CTA (e.g. `/users/foo/settings/config`). */
  ctaLocation?: string;
  /** Called when the toast is dismissed (button or replaced by another toast). */
  onDismiss?: () => void;
};

export const SERVER_CONNECTION_ERROR_TOAST: ShowToastOptions = {
  type: 'error',
  message: 'Error connecting to server',
};

type ToastContextValue = {
  showToast: (options: ShowToastOptions) => void;
  dismissToast: () => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<ShowToastOptions | null>(null);
  const timeoutRef = useRef<number | null>(null);

  const dismissToast = useCallback(() => {
    if (timeoutRef.current != null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setActive((current) => {
      current?.onDismiss?.();
      return null;
    });
  }, []);

  const showToast = useCallback(
    (options: ShowToastOptions) => {
      if (timeoutRef.current != null) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setActive((current) => {
        current?.onDismiss?.();
        return options;
      });
      if (!options.persistent) {
        timeoutRef.current = window.setTimeout(dismissToast, 6500);
      }
    },
    [dismissToast],
  );

  useEffect(() => {
    return () => {
      if (timeoutRef.current != null) window.clearTimeout(timeoutRef.current);
    };
  }, []);

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
              },
              'toast',
            )}
            role={active.type === 'error' ? 'alert' : 'status'}
            aria-labelledby={active.title ? 'toast-title' : undefined}
          >
            <div className="toast__content">
              {active.title ? (
                <div className="toast__header">
                  {active.titleIcon ? (
                    <Icon
                      name={active.titleIcon}
                      size="large"
                      sizePx={20}
                      className="toast__title-icon"
                    />
                  ) : null}
                  <p id="toast-title" className="toast__title text-h-s">
                    {active.title}
                  </p>
                </div>
              ) : null}
              <p
                className={[
                  'toast__message',
                  'text-b-m',
                  active.type === 'error' ? 'text-error' : null,
                  active.type === 'success' ? 'text-success' : null,
                  active.title ? 'text-light' : null,
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                {active.message}
                {active.ctaTitle && active.ctaLocation ? (
                  <>
                    {' '}
                    <Link to={active.ctaLocation} className="toast__cta" onClick={dismissToast}>
                      {active.ctaTitle}
                    </Link>
                  </>
                ) : null}
              </p>
            </div>
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
