import { toDateKey } from '@habsum/utils/date';
import { Button } from '@habsum/ui/components/Button';
import { HumanDate } from '@habsum/ui/components/HumanDate';
import { Text as GhostText } from '@habsum/ui/components/ghosts/Text';
import { addDays } from '~/utils/date-utils';

function classNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ');
}

export function DayNav({
  date,
  tzOffsetMinutes,
  onChangeDate,
  today = toDateKey(new Date(), tzOffsetMinutes),
  onDateTooFarText,
  showJumpToToday = false,
  nextDisabled = date >= today,
  isLoading = false,
  className,
}: {
  date: string;
  tzOffsetMinutes: number;
  onChangeDate: (next: string) => void;
  today?: string;
  onDateTooFarText?: string;
  showJumpToToday?: boolean;
  nextDisabled?: boolean;
  isLoading?: boolean;
  className?: string;
}) {
  return (
    <div className={classNames('day-nav', className)}>
      <div className="day-nav__top">
        <div className="text-h-l">
          {isLoading ? (
            <GhostText mimic="text-h-l" width="8rem" />
          ) : (
            <HumanDate date={date} tzOffsetMinutes={tzOffsetMinutes} today={today} />
          )}
        </div>
        <div className="day-nav__actions">
          <div className="flex gap-2">
            <Button
              type="tertiary"
              size="medium"
              icon="chevronLeft"
              text=""
              circle
              title="Previous day"
              aria-label="Previous day"
              onClick={() => onChangeDate(addDays(date, -1, tzOffsetMinutes))}
            />
            <Button
              type="tertiary"
              size="medium"
              icon="chevronRight"
              text=""
              circle
              title="Next day"
              aria-label="Next day"
              onClick={() => onChangeDate(addDays(date, 1, tzOffsetMinutes))}
              disabled={nextDisabled}
            />
          </div>
        </div>
      </div>

      <div className="day-nav__bottom">
        {onDateTooFarText ? <span className="text-b-s text-light">{onDateTooFarText}</span> : null}
        {showJumpToToday ? (
          <button
            type="button"
            className="day-nav__jump text-b-s link--fancy ml-1"
            onClick={() => onChangeDate(today)}
          >
            Jump to today.
          </button>
        ) : null}
      </div>
    </div>
  );
}
