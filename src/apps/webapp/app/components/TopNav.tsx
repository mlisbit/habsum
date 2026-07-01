import { useEffect, useMemo, useState } from 'react';
import { fromDateKey } from '@habsum/utils/date';
import { diffDays } from '~/utils/date-utils';
import { useTodayDateKey } from '~/utils/use-today-date-key';
import { Button } from '@habsum/ui/components/Button';
import { DayNav } from '~/components/DayNav';
import { Hoverable } from '@habsum/ui/components/Hoverable';
import { Icon } from '@habsum/ui/components/Icon';
import { ProgressBar } from '@habsum/ui/components/ProgressBar';
import type { HabitsPageProgress } from '@habsum/types/api-responses/habits-get';

function useTimeLeftInDay(dateKey: string, tzOffsetMinutes: number): string {
  const [label, setLabel] = useState(() => formatTimeLeftInDay(dateKey, tzOffsetMinutes));

  useEffect(() => {
    const tick = () => setLabel(formatTimeLeftInDay(dateKey, tzOffsetMinutes));
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, [dateKey, tzOffsetMinutes]);

  return label;
}

function formatTimeLeftInDay(dateKey: string, tzOffsetMinutes: number): string {
  const start = fromDateKey(dateKey, tzOffsetMinutes);
  const endExclusive = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  const endOfDay = new Date(endExclusive.getTime() - 1);
  const now = Date.now();
  if (now > endOfDay.getTime()) return '0h 0m';
  const ms = endOfDay.getTime() - now;
  const hours = Math.floor(ms / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  return `${hours}h ${minutes}m`;
}

function renderCopyTemplate(template: string, variables: Record<string, string>): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, key: string) => {
    return variables[key] ?? match;
  });
}

export type TopNavProps = {
  heading: string;
  subheader: string;
  /** Day being viewed (YYYY-MM-DD); drives end-of-day countdown. */
  effectiveDate: string;
  tzOffsetMinutes: number;
  firstDate: string | null;
  onChangeDate: (next: string) => void;
  onBack: () => void;
  onSettings: () => void;
  progress: HabitsPageProgress;
};

export function TopNav({
  heading,
  subheader,
  effectiveDate,
  tzOffsetMinutes,
  firstDate,
  onChangeDate,
  onBack,
  onSettings,
  progress,
}: TopNavProps) {
  const timeLeftInDay = useTimeLeftInDay(effectiveDate, tzOffsetMinutes);
  const renderedSubheader = renderCopyTemplate(subheader, { timeLeftInDay });
  const today = useTodayDateKey(tzOffsetMinutes);
  const nextDisabled = effectiveDate >= today;
  const showBeforeDataNotice = firstDate != null && effectiveDate < firstDate;

  const showJumpToToday =
    Math.abs(diffDays(effectiveDate, today, tzOffsetMinutes)) > 1 || showBeforeDataNotice;

  const progressBarProps = useMemo(
    () => ({
      className: 'top-nav__day-progress',
      value: progress.percent ?? 0,
      max: 100,
      'aria-label': progress.ariaLabel,
    }),
    [progress],
  );

  return (
    <div className="top-nav">
      <div className="top-nav__left">
        <div className="top-nav__intro-row">
          <div
            className="top-nav__greeting-zone"
            tabIndex={0}
            aria-labelledby="top-nav-user-greeting"
          >
            <span id="top-nav-user-greeting" className="top-nav__greeting text-h-xl">
              {heading}
            </span>
          </div>
          <Hoverable.Root>
            <Hoverable.Anchor className="flex">
              <Button
                type="tertiary"
                icon="gear"
                circle
                text=""
                aria-label="Settings"
                onClick={onSettings}
              />
            </Hoverable.Anchor>
            <Hoverable.Content className="top-nav__settings-tooltip" side="bottom">
              Settings
            </Hoverable.Content>
          </Hoverable.Root>
        </div>
        <p className="top-nav__countdown text-b-m text-light">{renderedSubheader}</p>
      </div>
      <div className="top-nav__right">
        <DayNav
          date={effectiveDate}
          tzOffsetMinutes={tzOffsetMinutes}
          today={today}
          onChangeDate={onChangeDate}
          nextDisabled={nextDisabled}
          showJumpToToday={showJumpToToday}
          onDateTooFarText={showBeforeDataNotice ? 'No data past this day.' : undefined}
        />
        <div className="top-nav__progress-wrap">
          {progress.percent != null ? (
            <Hoverable.Root>
              <Hoverable.Anchor className="top-nav__progress-anchor">
                <ProgressBar {...progressBarProps} />
              </Hoverable.Anchor>
              <Hoverable.Content className="top-nav__progress-tooltip" side="bottom">
                {progress.percent}%
              </Hoverable.Content>
            </Hoverable.Root>
          ) : (
            <ProgressBar {...progressBarProps} />
          )}
          {progress.isComplete && progress.caption ? (
            <p className="top-nav__progress-caption top-nav__progress-caption--celebrate text-b-s text-light">
              <Icon name="party" size="medium" className="top-nav__progress-party" />
              <span>{progress.caption}</span>
            </p>
          ) : progress.caption ? (
            <p className="top-nav__progress-caption text-b-s text-light">{progress.caption}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
