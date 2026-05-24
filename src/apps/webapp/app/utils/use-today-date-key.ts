import { useEffect, useState } from 'react';
import { toDateKey } from '@habsum/utils';
import { msUntilNextLocalDay } from '~/utils/date-utils';

/** Live “today” date key that advances at local midnight. */
export function useTodayDateKey(tzOffsetMinutes: number): string {
  const [today, setToday] = useState(() => toDateKey(new Date(), tzOffsetMinutes));

  useEffect(() => {
    let timeoutId: number | undefined;

    const sync = () => {
      const next = toDateKey(new Date(), tzOffsetMinutes);
      setToday((prev) => (prev === next ? prev : next));
    };

    const schedule = () => {
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(
        () => {
          sync();
          schedule();
        },
        msUntilNextLocalDay(tzOffsetMinutes) + 50,
      );
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') sync();
    };

    schedule();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [tzOffsetMinutes]);

  return today;
}
