// Builds the full GET /habits response envelope around already-built habit rows.
import type { HabitsPageProgress, HabitsResponse } from '@habsum/types/api-responses/habits-get';
import type { Day } from '@habsum/types/common/day';
import type { Habit } from '@habsum/types/common/habit';
import { fromDateKey } from '@habsum/utils/date';
import { getProgress } from '@habsum/utils/habit-helpers';
import { habitDetailUrl } from '@habsum/utils/habit-id';
import type { UserConfig } from '../types/userConfig.js';

type HabitResultBuilderInput = {
  user: string;
  viewingDate: Day;
  familiarName: string;
  firstRecordedDate: Day | null;
  config: UserConfig;
  habits: Habit[];
  today: Day;
  clientHour: number;
};

export class HabitResultBuilder {
  constructor(private readonly input: HabitResultBuilderInput) {}

  build(): HabitsResponse {
    const { user, viewingDate, habits } = this.input;

    return {
      user,
      date: viewingDate,
      page: this.habitPageCopy(habits),
      habits: habits.map((habit) => ({
        ...habit,
        ctaUrl: habitDetailUrl(user, habit.name, viewingDate),
      })),
    };
  }

  private habitPageCopy(habits: readonly Habit[]): HabitsResponse['page'] {
    const { viewingDate, familiarName, firstRecordedDate, config, today, clientHour } = this.input;
    const progress = habitPageProgress(habits);
    const showEmptyIntro = config.habits.length === 0;
    const isNewUser = firstRecordedDate === null;

    if (isNewUser) {
      return {
        heading: 'Welcome to Habsum',
        subheader: '',
        progress,
        showEmptyIntro,
      };
    }

    if (viewingDate !== today) {
      return {
        heading: habitPageDateHeading(viewingDate, today),
        subheader: exactDate(viewingDate),
        progress,
        showEmptyIntro,
      };
    }

    return {
      heading: habitPageHeading(familiarName, clientHour),
      subheader: '{{timeLeftInDay}} until end of day',
      progress,
      showEmptyIntro,
    };
  }
}

function habitPageHeading(name: string, clientHour: number): string {
  if (clientHour < 12) return `Good morning, ${name}`;
  if (clientHour < 17) return `Good afternoon, ${name}`;
  return `Hi, ${name}`;
}

function dateKeyDiffDays(from: Day, to: Day): number {
  return Math.round((fromDateKey(to, 0).getTime() - fromDateKey(from, 0).getTime()) / 86_400_000);
}

function dateKeyAsUtcDate(date: Day): Date {
  return new Date(
    Date.UTC(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8, 10))),
  );
}

function weekdayName(date: Day): string {
  return new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone: 'UTC' }).format(
    dateKeyAsUtcDate(date),
  );
}

function monthDay(date: Day): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(dateKeyAsUtcDate(date));
}

function exactDate(date: Day): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(dateKeyAsUtcDate(date));
}

function habitPageDateHeading(date: Day, today: Day): string {
  const daysAgo = dateKeyDiffDays(date, today);
  if (daysAgo === 1) return 'Your day yesterday';
  if (daysAgo > 1 && daysAgo <= 7) return `This past ${weekdayName(date)}`;
  return monthDay(date);
}

function habitPageProgress(habits: readonly Habit[]): HabitsPageProgress {
  const progress = getProgress(habits);
  const { done, total } = progress.total;
  const percent = total > 0 && Number.isFinite(done) ? Math.round((done / total) * 100) : null;

  if (total <= 0) {
    return {
      percent,
      caption: 'No habits for this day',
      isComplete: false,
      ariaLabel: 'Day progress - no habits for this day',
    };
  }

  const isComplete = percent === 100;
  if (isComplete) {
    return {
      percent,
      caption: 'Completed all goals!',
      isComplete,
      ariaLabel: `${percent}% weighted average habit completion for the day`,
    };
  }

  const parts: string[] = [];
  const { goals, other } = progress;
  const othersFullyLogged = other.total > 0 && other.done === other.total;

  if (goals.total > 0) {
    const completedPct = Math.round((goals.done / goals.total) * 100);
    parts.push(`${completedPct}% of goals completed`);
  }

  if (other.total > 0 && !othersFullyLogged) {
    const remaining = other.total - other.done;
    parts.push(`${remaining} other habit${remaining === 1 ? '' : 's'} remaining`);
  }

  return {
    percent,
    caption: parts.length > 0 ? parts.join(' · ') : null,
    isComplete,
    ariaLabel: `${percent}% weighted average habit completion for the day`,
  };
}
