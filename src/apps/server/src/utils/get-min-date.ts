import type { Day } from '@habsum/types/common/day';

/** Returns the earliest non-null day from any API date collection. */
export default function getMinDate(dates: Array<Day | null>): Day | null {
  return dates.reduce<Day | null>((min, date) => {
    if (date == null) return min;
    return min == null || date < min ? date : min;
  }, null);
}
