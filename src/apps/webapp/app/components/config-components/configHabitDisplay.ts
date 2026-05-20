import type { ConfigHabitCard } from '~/utils/configYaml';

export function habitTypeLabel(type: ConfigHabitCard['type']): string {
  return type === 'single_select' ? 'Single select' : 'Summation';
}

export function habitDetailLines(habit: ConfigHabitCard): string[] {
  const lines: string[] = [];
  if (habit.type === 'summation' && habit.goal != null) {
    lines.push(`Goal: ${habit.goal}`);
  }
  if (habit.optionLabels?.length) {
    lines.push(`Options: ${habit.optionLabels.join(', ')}`);
  }
  if (habit.hasSummationOptions) {
    lines.push('Fixed +/- steps configured');
  }
  if (habit.hasHistory) {
    lines.push('History enabled');
  }
  return lines;
}
