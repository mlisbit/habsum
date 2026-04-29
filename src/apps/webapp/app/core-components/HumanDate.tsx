import { useMemo } from 'react';
import { formatHumanDate } from '~/utils/date-utils';

export { formatHumanDate };

type HumanDateProps = {
  date: string;
  tzOffsetMinutes: number;
  /** Today’s calendar key in this TZ; omit to infer from clock (use when parent already has it). */
  today?: string;
};

/**
 * Renders a human-readable calendar label for {@link formatHumanDate}.
 */
export function HumanDate({ date, tzOffsetMinutes, today }: HumanDateProps) {
  const label = useMemo(
    () => formatHumanDate(date, tzOffsetMinutes, today),
    [date, tzOffsetMinutes, today],
  );
  return <>{label}</>;
}
