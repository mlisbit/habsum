import { describe, expect, it } from 'vitest';
import { msUntilNextLocalDay } from '~/utils/date-utils';

describe('msUntilNextLocalDay', () => {
  it('returns time until next local midnight', () => {
    const tzOffsetMinutes = 0;
    const now = new Date('2026-05-22T23:30:00.000Z');
    expect(msUntilNextLocalDay(tzOffsetMinutes, now)).toBe(30 * 60 * 1000);
  });

  it('schedules the full day when called at local midnight', () => {
    const tzOffsetMinutes = 0;
    const now = new Date('2026-05-23T00:00:00.000Z');
    expect(msUntilNextLocalDay(tzOffsetMinutes, now)).toBe(24 * 60 * 60 * 1000);
  });
});
