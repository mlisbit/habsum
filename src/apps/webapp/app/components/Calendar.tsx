import { useEffect, useMemo, useState } from "react";
import { Button } from "~/components/Button";
import { Hover, type HoverPanelSide } from "~/components/Hover";
import { fromDateKey, toDateKey } from "@habsum/utils";

export type CalendarCellInfo = {
  date: string; // YYYY-MM-DD (UTC)
  inCurrentMonth: boolean;
  isToday: boolean;
};

export type CalendarCellRender = (info: CalendarCellInfo) => React.ReactNode;

export type CalendarDataRender = {
  date: string; // YYYY-MM-DD (UTC)
  callRender: CalendarCellRender;
  /** When set, the day cell is wrapped with `Hover` and this renders in the floating panel. */
  hoverContent?: (info: CalendarCellInfo) => React.ReactNode;
};

function startOfMonth(dateKey: string, tzOffsetMinutes: number) {
  const d = fromDateKey(dateKey, tzOffsetMinutes);
  const local = new Date(d.getTime() - tzOffsetMinutes * 60_000);
  local.setUTCHours(0, 0, 0, 0);
  local.setUTCDate(1);
  return toDateKey(new Date(local.getTime() + tzOffsetMinutes * 60_000), tzOffsetMinutes);
}

function addMonths(dateKey: string, delta: number, tzOffsetMinutes: number) {
  const d = fromDateKey(dateKey, tzOffsetMinutes);
  const local = new Date(d.getTime() - tzOffsetMinutes * 60_000);
  local.setUTCHours(0, 0, 0, 0);
  local.setUTCMonth(local.getUTCMonth() + delta, 1);
  return toDateKey(new Date(local.getTime() + tzOffsetMinutes * 60_000), tzOffsetMinutes);
}

function addDays(dateKey: string, delta: number, tzOffsetMinutes: number) {
  const d = fromDateKey(dateKey, tzOffsetMinutes);
  const next = new Date(d.getTime() + delta * 86_400_000);
  return toDateKey(next, tzOffsetMinutes);
}

function weekday(dateKey: string, tzOffsetMinutes: number) {
  const d = fromDateKey(dateKey, tzOffsetMinutes);
  const local = new Date(d.getTime() - tzOffsetMinutes * 60_000);
  return local.getUTCDay();
}

function getMonthLabel(monthStartDateKey: string, tzOffsetMinutes: number) {
  const d = fromDateKey(monthStartDateKey, tzOffsetMinutes);
  const fmt = new Intl.DateTimeFormat(undefined, {
    month: "long",
    year: "numeric",
  });
  return fmt.format(d);
}

function buildCalendarGrid({
  monthStart,
  weekStartsOn,
  tzOffsetMinutes,
}: {
  monthStart: string; // YYYY-MM-01
  weekStartsOn: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  tzOffsetMinutes: number;
}) {
  const start = (() => {
    // Find the first cell date (backtrack to weekStartsOn)
    const wd = weekday(monthStart, tzOffsetMinutes); // 0..6
    const deltaBack = (wd - weekStartsOn + 7) % 7;
    return addDays(monthStart, -deltaBack, tzOffsetMinutes);
  })();

  // Always render a 6-week grid (42 days) for stable layout
  const days: string[] = [];
  for (let i = 0; i < 42; i++) days.push(addDays(start, i, tzOffsetMinutes));
  return days;
}

function getWeekdayLabels(weekStartsOn: number, tzOffsetMinutes: number) {
  // Use a fixed week with Monday 2023-01-02 and iterate; label in user's locale.
  const baseMonday = "2023-01-02";
  const fmt = new Intl.DateTimeFormat(undefined, { weekday: "short" });
  const labels: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = addDays(baseMonday, i, tzOffsetMinutes);
    labels.push(fmt.format(fromDateKey(d, tzOffsetMinutes)));
  }
  // Rotate to match weekStartsOn
  const rotate = (labels: string[], n: number) =>
    labels.slice(n).concat(labels.slice(0, n));
  // baseMonday labels are Monday-first; convert to Sunday-first index then rotate
  // mondayFirstIndex: Mon=0..Sun=6, but weekStartsOn is Sun=0..Sat=6
  const mondayFirstToSundayFirst = (day: number) => (day === 0 ? 6 : day - 1);
  const startIdxInMondayFirst = mondayFirstToSundayFirst(weekStartsOn);
  return rotate(labels, startIdxInMondayFirst);
}

export function Calendar({
  initialMonth,
  weekStartsOn = 1,
  tzOffsetMinutes,
  lastData,
  firstDate,
  selectedDate,
  onDaySelect,
  dataRenders = [],
  greyOutDaysWithoutData = false,
  /** Where the day hover panel opens when `hoverContent` is used. */
  hoverPanelSide = "top",
}: {
  initialMonth?: string; // any YYYY-MM-DD in target month (UTC)
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  tzOffsetMinutes: number;
  lastData?: string; // YYYY-MM-DD (UTC). Dates after this are future/disabled.
  firstDate?: string; // YYYY-MM-DD (UTC). Dates before this are disabled.
  selectedDate?: string; // YYYY-MM-DD (UTC). Highlighted day cell.
  onDaySelect?: (date: string) => void;
  dataRenders?: CalendarDataRender[];
  /** When true, in-range days with no `dataRenders` entry look muted (e.g. habit history). */
  greyOutDaysWithoutData?: boolean;
  hoverPanelSide?: HoverPanelSide;
}) {
  const today = useMemo(
    () => toDateKey(new Date(), tzOffsetMinutes),
    [tzOffsetMinutes]
  );
  const maxDate = lastData ?? today;
  const maxMonthStart = useMemo(
    () => startOfMonth(maxDate, tzOffsetMinutes),
    [maxDate, tzOffsetMinutes]
  );
  const minMonthStart = useMemo(
    () => (firstDate ? startOfMonth(firstDate, tzOffsetMinutes) : null),
    [firstDate, tzOffsetMinutes]
  );
  const [monthStart, setMonthStart] = useState(() => {
    const base = selectedDate ?? initialMonth ?? today;
    return startOfMonth(base, tzOffsetMinutes);
  });

  // Keep the visible month in sync with the URL-selected date.
  // We intentionally do NOT clamp/override the selected date; it stays the source of truth.
  useEffect(() => {
    const base = selectedDate ?? initialMonth ?? today;
    setMonthStart(startOfMonth(base, tzOffsetMinutes));
  }, [selectedDate, initialMonth, today, tzOffsetMinutes]);

  const weekdayLabels = useMemo(
    () => getWeekdayLabels(weekStartsOn, tzOffsetMinutes),
    [weekStartsOn, tzOffsetMinutes]
  );

  const metaByDate = useMemo(() => {
    const m = new Map<
      string,
      { callRender: CalendarCellRender; hoverContent?: CalendarDataRender["hoverContent"] }
    >();
    for (const r of dataRenders)
      m.set(r.date, { callRender: r.callRender, hoverContent: r.hoverContent });
    return m;
  }, [dataRenders]);

  const days = useMemo(
    () => buildCalendarGrid({ monthStart, weekStartsOn, tzOffsetMinutes }),
    [monthStart, weekStartsOn, tzOffsetMinutes]
  );

  const monthLabel = useMemo(
    () => getMonthLabel(monthStart, tzOffsetMinutes),
    [monthStart, tzOffsetMinutes]
  );
  const nextDisabled =
    addMonths(monthStart, 1, tzOffsetMinutes) > maxMonthStart;
  const prevDisabled = minMonthStart
    ? addMonths(monthStart, -1, tzOffsetMinutes) < minMonthStart
    : false;

  return (
    <section className="calendar" aria-label="Calendar">
      <div className="calendar__header">
        <div className="calendar__title">{monthLabel}</div>
        <div className="calendar__controls">
          <Button
            type="secondary"
            icon="chevronLeft"
            circle
            text=""
            aria-label="Previous month"
            title="Previous month"
            onClick={() =>
              setMonthStart((m) => {
                const next = addMonths(m, -1, tzOffsetMinutes);
                if (minMonthStart && next < minMonthStart) return minMonthStart;
                return next;
              })
            }
            disabled={prevDisabled}
          />
          <Button
            type="secondary"
            icon="chevronRight"
            circle
            text=""
            aria-label="Next month"
            title="Next month"
            onClick={() =>
              setMonthStart((m) => {
                const next = addMonths(m, 1, tzOffsetMinutes);
                if (next > maxMonthStart) return maxMonthStart;
                return next;
              })
            }
            disabled={nextDisabled}
          />
        </div>
      </div>

      <div className="calendar__weekdays" aria-hidden>
        {weekdayLabels.map((w) => (
          <div key={w} className="calendar__weekday">
            {w}
          </div>
        ))}
      </div>

      <div className="calendar__grid" role="grid">
        {days.map((date) => {
          const inCurrentMonth = date.slice(0, 7) === monthStart.slice(0, 7);
          const isToday = date === today;
          const isFuture = date > maxDate;
          const isBefore = firstDate != null && date < firstDate;
          const isSelected = selectedDate != null && date === selectedDate;
          const isClickable = !isFuture && !isBefore && onDaySelect != null;
          const hasDataMarker =
            !isFuture && !isBefore && metaByDate.has(date);
          const isNoDataMuted =
            greyOutDaysWithoutData && isClickable && !hasDataMarker;
          const dayNumber = Number(date.slice(8, 10));
          const meta = isFuture || isBefore ? undefined : metaByDate.get(date);
          const maybe = meta?.callRender;
          const hoverBody = meta?.hoverContent;
          const cellInfo: CalendarCellInfo = { date, inCurrentMonth, isToday };

          const cellClassName = [
            "calendar__cell",
            !inCurrentMonth && "calendar__cell--outside",
            isToday && "calendar__cell--today",
            isFuture && "calendar__cell--future",
            isBefore && "calendar__cell--before",
            isNoDataMuted && "calendar__cell--noData",
            isSelected && "calendar__cell--selected",
            isClickable && "calendar__cell--clickable",
          ]
            .filter(Boolean)
            .join(" ");

          const cellBody = (
            <>
              <div className="calendar__dayNumber">{dayNumber}</div>
              <div className="calendar__cellContent">
                {maybe ? maybe(cellInfo) : null}
              </div>
            </>
          );

          if (hoverBody) {
            return (
              <Hover.Root key={date}>
                <Hover.Anchor
                  className={cellClassName}
                  role="gridcell"
                  aria-label={date}
                  data-date={date}
                  aria-disabled={(isFuture || isBefore) || undefined}
                  aria-selected={isSelected || undefined}
                  onClick={
                    isClickable
                      ? () => {
                          onDaySelect(date);
                        }
                      : undefined
                  }
                >
                  {cellBody}
                </Hover.Anchor>
                <Hover.Content className="calendar__hoverable" side={hoverPanelSide}>
                  {hoverBody(cellInfo)}
                </Hover.Content>
              </Hover.Root>
            );
          }

          return (
            <div
              key={date}
              className={cellClassName}
              role="gridcell"
              aria-label={date}
              data-date={date}
              aria-disabled={(isFuture || isBefore) || undefined}
              aria-selected={isSelected || undefined}
              onClick={
                isClickable
                  ? () => {
                      onDaySelect(date);
                    }
                  : undefined
              }
            >
              {cellBody}
            </div>
          );
        })}
      </div>
    </section>
  );
}

