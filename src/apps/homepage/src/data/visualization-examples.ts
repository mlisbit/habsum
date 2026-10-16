import type { ComponentProps } from 'react';
import type { BarGraph } from '@habsum/ui/components/graphs/BarGraph';
import type { HeatmapEntry } from '@habsum/ui/components/graphs/Heatmap';

export const dailyGoal = 100;

// A fixed example history keeps the static homepage independent of the application API.
const totals = [
  40, 0, 100, 105, 110, 100, 115, 120, 100, 105, 110, 100, 115, 120, 60, 75, 100, 110, 0, 100, 105,
  50, 0, 100, 105, 110, 100, 115,
];

const days = Array.from({ length: 168 }, (_, index) => {
  const date = new Date(Date.UTC(2026, 3, 20 + index));
  return {
    key: date.toISOString().slice(0, 10),
    label: date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
    }),
    total: totals[index % totals.length],
  };
});

export const heatmapEntries: HeatmapEntry[][] = Array.from({ length: 24 }, (_, week) =>
  days.slice(week * 7, week * 7 + 7).map(({ key, label, total }) => {
    const intensity = Math.min(5, Math.ceil((total / 120) * 5));
    return [
      key,
      {
        label,
        value: `${total} / ${dailyGoal}`,
        ariaLabel: `${label}: ${total} of ${dailyGoal}`,
        color:
          intensity === 0 ? 'var(--heatmap-fill-0)' : `var(--heatmap-fill-positive-${intensity})`,
      },
    ];
  }),
);

export const barGraphData = Object.fromEntries(
  days
    .slice(-14)
    .map(({ key, label, total }) => [key, { value: total, top: 120, hoverLabel: label }]),
) satisfies ComponentProps<typeof BarGraph>['data'];

const streaks = days.reduce(
  ({ current, longest }, { total }) => {
    const next = total >= dailyGoal ? current + 1 : 0;
    return { current: next, longest: Math.max(longest, next) };
  },
  { current: 0, longest: 0 },
);

export const insightCards = [
  { header: 'Current streak', description: `${streaks.current} days` },
  { header: 'Longest streak', description: `${streaks.longest} days` },
  {
    header: 'Average/day',
    description: String(
      Math.round(days.reduce((total, day) => total + day.total, 0) / days.length),
    ),
  },
];
