// Builds the longest streak insight card from computed streak graph data.
import type { HabitWidgetInsight } from '@habsum/types/common/habit';
import type { StreakGraphData } from '@habsum/types/common/streak';

export default function getLongestStreakInsight(
  streak: Pick<StreakGraphData, 'longestStreak'> | null | undefined,
): HabitWidgetInsight | null {
  if (!streak?.longestStreak) return null;
  return {
    header: streak.longestStreak.label,
    description: streak.longestStreak.text,
    hover: [
      streak.longestStreak.range,
      streak.longestStreak.qualifier ? `Includes ${streak.longestStreak.qualifier}` : null,
    ]
      .filter(Boolean)
      .join('\n'),
  };
}
