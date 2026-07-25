import type { Day } from '@habsum/types/common/day';

export function getFirstRecordedDate(dates: readonly Day[]): Day | null {
  return dates.reduce<Day | null>(
    (earliest, date) => (earliest == null || date < earliest ? date : earliest),
    null,
  );
}
