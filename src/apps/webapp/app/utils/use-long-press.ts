import type { ButtonHTMLAttributes } from 'react';
import { useCallback, useRef } from 'react';

const DEFAULT_MS = 500;

type PointerBag = Pick<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'onPointerDown' | 'onPointerUp' | 'onPointerCancel' | 'onPointerLeave' | 'onContextMenu'
>;

/** Primary-button / touch long-press; suppresses the following click when long-press fires. */
export function useLongPress(
  onLongPress: (() => void) | undefined,
  options?: { ms?: number },
): {
  pointerProps: Partial<PointerBag>;
  wrapOnClick: <Args extends unknown[], R>(fn: (...args: Args) => R) => (...args: Args) => R | void;
} {
  const ms = options?.ms ?? DEFAULT_MS;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressFiredRef = useRef(false);
  const cbRef = useRef(onLongPress);
  cbRef.current = onLongPress;

  const clearTimer = useCallback(() => {
    if (timerRef.current != null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  if (!onLongPress) {
    return {
      pointerProps: {},
      wrapOnClick: (fn) => fn,
    };
  }

  const pointerProps: Partial<PointerBag> = {
    onPointerDown: (e) => {
      if (e.button !== 0) return;
      longPressFiredRef.current = false;
      clearTimer();
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        longPressFiredRef.current = true;
        cbRef.current?.();
      }, ms);
    },
    onPointerUp: clearTimer,
    onPointerCancel: clearTimer,
    onPointerLeave: clearTimer,
    onContextMenu: (e) => {
      e.preventDefault();
    },
  };

  const wrapOnClick =
    <Args extends unknown[], R>(fn: (...args: Args) => R) =>
    (...args: Args) => {
      if (longPressFiredRef.current) {
        longPressFiredRef.current = false;
        return;
      }
      return fn(...args);
    };

  return { pointerProps, wrapOnClick };
}
