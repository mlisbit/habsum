import { useMemo } from 'react';
import { Button } from '~/components/Button';
import { fromDateKey, toDateKey } from '@habsum/utils';

function addDays(dateKey: string, delta: number, tzOffsetMinutes: number) {
  const dt = fromDateKey(dateKey, tzOffsetMinutes);
  const next = new Date(dt.getTime() + delta * 86_400_000);
  return toDateKey(next, tzOffsetMinutes);
}

function diffDays(a: string, b: string, tzOffsetMinutes: number) {
  const da = fromDateKey(a, tzOffsetMinutes);
  const db = fromDateKey(b, tzOffsetMinutes);
  return Math.round((da.getTime() - db.getTime()) / 86_400_000);
}

function formatDayLabel(date: string, today: string, tzOffsetMinutes: number) {
  if (date === today) return 'Today';

  const currentYear = new Date().getFullYear();
  const d = fromDateKey(date, tzOffsetMinutes);
  const includeYear = d.getFullYear() !== currentYear;

  const fmt = new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    ...(includeYear ? { year: 'numeric' as const } : {}),
  });
  return fmt.format(d);
}

export function DayNav({
  date,
  firstDate,
  tzOffsetMinutes,
  onChangeDate,
}: {
  date: string;
  firstDate: string | null;
  tzOffsetMinutes: number;
  onChangeDate: (next: string) => void;
}) {
  const today = useMemo(() => toDateKey(new Date(), tzOffsetMinutes), [tzOffsetMinutes]);
  const label = useMemo(
    () => formatDayLabel(date, today, tzOffsetMinutes),
    [date, today, tzOffsetMinutes],
  );
  const prevDisabled = firstDate == null || date <= firstDate;
  const nextDisabled = date >= today;
  const showJumpToToday = Math.abs(diffDays(date, today, tzOffsetMinutes)) > 7;

  return (
    <div className="day-nav">
      <div>
        <div className="text-light text-b-m text-bold day-nav__label">{label}</div>
      </div>
      <div className="day-nav__right">
        <div className="day-nav__controls">
          <Button
            type="secondary"
            icon="chevronLeft"
            text="Prev"
            onClick={() => onChangeDate(addDays(date, -1, tzOffsetMinutes))}
            disabled={prevDisabled}
          />
          <Button
            type="secondary"
            icon="chevronRight"
            text="Next"
            onClick={() => onChangeDate(addDays(date, 1, tzOffsetMinutes))}
            disabled={nextDisabled}
          />
        </div>
        {showJumpToToday ? (
          <button
            type="button"
            className="day-nav__jump text-b-s text-light"
            onClick={() => onChangeDate(today)}
          >
            Jump to today
          </button>
        ) : null}
      </div>
    </div>
  );
}
