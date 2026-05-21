import yaml from 'js-yaml';
import { dumpConfigYaml, parseConfigHabitCards } from './configYaml';

export type HistoryPeriodUnit = 'd' | 'w';

export type ConfigHabitDraft = {
  name: string;
  type: 'summation' | 'single_select';
  goal: string;
  /** Ordered numeric amounts for YAML `summation_options`. */
  quickAddItems: string[];
  optionsText: string;
  streakEnabled: boolean;
  streakOptionsText: string;
  historyEnabled: boolean;
  historyPeriodAmount: string;
  historyPeriodUnit: HistoryPeriodUnit;
};

const DEFAULT_HISTORY_PERIOD_AMOUNT = '1';
const DEFAULT_HISTORY_PERIOD_UNIT: HistoryPeriodUnit = 'w';

const LEGACY_SUMMATION_INPUT_TOKEN = 'input';

export function parseHistoryPeriod(period: string): {
  amount: string;
  unit: HistoryPeriodUnit;
} {
  const m = period.trim().match(/^(\d+)([dw])$/);
  if (m?.[1] && (m[2] === 'd' || m[2] === 'w')) {
    return { amount: m[1], unit: m[2] };
  }
  return { amount: DEFAULT_HISTORY_PERIOD_AMOUNT, unit: DEFAULT_HISTORY_PERIOD_UNIT };
}

export function formatHistoryPeriod(amount: string, unit: HistoryPeriodUnit): string {
  const n = parseOptionalPositiveInt(amount);
  if (n == null) {
    throw new Error('history length must be a positive integer');
  }
  if (unit !== 'd' && unit !== 'w') {
    throw new Error('history unit must be days or weeks');
  }
  return `${n}${unit}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function parseLines(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

/** YAML key on single_select habits for consecutive-day tracking config. */
const HABIT_STREAK_YAML_KEY = 'str' + 'eak';

function readHabitStreakYaml(def: Record<string, unknown>): unknown {
  return def[HABIT_STREAK_YAML_KEY];
}

function writeHabitStreakYaml(def: Record<string, unknown>, value: { options: string[] }): void {
  def[HABIT_STREAK_YAML_KEY] = value;
}

export function parseOptionLines(text: string): string[] {
  return parseLines(text);
}

export function formatOptionLines(lines: string[]): string {
  return lines.join('\n');
}

function parseOptionalPositiveInt(raw: string): number | null {
  const t = raw.trim();
  if (t === '') return null;
  const n = Math.trunc(Number(t));
  if (!Number.isFinite(n) || n < 1) return null;
  return n;
}

function intString(value: unknown): string | null {
  const n = Math.trunc(Number(value));
  if (!Number.isFinite(n)) return null;
  return String(n);
}

/** Sort quick-add amounts ascending (negatives first). */
export function sortQuickAddItems(items: string[]): string[] {
  return [...items].sort((a, b) => Math.trunc(Number(a)) - Math.trunc(Number(b)));
}

function parseSummationQuickAddEntry(entry: unknown): string | null {
  if (typeof entry === 'string' && entry.trim().toLowerCase() === LEGACY_SUMMATION_INPUT_TOKEN) {
    return null;
  }
  return intString(entry);
}

function parseQuickAddFromDef(
  def: Record<string, unknown>,
): Pick<ConfigHabitDraft, 'quickAddItems'> {
  const raw = def.summation_options ?? def.summationOptions;
  if (raw == null) {
    return { quickAddItems: [] };
  }

  if (Array.isArray(raw)) {
    const items = raw
      .map((entry) => parseSummationQuickAddEntry(entry))
      .filter((entry): entry is string => entry != null);
    return { quickAddItems: sortQuickAddItems(items) };
  }

  if (isRecord(raw)) {
    const sub = intString(raw.sub);
    const add = intString(raw.add);
    if (sub == null || add == null) return { quickAddItems: [] };
    return { quickAddItems: sortQuickAddItems([sub, add]) };
  }

  return { quickAddItems: [] };
}

export function summationQuickAddItemsToYaml(items: string[]): number[] {
  return items.map((item) => {
    const n = Math.trunc(Number(item));
    if (!Number.isFinite(n)) {
      throw new Error(`invalid quick add value: ${item}`);
    }
    return n;
  });
}

export function parseHabitDraftFromDef(name: string, def: unknown): ConfigHabitDraft {
  if (!isRecord(def)) {
    throw new Error(`habit "${name}" must be a yaml mapping`);
  }

  const type = def.type === 'single_select' ? 'single_select' : 'summation';
  const goalRaw = def.goal;
  const goal =
    typeof goalRaw === 'number' && Number.isFinite(goalRaw) ? String(Math.trunc(goalRaw)) : '';

  const options =
    type === 'single_select' && Array.isArray(def.options)
      ? def.options.filter((x): x is string => typeof x === 'string')
      : [];

  let streakEnabled = false;
  let streakOptionsText = '';
  const streakBlock = readHabitStreakYaml(def);
  if (type === 'single_select' && isRecord(streakBlock) && Array.isArray(streakBlock.options)) {
    const streakOpts = streakBlock.options.filter((x): x is string => typeof x === 'string');
    if (streakOpts.length > 0) {
      streakEnabled = true;
      streakOptionsText = streakOpts.join('\n');
    }
  }

  const history = def.history;
  const historyBlockEnabled = type === 'summation' && isRecord(history);
  const historyPeriodRaw =
    historyBlockEnabled && typeof history.period === 'string'
      ? history.period
      : `${DEFAULT_HISTORY_PERIOD_AMOUNT}${DEFAULT_HISTORY_PERIOD_UNIT}`;
  const { amount: historyPeriodAmount, unit: historyPeriodUnit } =
    parseHistoryPeriod(historyPeriodRaw);

  return {
    name,
    type,
    goal,
    ...parseQuickAddFromDef(def),
    optionsText: options.join('\n'),
    streakEnabled,
    streakOptionsText,
    historyEnabled: historyBlockEnabled,
    historyPeriodAmount,
    historyPeriodUnit,
  };
}

export function parseHabitDraftFromText(text: string, habitName: string): ConfigHabitDraft {
  let parsed: unknown;
  try {
    parsed = yaml.load(text);
  } catch {
    throw new Error('invalid yaml');
  }
  if (!isRecord(parsed)) {
    throw new Error('config must be a yaml mapping');
  }
  const habits = parsed.habits;
  if (!isRecord(habits) || !Object.hasOwn(habits, habitName)) {
    throw new Error(`unknown habit: ${habitName}`);
  }
  return parseHabitDraftFromDef(habitName, habits[habitName]);
}

function draftToRawHabit(draft: ConfigHabitDraft): Record<string, unknown> {
  const def: Record<string, unknown> = { type: draft.type };

  if (draft.type === 'summation') {
    const goal = parseOptionalPositiveInt(draft.goal);
    if (goal != null) def.goal = goal;

    if (draft.quickAddItems.length > 0) {
      def.summation_options = summationQuickAddItemsToYaml(draft.quickAddItems);
    }
  } else {
    const options = parseLines(draft.optionsText);
    if (options.length === 0) {
      throw new Error('single select habits need at least one option');
    }
    def.options = options;

    if (draft.streakEnabled) {
      const allowed = new Set(options);
      const streakOptions = parseLines(draft.streakOptionsText).filter((opt) => allowed.has(opt));
      if (streakOptions.length === 0) {
        throw new Error('tracking options must list at least one habit option');
      }
      writeHabitStreakYaml(def, { options: streakOptions });
    }
  }

  if (draft.type === 'summation' && draft.historyEnabled) {
    def.history = {
      period: formatHistoryPeriod(draft.historyPeriodAmount, draft.historyPeriodUnit),
    };
  }

  return def;
}

export function applyHabitDraftToConfigYaml(
  text: string,
  draft: ConfigHabitDraft,
  originalName: string,
): string {
  let parsed: unknown;
  try {
    parsed = yaml.load(text);
  } catch {
    throw new Error('invalid yaml');
  }
  if (!isRecord(parsed)) {
    throw new Error('config must be a yaml mapping');
  }
  const habits = parsed.habits;
  if (!isRecord(habits) || !Object.hasOwn(habits, originalName)) {
    throw new Error(`unknown habit: ${originalName}`);
  }

  const newName = draft.name.trim();
  if (newName === '') {
    throw new Error('habit name is required');
  }
  if (newName !== originalName && Object.hasOwn(habits, newName)) {
    throw new Error(`habit "${newName}" already exists`);
  }

  const def = draftToRawHabit({ ...draft, name: newName });
  const order = parseConfigHabitCards(text).map((h) => h.name);

  if (newName !== originalName) {
    delete habits[originalName];
    habits[newName] = def;
    return dumpConfigYaml(
      parsed,
      order.map((name) => (name === originalName ? newName : name)),
    );
  }

  habits[newName] = def;
  return dumpConfigYaml(parsed, order);
}
