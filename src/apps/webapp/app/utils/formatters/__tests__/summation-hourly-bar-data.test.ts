import { describe, expect, it } from 'vitest';

import type { SummationEvent } from '@habsum/api-types';

import {
  AFTER_HOURS_BAR_KEY,
  redistributeNegativeSlices,
  summationHourlyBarGraphData,
} from '../summation-hourly-bar-data';

const DAY = '2020-06-15';

let nextId = 1;
function rowAt(hour: number, amount: number, day: string = DAY): SummationEvent {
  const hh = String(hour).padStart(2, '0');
  return {
    id: nextId++,
    amount,
    createdAt: { day, time: `${hh}:30:00` },
  };
}

describe('redistributeNegativeSlices', () => {
  it('moves a negative slice into the nearest positive slice to the left', () => {
    const { adjusted } = redistributeNegativeSlices([0, 10, -3, 0]);
    expect(adjusted).toEqual([0, 7, 0, 0]);
  });

  it('leaves a trailing negative when index 0 is negative (no donor to the left)', () => {
    const { adjusted, negativeIndices } = redistributeNegativeSlices([-5, 10]);
    expect(adjusted).toEqual([-5, 10]);
    expect(negativeIndices.has(0)).toBe(true);
  });

  it('preserves the total sum across slices', () => {
    const raw = [1, -2, 0, 8, -3, 2];
    const { adjusted } = redistributeNegativeSlices(raw);
    expect(adjusted.reduce((a, b) => a + b, 0)).toBe(raw.reduce((a, b) => a + b, 0));
  });
});

describe('summationHourlyBarGraphData', () => {
  it('returns 24 hour buckets with zero values and top 1 when there are no rows', () => {
    const data = summationHourlyBarGraphData([], DAY);
    const keys = Object.keys(data);
    expect(keys).toHaveLength(24);
    expect(keys).not.toContain(AFTER_HOURS_BAR_KEY);
    for (const row of Object.values(data)) {
      expect(row.value).toBe(0);
      expect(row.top).toBe(1);
      expect(row.trackModifier).toBeUndefined();
    }
  });

  it('places retroactive rows into the after hours bucket', () => {
    const data = summationHourlyBarGraphData([rowAt(10, 4), rowAt(10, 7, '2020-06-14')], DAY);
    expect(Object.keys(data)).toHaveLength(25);
    expect(data[AFTER_HOURS_BAR_KEY]).toMatchObject({
      value: 7,
      hoverLabel: AFTER_HOURS_BAR_KEY,
    });
    const sumValues = Object.values(data).reduce((s, d) => s + d.value, 0);
    expect(sumValues).toBe(11);
  });

  it('absorbs same-day negatives from a later hour into an earlier hour with balance', () => {
    const data = summationHourlyBarGraphData([rowAt(9, 10), rowAt(11, -3)], DAY);
    const hourKeys = Object.keys(data).filter((k) => k !== AFTER_HOURS_BAR_KEY);
    const byValue = Object.fromEntries(hourKeys.map((k) => [k, data[k]!.value]));
    expect(Object.values(byValue).some((v) => v === 7)).toBe(true);
    expect(Object.values(byValue).some((v) => v === -3)).toBe(false);
  });

  it('includes after hours column only when at least one row is off the habit row day', () => {
    const sameDayOnly = summationHourlyBarGraphData([rowAt(5, 2)], DAY);
    expect(Object.keys(sameDayOnly)).toHaveLength(24);
    const withRetro = summationHourlyBarGraphData([rowAt(5, 2, '2020-01-01')], DAY);
    expect(Object.keys(withRetro)).toHaveLength(25);
    expect(withRetro[AFTER_HOURS_BAR_KEY]!.value).toBe(2);
  });
});
