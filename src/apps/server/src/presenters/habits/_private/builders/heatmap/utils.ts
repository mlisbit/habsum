import type { Day } from '@habsum/types/common/day';
import type { StreakFill } from '@habsum/types/common/streak';
import { fromDateKey } from '@habsum/utils/date';
import { getDayAfter } from '../../utils.js';

export function getSundayWeekStart(date: Day): Day {
  return getDayAfter(date, -fromDateKey(date, 0).getUTCDay());
}

export function getStreakFills(
  values: ReadonlyArray<number | undefined>,
): Array<StreakFill | undefined> {
  const defined = values.filter((value): value is number => value !== undefined);
  const maxPositive = Math.max(0, ...defined.filter((value) => value > 0));
  const maxNegativeMagnitude = Math.max(
    0,
    ...defined.filter((value) => value < 0).map((value) => Math.abs(value)),
  );

  return values.map((value) => {
    if (value == null) return undefined;
    if (value === 0) return 0;
    if (value > 0) return Math.max(1, Math.round((value / maxPositive) * 5)) as StreakFill;
    return -Math.max(1, Math.round((Math.abs(value) / maxNegativeMagnitude) * 5)) as StreakFill;
  });
}
