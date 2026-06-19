import type { BarGraphData } from '@habsum/types/common/bar-chart';
import type { SummationEvent } from '@habsum/types/common/habit';

/** Column key / hover label for amounts logged off the habit row day (retroactive timestamps). */
export const AFTER_HOURS_BAR_KEY = 'after hours';

function hourFromCreatedAtTime(time: string): number | null {
  const m = time.match(/^(\d{1,2}):/);
  if (!m) return null;
  const h = Number(m[1]);
  if (!Number.isInteger(h) || h < 0 || h > 23) return null;
  return h;
}

function summationLocalHour(row: SummationEvent): number | null {
  const { day, time } = row.createdAt;
  if (!day || !time) return null;
  return hourFromCreatedAtTime(time);
}

function formatHourBucketLabel(hour: number): string {
  return new Date(2000, 0, 1, hour, 0, 0).toLocaleTimeString(undefined, {
    hour: 'numeric',
    hour12: true,
  });
}

function formatLocalHourRange(hour: number): string {
  const endHour = (hour + 1) % 24;
  const dtf = new Intl.DateTimeFormat(undefined, { hour: 'numeric', hour12: true });
  const partsFor = (h: number) => {
    const parts = dtf.formatToParts(new Date(2000, 0, 1, h, 0, 0));
    const hourVal = parts.find((p) => p.type === 'hour')?.value ?? '';
    const dayPeriod = parts.find((p) => p.type === 'dayPeriod')?.value;
    return { hourVal, dayPeriod };
  };
  const a = partsFor(hour);
  const b = partsFor(endHour);
  if (a.dayPeriod && b.dayPeriod && a.dayPeriod === b.dayPeriod) {
    return `${a.hourVal} – ${b.hourVal} ${b.dayPeriod}`;
  }
  if (a.dayPeriod && b.dayPeriod) {
    return `${a.hourVal} ${a.dayPeriod} – ${b.hourVal} ${b.dayPeriod}`;
  }
  const start = new Date(2000, 0, 1, hour, 0, 0);
  const end = new Date(2000, 0, 1, endHour, 0, 0);
  return `${dtf.format(start)} – ${dtf.format(end)}`;
}

function rowMatchesHabitDay(row: SummationEvent, dayKey: string): boolean {
  const d = row.createdAt.day;
  return d !== '' && d === dayKey;
}

export function redistributeNegativeSlices(slices: number[]): {
  adjusted: number[];
  negativeIndices: Set<number>;
} {
  const adjusted = [...slices];
  let changed = true;
  while (changed) {
    changed = false;
    for (let h = 0; h < adjusted.length; h++) {
      if (adjusted[h] >= 0) continue;
      let j = h - 1;
      while (j >= 0 && adjusted[j] <= 0) j--;
      if (j < 0) continue;
      adjusted[j] += adjusted[h];
      adjusted[h] = 0;
      changed = true;
    }
  }
  const negativeIndices = new Set<number>();
  for (let h = 0; h < adjusted.length; h++) {
    if (adjusted[h] < 0) negativeIndices.add(h);
  }
  return { adjusted, negativeIndices };
}

export function summationHourlyBarGraphData(rows: SummationEvent[], dayKey: string): BarGraphData {
  const rawHour = Array.from({ length: 24 }, () => 0);
  let rawAfterHours = 0;
  let hasRetroactive = false;

  for (const row of rows) {
    if (!rowMatchesHabitDay(row, dayKey)) {
      hasRetroactive = true;
      rawAfterHours += row.amount;
      continue;
    }
    const hour = summationLocalHour(row);
    if (hour == null) continue;
    rawHour[hour] += row.amount;
  }

  const rawSlices = hasRetroactive ? [...rawHour, rawAfterHours] : rawHour;
  const { adjusted, negativeIndices } = redistributeNegativeSlices(rawSlices);
  const top = Math.max(1, ...adjusted.map((v) => Math.max(0, v)));

  const data: BarGraphData = {};
  for (let h = 0; h < 24; h++) {
    data[formatHourBucketLabel(h)] = {
      value: adjusted[h]!,
      top,
      hoverLabel: formatLocalHourRange(h),
      ...(negativeIndices.has(h) ? { trackModifier: 'negative' as const } : {}),
    };
  }

  if (hasRetroactive) {
    const i = 24;
    data[AFTER_HOURS_BAR_KEY] = {
      value: adjusted[i]!,
      top,
      hoverLabel: AFTER_HOURS_BAR_KEY,
      ...(negativeIndices.has(i) ? { trackModifier: 'negative' as const } : {}),
    };
  }

  return data;
}
