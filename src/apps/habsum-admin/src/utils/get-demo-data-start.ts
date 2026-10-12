import type { HabitDef } from '../../../server/src/types/userConfig.ts';

export default function getDemoDataStart(habit: HabitDef, today: string): string {
  const end = new Date(`${today}T00:00:00Z`);
  const period = habit.data_visualization?.bargraph?.period.match(/^(\d+)([dw])$/);
  const days =
    period && Number(period[1]) > 0
      ? Number(period[1]) * (period[2] === 'w' ? 7 : 1)
      : habit.data_visualization?.bargraph
        ? 7
        : 1;
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - days + 1);
  if (habit.data_visualization?.heatmap !== undefined) {
    const heatmapStart = new Date(end);
    const weekly =
      habit.streak_options?.frequency != null && habit.streak_options.frequency !== '7d';
    const weekdayOffset = weekly ? (end.getUTCDay() + 6) % 7 : end.getUTCDay();
    heatmapStart.setUTCDate(end.getUTCDate() - weekdayOffset - (weekly ? 125 * 7 : 52 * 7));
    if (heatmapStart < start) return heatmapStart.toISOString().slice(0, 10);
  }
  return start.toISOString().slice(0, 10);
}
