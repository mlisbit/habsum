// exclusive-bem-block: streak
import type { Day } from '@habsum/types/common/day';
import type { StreakDatum, StreakGraphData } from '@habsum/types/common/streak';
import { classBuilder } from '~/utils/class-builder';
import { Hoverable } from '~/core-components/Hoverable';
import { Icon, type IconName } from '~/core-components/Icon';

function formatStreakDayLabel(dateKey: Day): string {
  const [ys, ms, ds] = dateKey.split('-');
  const y = Number(ys);
  const m = Number(ms);
  const d = Number(ds);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return dateKey;
  const dt = new Date(y, m - 1, d);
  if (Number.isNaN(dt.getTime())) return dateKey;
  return dt.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

function streakCellModifier(datum: StreakDatum): 'empty' | 'miss' | 'hit' {
  if (datum.value == null) return 'empty';
  if (datum.include) return 'hit';
  return 'miss';
}

function streakCellIcon(mod: ReturnType<typeof streakCellModifier>): IconName {
  if (mod === 'empty') return 'circle-dashed';
  if (mod === 'miss') return 'circle';
  return 'party-popper';
}

const STREAK_ROW_SIZE = 7;

function chunkStreakEntries<T>(entries: T[], rowSize: number): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < entries.length; i += rowSize) {
    rows.push(entries.slice(i, i + rowSize));
  }
  return rows;
}

function weekStartMonday(dateKey: Day): Day {
  const [ys, ms, ds] = dateKey.split('-');
  const y = Number(ys);
  const m = Number(ms);
  const d = Number(ds);
  const dt = new Date(y, m - 1, d);
  const daysFromMonday = (dt.getDay() + 6) % 7;
  dt.setDate(dt.getDate() - daysFromMonday);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}` as Day;
}

function streakTodayKey(entries: [Day, StreakDatum][], viewDate: Day): Day {
  const isWeekly = entries.some(([, datum]) => datum.label != null);
  return isWeekly ? weekStartMonday(viewDate) : viewDate;
}

type StreakCellProps = {
  dateKey: Day;
  datum: StreakDatum;
  isToday?: boolean;
  /** Larger duplicate shown beside the streak grid for the view-date cell. */
  preview?: boolean;
};

function StreakCell({ dateKey, datum, isToday = false, preview = false }: StreakCellProps) {
  const mod = streakCellModifier(datum);
  const periodLabel = datum.label ?? formatStreakDayLabel(dateKey);
  const valueLabel =
    datum.value ?? (datum.label != null ? 'No streak days logged' : 'No selection logged');

  return (
    <Hoverable.Root>
      <Hoverable.Anchor
        className={classBuilder({
          'streak__cell--empty': mod === 'empty',
          'streak__cell--miss': mod === 'miss',
          'streak__cell--hit': mod === 'hit',
          'streak__cell--today': isToday,
          'streak__cell--preview': preview,
        })}
        role={preview ? undefined : 'listitem'}
        aria-label={`${periodLabel}: ${valueLabel}`}
      >
        <Icon
          className="streak__cell-icon"
          name={streakCellIcon(mod)}
          size={preview ? 'large' : 'medium'}
          sizePx={preview ? 28 : undefined}
        />
      </Hoverable.Anchor>
      <Hoverable.Content className="streak__tooltip" side="top">
        <div className="streak__tooltip-day text-light text-b-s">{periodLabel}</div>
        <div className="text-b-m">{datum.value ?? '—'}</div>
      </Hoverable.Content>
    </Hoverable.Root>
  );
}

type StreakProps = {
  streak: StreakGraphData;
  /** API view date; marks the matching streak cell with `streak__cell--today`. */
  viewDate: Day;
};

/** One icon per period in the streak window; hover shows the logged option (or empty). */
export function Streak({ streak, viewDate }: StreakProps) {
  const entries = (Object.entries(streak.data) as [Day, StreakDatum][]).sort(([a], [b]) =>
    a.localeCompare(b),
  );
  if (entries.length === 0) return null;

  const todayKey = streakTodayKey(entries, viewDate);
  const todayEntry = entries.find(([dateKey]) => dateKey === todayKey);

  return (
    <section className="card mt-3" aria-label={`Streak, ${streak.streakText}`}>
      <div className="streak__body">
        <div className="flex align-items-center gap-2">
          {todayEntry ? <StreakCell dateKey={todayEntry[0]} datum={todayEntry[1]} preview /> : null}

          <div className="streak__meta-row">
            <div className="streak__meta text-b-m">
              <span className="text-light">Streak</span>
              <span>
                {' '}
                <span>{streak.streakText}</span>
              </span>
            </div>
            {streak.longestStreak ? (
              <div className="streak__meta text-b-m">
                <span className="text-light">Longest</span>
                <span>
                  {' '}
                  <Hoverable.Root>
                    <Hoverable.Anchor
                      className="streak__longest"
                      aria-label={streak.longestStreak.range}
                    >
                      <span>{streak.longestStreak.text}</span>
                    </Hoverable.Anchor>
                    <Hoverable.Content className="streak__tooltip" side="top">
                      <div className="streak__tooltip-day text-light text-b-s">
                        {streak.longestStreak.range}
                      </div>
                    </Hoverable.Content>
                  </Hoverable.Root>
                </span>
              </div>
            ) : null}
          </div>
        </div>

        <div className="streak__rows" role="list">
          {chunkStreakEntries(entries, STREAK_ROW_SIZE).map((row, rowIndex) => (
            <div key={rowIndex} className="streak__row">
              {row.map(([dateKey, datum]) => (
                <StreakCell
                  key={dateKey}
                  dateKey={dateKey}
                  datum={datum}
                  isToday={dateKey === todayKey}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
