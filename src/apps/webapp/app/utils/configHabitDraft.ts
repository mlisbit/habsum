import {
  DEFAULT_STREAK_FREQUENCY,
  formatStreakFrequency,
  parseStreakFrequencyDays,
} from '@habsum/types/common/streak';
import type {
  ConfigHabitDraft,
  HistoryDisplay,
  HistoryPeriodUnit,
  UserConfigJson,
  UserConfigJsonHabit,
} from '~/api.client';

const DEFAULT_HISTORY_PERIOD_AMOUNT = '3';
const DEFAULT_HISTORY_PERIOD_UNIT: HistoryPeriodUnit = 'w';
const HISTORY_DISPLAY_ORDER: HistoryDisplay[] = ['heatmap', 'weekly_history'];
const HISTORY_WEEK_OPTIONS = ['1', '2', '3'];
const DEFAULT_HISTORY_DISPLAYS: HistoryDisplay[] = ['weekly_history'];
const DEFAULT_NEW_HABIT_NAME = 'New habit';
export const HABIT_REPEAT_DAYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const;

function quickAddItemsEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((item, index) => item === b[index]);
}

export function isHabitDraftDirty(initial: ConfigHabitDraft, draft: ConfigHabitDraft): boolean {
  return (
    initial.name !== draft.name ||
    initial.type !== draft.type ||
    initial.goal !== draft.goal ||
    !quickAddItemsEqual(initial.repeat, draft.repeat) ||
    !quickAddItemsEqual(initial.quickAddItems, draft.quickAddItems) ||
    initial.optionsText !== draft.optionsText ||
    initial.theme !== draft.theme ||
    initial.streakEnabled !== draft.streakEnabled ||
    initial.streakOptionsText !== draft.streakOptionsText ||
    initial.streakFrequencyPerWeek !== draft.streakFrequencyPerWeek ||
    initial.streakShowLongest !== draft.streakShowLongest ||
    initial.historyEnabled !== draft.historyEnabled ||
    !quickAddItemsEqual(initial.historyDisplays, draft.historyDisplays) ||
    initial.historyPeriodAmount !== draft.historyPeriodAmount ||
    initial.historyPeriodUnit !== draft.historyPeriodUnit
  );
}

function parseLines(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

export function parseOptionLines(text: string): string[] {
  return parseLines(text);
}

export function formatOptionLines(lines: string[]): string {
  return lines.join('\n');
}

export function sortQuickAddItems(items: string[]): string[] {
  return [...items].sort((a, b) => Math.trunc(Number(a)) - Math.trunc(Number(b)));
}

function parseOptionalPositiveInt(raw: string): number | null {
  const t = raw.trim();
  if (t === '') return null;
  const n = Math.trunc(Number(t));
  if (!Number.isFinite(n) || n < 1) return null;
  return n;
}

function parseHistoryPeriod(period: string): {
  amount: string;
  unit: HistoryPeriodUnit;
} {
  const m = period.trim().match(/^(\d+)([dw])$/);
  if (m?.[1] && (m[2] === 'd' || m[2] === 'w')) {
    return { amount: m[1], unit: m[2] };
  }
  return { amount: DEFAULT_HISTORY_PERIOD_AMOUNT, unit: DEFAULT_HISTORY_PERIOD_UNIT };
}

function formatHistoryPeriod(amount: string, unit: HistoryPeriodUnit): string {
  const n = parseOptionalPositiveInt(amount);
  if (n == null) {
    throw new Error('history length must be a positive integer');
  }
  if (unit !== 'd' && unit !== 'w') {
    throw new Error('history unit must be days or weeks');
  }
  return `${n}${unit}`;
}

function normalizeDraftRepeat(repeat: string[]): string[] {
  const normalized = HABIT_REPEAT_DAYS.filter((day) => repeat.includes(day));
  if (normalized.length === 0) throw new Error('repeat must include at least one day');
  return normalized;
}

function normalizeHistoryDisplays(displays: readonly HistoryDisplay[]): HistoryDisplay[] {
  return HISTORY_DISPLAY_ORDER.filter((display) => displays.includes(display));
}

function normalizeHistoryPeriodAmount(amount: string): string {
  return HISTORY_WEEK_OPTIONS.includes(amount) ? amount : DEFAULT_HISTORY_PERIOD_AMOUNT;
}

export function draftFromHabit(habit: UserConfigJsonHabit): ConfigHabitDraft {
  const historyPeriod = parseHistoryPeriod(
    habit.history?.period ?? `${DEFAULT_HISTORY_PERIOD_AMOUNT}${DEFAULT_HISTORY_PERIOD_UNIT}`,
  );

  const configuredHistoryDisplays = normalizeHistoryDisplays(
    habit.history?.displays ?? [habit.history?.display ?? DEFAULT_HISTORY_DISPLAYS[0]],
  );
  const historyDisplays =
    habit.type === 'single_select'
      ? configuredHistoryDisplays.filter((display) => display === 'heatmap')
      : configuredHistoryDisplays;

  return {
    name: habit.name,
    type: habit.type,
    goal: habit.goal == null ? '' : String(habit.goal),
    repeat:
      habit.repeat == null
        ? [...HABIT_REPEAT_DAYS]
        : HABIT_REPEAT_DAYS.filter((day) => habit.repeat?.includes(day)),
    quickAddItems: sortQuickAddItems(
      habit.type === 'summation'
        ? (habit.summationOptions?.increments ?? []).map((item) => String(item))
        : [],
    ),
    optionsText: habit.type === 'single_select' ? (habit.options ?? []).join('\n') : '',
    theme: habit.type === 'single_select' ? (habit.theme ?? '') : '',
    streakEnabled: habit.streak != null,
    streakOptionsText: habit.streak?.options.join('\n') ?? '',
    streakFrequencyPerWeek: String(parseStreakFrequencyDays(habit.streak?.frequency)),
    streakShowLongest: habit.streak?.show_longest === true,
    historyEnabled: habit.history != null && historyDisplays.length > 0,
    historyDisplays:
      habit.history == null && habit.type === 'single_select' ? ['heatmap'] : historyDisplays,
    historyPeriodAmount: normalizeHistoryPeriodAmount(historyPeriod.amount),
    historyPeriodUnit: historyPeriod.unit,
  };
}

function draftToHabit(draft: ConfigHabitDraft): UserConfigJsonHabit {
  const name = draft.name.trim();
  if (name === '') throw new Error('habit name is required');
  const repeat = normalizeDraftRepeat(draft.repeat);

  if (draft.type === 'single_select') {
    const options = parseLines(draft.optionsText);
    if (options.length === 0) {
      throw new Error('single select habits need at least one option');
    }
    const habit: UserConfigJsonHabit = {
      name,
      type: 'single_select',
      goal: null,
      options,
    };
    if (repeat.length < HABIT_REPEAT_DAYS.length) habit.repeat = repeat;
    if (draft.theme.trim() !== '') habit.theme = draft.theme.trim();
    if (draft.streakEnabled) {
      const allowed = new Set(options);
      const streakOptions = parseLines(draft.streakOptionsText).filter((opt) => allowed.has(opt));
      if (streakOptions.length === 0) {
        throw new Error('tracking options must list at least one habit option');
      }
      const frequency = formatStreakFrequency(
        parseOptionalPositiveInt(draft.streakFrequencyPerWeek) ?? 7,
      );
      habit.streak = {
        options: streakOptions,
        ...(frequency !== DEFAULT_STREAK_FREQUENCY ? { frequency } : {}),
        ...(draft.streakShowLongest ? { show_longest: true } : {}),
      };
    }
    if (draft.historyEnabled) {
      if (!draft.historyDisplays.includes('heatmap')) {
        throw new Error('single select data visualization requires heatmap');
      }
      habit.history = {
        displays: ['heatmap'],
        period: formatHistoryPeriod(draft.historyPeriodAmount, draft.historyPeriodUnit),
      };
    }
    return habit;
  }

  const goal = parseOptionalPositiveInt(draft.goal);
  const habit: UserConfigJsonHabit = {
    name,
    type: 'summation',
    goal,
  };
  if (repeat.length < HABIT_REPEAT_DAYS.length) habit.repeat = repeat;
  if (draft.quickAddItems.length > 0) {
    habit.summationOptions = {
      manualInput: true,
      increments: draft.quickAddItems.map((item) => {
        const n = Math.trunc(Number(item));
        if (!Number.isFinite(n)) throw new Error(`invalid quick add value: ${item}`);
        return n;
      }),
    };
  }
  if (draft.streakEnabled) {
    if (goal == null) throw new Error('summation streak tracking requires a goal');
    const frequency = formatStreakFrequency(
      parseOptionalPositiveInt(draft.streakFrequencyPerWeek) ?? 7,
    );
    habit.streak = {
      options: [String(goal)],
      ...(frequency !== DEFAULT_STREAK_FREQUENCY ? { frequency } : {}),
      ...(draft.streakShowLongest ? { show_longest: true } : {}),
    };
  }
  if (draft.historyEnabled) {
    if (draft.historyDisplays.length === 0) {
      throw new Error('data visualization needs at least one option');
    }
    habit.history = {
      displays: normalizeHistoryDisplays(draft.historyDisplays),
      period: formatHistoryPeriod(draft.historyPeriodAmount, draft.historyPeriodUnit),
    };
  }
  return habit;
}

export function applyHabitDraftToConfig(
  config: UserConfigJson,
  originalName: string,
  draft: ConfigHabitDraft,
): { config: UserConfigJson; appliedHabitName: string } {
  const nextHabit = draftToHabit(draft);
  if (
    nextHabit.name !== originalName &&
    config.habits.some((habit) => habit.name === nextHabit.name)
  ) {
    throw new Error(`habit "${nextHabit.name}" already exists`);
  }
  let found = false;
  const habits = config.habits.map((habit) => {
    if (habit.name !== originalName) return habit;
    found = true;
    return nextHabit;
  });
  if (!found) throw new Error(`unknown habit: ${originalName}`);
  return {
    config: { ...config, habits },
    appliedHabitName: nextHabit.name,
  };
}

export function removeHabitFromConfig(config: UserConfigJson, habitName: string): UserConfigJson {
  if (!config.habits.some((habit) => habit.name === habitName)) {
    throw new Error(`unknown habit: ${habitName}`);
  }
  return {
    ...config,
    habits: config.habits.filter((habit) => habit.name !== habitName),
  };
}

function uniqueNewHabitName(existingNames: ReadonlySet<string>, base = DEFAULT_NEW_HABIT_NAME) {
  if (!existingNames.has(base)) return base;
  let n = 2;
  while (existingNames.has(`${base} ${n}`)) n++;
  return `${base} ${n}`;
}

export function addHabitToConfig(
  config: UserConfigJson,
  type: 'summation' | 'single_select' = 'summation',
  options?: { theme?: string },
): { config: UserConfigJson; habitName: string } {
  const habitName = uniqueNewHabitName(new Set(config.habits.map((habit) => habit.name)));
  const habit: UserConfigJsonHabit =
    type === 'single_select'
      ? options?.theme === 'checkbox'
        ? {
            name: habitName,
            type: 'single_select',
            goal: null,
            options: ['yes', 'no'],
            theme: 'checkbox',
          }
        : { name: habitName, type: 'single_select', goal: null, options: ['1', '2', '3'] }
      : { name: habitName, type: 'summation', goal: null };

  return {
    config: { ...config, habits: [...config.habits, habit] },
    habitName,
  };
}

export function reorderConfigHabits(
  config: UserConfigJson,
  orderedNames: string[],
): UserConfigJson {
  const byName = new Map(config.habits.map((habit) => [habit.name, habit]));
  if (orderedNames.length !== config.habits.length) {
    throw new Error('habit order must include every habit');
  }
  const habits = orderedNames.map((name) => {
    const habit = byName.get(name);
    if (!habit) throw new Error(`unknown habit: ${name}`);
    return habit;
  });
  return { ...config, habits };
}
