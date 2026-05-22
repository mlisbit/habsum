import { useEffect, useMemo, useState } from 'react';
import { fromDateKey, toDateKey } from '@habsum/utils';
import { diffDays } from '~/utils/date-utils';
import { Button } from '~/core-components/Button';
import { DayNav } from '~/components/DayNav';
import { Hoverable } from '~/core-components/Hoverable';
import { Icon } from '~/core-components/Icon';
import { ProgressBar } from '~/core-components/ProgressBar';
import type { DayProgressBreakdown } from '~/utils/habit-helpers';

function useTimeUntilEndOfDayLabel(dateKey: string, tzOffsetMinutes: number): string {
  const [label, setLabel] = useState(() => formatTimeUntilEndOfDay(dateKey, tzOffsetMinutes));

  useEffect(() => {
    const tick = () => setLabel(formatTimeUntilEndOfDay(dateKey, tzOffsetMinutes));
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, [dateKey, tzOffsetMinutes]);

  return label;
}

function formatTimeUntilEndOfDay(dateKey: string, tzOffsetMinutes: number): string {
  const start = fromDateKey(dateKey, tzOffsetMinutes);
  const endExclusive = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  const endOfDay = new Date(endExclusive.getTime() - 1);
  const now = Date.now();
  if (now > endOfDay.getTime()) return 'This day has ended';
  const ms = endOfDay.getTime() - now;
  const hours = Math.floor(ms / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  return `${hours}h ${minutes}m until end of day`;
}

export type TopNavProps = {
  username: string;
  /** Shown in “Hi, …” when set and non-empty; otherwise `username` is used. */
  displayName?: string | null;
  /** Day being viewed (YYYY-MM-DD); drives end-of-day countdown. */
  effectiveDate: string;
  tzOffsetMinutes: number;
  firstDate: string | null;
  onChangeDate: (next: string) => void;
  onBack: () => void;
  onSettings: () => void;
  /** Day progress aggregates for bar + captions (see `getProgress`). */
  progress: DayProgressBreakdown;
};

export function TopNav({
  username,
  displayName = null,
  effectiveDate,
  tzOffsetMinutes,
  firstDate,
  onChangeDate,
  onBack,
  onSettings,
  progress,
}: TopNavProps) {
  const countdown = useTimeUntilEndOfDayLabel(effectiveDate, tzOffsetMinutes);
  const today = useMemo(() => toDateKey(new Date(), tzOffsetMinutes), [tzOffsetMinutes]);
  const nextDisabled = effectiveDate >= today;
  const showBeforeDataNotice = firstDate != null && effectiveDate < firstDate;

  const greetingName =
    displayName != null && displayName.trim() !== '' ? displayName.trim() : username;

  const showJumpToToday =
    Math.abs(diffDays(effectiveDate, today, tzOffsetMinutes)) > 1 || showBeforeDataNotice;

  const averageCompletionPercent = useMemo(() => {
    const { done, total } = progress.total;
    if (total <= 0 || !Number.isFinite(done)) return null;
    return Math.round((done / total) * 100);
  }, [progress]);

  const dayProgressFullyComplete = progress.total.total > 0 && averageCompletionPercent === 100;

  const progressCaption = useMemo(() => {
    if (progress.total.total <= 0) return 'No habits for this day';
    if (averageCompletionPercent === 100) return null;

    const { goals, other } = progress;
    const othersFullyLogged = other.total > 0 && other.done === other.total;

    const parts: string[] = [];

    if (goals.total > 0) {
      const completedPct = Math.round((goals.done / goals.total) * 100);
      parts.push(`${completedPct}% of goals completed`);
    }

    // Omit the “N other habits” fragment when every no-goal habit is already logged today.
    if (other.total > 0 && !othersFullyLogged) {
      parts.push(
        `${other.total - other.done} other habit${other.total - other.done === 1 ? '' : 's'} remaining`,
      );
    }

    return parts.length > 0 ? parts.join(' · ') : null;
  }, [progress, averageCompletionPercent]);

  const progressBarProps = useMemo(
    () => ({
      className: 'top-nav__day-progress',
      size: 'small' as const,
      value: progress.total.done,
      max: progress.total.total,
      'aria-label':
        progress.total.total <= 0
          ? 'Day progress — no habits for this day'
          : averageCompletionPercent != null
            ? `${averageCompletionPercent}% weighted average habit completion for the day`
            : 'Day progress',
    }),
    [progress, averageCompletionPercent],
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
              Hi, {greetingName}
            </span>
          </div>
          <Hoverable.Root>
            <Hoverable.Anchor className="top-nav__settings-anchor">
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
        <p className="top-nav__countdown text-b-m text-light">{countdown}</p>
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
          {averageCompletionPercent != null ? (
            <Hoverable.Root>
              <Hoverable.Anchor className="top-nav__progress-anchor">
                <ProgressBar {...progressBarProps} />
              </Hoverable.Anchor>
              <Hoverable.Content className="top-nav__progress-tooltip" side="bottom">
                {averageCompletionPercent}%
              </Hoverable.Content>
            </Hoverable.Root>
          ) : (
            <ProgressBar {...progressBarProps} />
          )}
          {dayProgressFullyComplete ? (
            <p className="top-nav__progress-caption top-nav__progress-caption--celebrate text-b-s text-light">
              <Icon name="party" size="medium" className="top-nav__progress-party" />
              <span>Completed all goals!</span>
            </p>
          ) : progressCaption ? (
            <p className="top-nav__progress-caption text-b-s text-light">{progressCaption}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
