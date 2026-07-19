import { dayFromString, type Day } from '@habsum/types/common/day';
import { describe, expect, it, vi } from 'vitest';
import {
  habitHistoryForConfiguredPeriod as buildHabitHistoryForConfiguredPeriod,
  historyGraphScaleTop,
} from '../history-utils.js';

const habitReaderMocks = vi.hoisted(() => ({
  getSeries: vi.fn(),
  getSelect: vi.fn(),
  getFirstSelectDate: vi.fn(),
}));

const { getSeries } = habitReaderMocks;
const user = 'tester';
const habit = 'mood';

function habitHistoryForConfiguredPeriod(
  viewDate: Day,
  firstDate: Day | null,
  periodSpec: string,
  goal: number | null | undefined = null,
  at: Date = new Date(),
) {
  return buildHabitHistoryForConfiguredPeriod(
    user,
    habit,
    viewDate,
    firstDate,
    periodSpec,
    goal,
    at,
    undefined,
    habitReaderMocks,
  );
}

describe('historyGraphScaleTop', () => {
  it('uses the goal when it exceeds logged totals in the period', () => {
    expect(historyGraphScaleTop([4], 5)).toBe(5);
  });

  it('uses the max logged total when it exceeds the goal', () => {
    expect(historyGraphScaleTop([175], 100)).toBe(175);
  });

  it('falls back to 1 when there is no data and no goal', () => {
    expect(historyGraphScaleTop([], null)).toBe(1);
  });
});

describe('habitHistoryForConfiguredPeriod', () => {
  it('pads up to three days after a past view date and outlines the view date', () => {
    const at = new Date('2025-05-21T12:00:00.000Z');
    const viewDate = dayFromString('2025-05-18');
    vi.mocked(getSeries).mockReturnValue([
      { date: dayFromString('2025-05-18'), total: 2 },
      { date: dayFromString('2025-05-20'), total: 5 },
    ]);

    const history = habitHistoryForConfiguredPeriod(viewDate, null, '1w', null, at);

    expect(getSeries).toHaveBeenCalledWith(user, habit, '2025-05-15', '2025-05-21');
    expect(Object.keys(history.data.user.graphData)).toEqual([
      '2025-05-15',
      '2025-05-16',
      '2025-05-17',
      '2025-05-18',
      '2025-05-19',
      '2025-05-20',
      '2025-05-21',
    ]);
    expect(history.data.user.graphData[viewDate]?.outline).toBe(true);
    expect(history.data.user.graphData[viewDate]?.dimmed).toBeUndefined();
    expect(history.data.user.graphData['2025-05-19']?.dimmed).toBe(true);
    expect(history.data.user.graphData['2025-05-20']?.dimmed).toBe(true);
    expect(history.data.user.graphData['2025-05-21']?.dimmed).toBe(true);
    expect(history.data.user.graphData['2025-05-21']?.outline).toBeUndefined();
  });
});
