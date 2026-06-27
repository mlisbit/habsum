import type { UserConfigJsonHabit } from '~/api.client';

export function habitTypeLabel(type: UserConfigJsonHabit['type']): string {
  return type === 'single_select' ? 'Single select' : 'Summation';
}

export function habitDetailLines(habit: UserConfigJsonHabit): string[] {
  const lines: string[] = [habitTypeLabel(habit.type)];
  if (habit.type === 'summation' && habit.goal != null) {
    lines.push(`Goal: ${habit.goal}`);
  }
  if (habit.type === 'single_select' && habit.options?.length) {
    lines.push(`Options: ${habit.options.join(', ')}`);
  }
  if (habit.history != null) {
    lines.push('History enabled');
  }
  return lines;
}
