// exclusive-bem-block: streak
import type { CSSProperties } from 'react';
import type { Day } from '@habsum/types/common/day';
import type { StreakDatum, StreakGraphData } from '@habsum/types/common/streak';
import { Hoverable } from '~/core-components/Hoverable';
import { Icon } from '~/core-components/Icon';

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

function streakCellStyle(mod: ReturnType<typeof streakCellModifier>): CSSProperties {
  if (mod === 'hit') return { color: 'var(--accent-selected)' };
  if (mod === 'miss') return { color: 'var(--accent-red-1)' };
  return { color: 'var(--text-muted)', opacity: 0.58 };
}

type StreakProps = {
  streak: StreakGraphData;
};

/** One party-popper per day in the streak window; hover shows the logged option (or empty). */
export function Streak({ streak }: StreakProps) {
  const entries = (Object.entries(streak.data) as [Day, StreakDatum][]).sort(([a], [b]) =>
    a.localeCompare(b),
  );
  if (entries.length === 0) return null;

  return (
    <section className="streak streak--widget" aria-label={`Streak, ${streak.streakText}`}>
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
      <div className="streak__row" role="list">
        {entries.map(([dateKey, datum]) => {
          const mod = streakCellModifier(datum);
          const periodLabel = datum.label ?? formatStreakDayLabel(dateKey);
          const valueLabel =
            datum.value ?? (datum.label != null ? 'No streak days logged' : 'No selection logged');
          return (
            <Hoverable.Root key={dateKey}>
              <Hoverable.Anchor
                className={`streak__cell streak__cell--${mod}`}
                style={streakCellStyle(mod)}
                role="listitem"
                aria-label={`${periodLabel}: ${valueLabel}`}
              >
                <Icon name="party-popper" size="medium" />
              </Hoverable.Anchor>
              <Hoverable.Content className="streak__tooltip" side="top">
                <div className="streak__tooltip-day text-light text-b-s">{periodLabel}</div>
                <div className="text-b-m">{datum.value ?? '—'}</div>
              </Hoverable.Content>
            </Hoverable.Root>
          );
        })}
      </div>
    </section>
  );
}
