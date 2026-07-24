// Builds the current streak insight card from computed streak graph data.
import type { HabitWidgetInsight } from '@habsum/types/common/habit';

export default function getCurrentStreakInsight(
  streak: { currentText: string } | null | undefined,
): HabitWidgetInsight | null {
  if (!streak) return null;
  return { header: 'Current streak', description: streak.currentText };
}
