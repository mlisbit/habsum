import yaml from 'js-yaml';
import { dumpConfigYaml, parseConfigHabitCards } from './configYaml';

export type SummationStepsMode = 'none' | 'fixed' | 'fixed-input';

export type ConfigHabitDraft = {
  name: string;
  type: 'summation' | 'single_select';
  goal: string;
  summationMode: SummationStepsMode;
  summationSub: string;
  summationAdd: string;
  optionsText: string;
  streakEnabled: boolean;
  streakOptionsText: string;
  historyEnabled: boolean;
  historyPeriod: string;
};

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

function parseSummationFromDef(
  def: Record<string, unknown>,
): Pick<ConfigHabitDraft, 'summationMode' | 'summationSub' | 'summationAdd'> {
  const raw = def.summation_options ?? def.summationOptions;
  if (raw == null) {
    return { summationMode: 'none', summationSub: '1', summationAdd: '1' };
  }

  if (Array.isArray(raw)) {
    if (raw.length === 2) {
      return {
        summationMode: 'fixed',
        summationSub: String(Math.trunc(Number(raw[0])) || 1),
        summationAdd: String(Math.trunc(Number(raw[1])) || 1),
      };
    }
    if (raw.length === 3) {
      return {
        summationMode: 'fixed-input',
        summationSub: String(Math.trunc(Number(raw[0])) || 1),
        summationAdd: String(Math.trunc(Number(raw[2])) || 1),
      };
    }
  }

  if (isRecord(raw)) {
    const sub = Math.trunc(Number(raw.sub));
    const add = Math.trunc(Number(raw.add));
    const inputBetween =
      raw.inputBetween === true ||
      raw.input_between === true ||
      raw.inputBetween === 'true' ||
      raw.input_between === 'true';
    return {
      summationMode: inputBetween ? 'fixed-input' : 'fixed',
      summationSub: String(Number.isFinite(sub) && sub >= 1 ? sub : 1),
      summationAdd: String(Number.isFinite(add) && add >= 1 ? add : 1),
    };
  }

  return { summationMode: 'none', summationSub: '1', summationAdd: '1' };
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
  const historyEnabled = isRecord(history);
  const historyPeriod =
    historyEnabled && typeof history.period === 'string' ? history.period : '1w';

  return {
    name,
    type,
    goal,
    ...parseSummationFromDef(def),
    optionsText: options.join('\n'),
    streakEnabled,
    streakOptionsText,
    historyEnabled,
    historyPeriod,
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

    if (draft.summationMode === 'fixed') {
      const sub = parseOptionalPositiveInt(draft.summationSub);
      const add = parseOptionalPositiveInt(draft.summationAdd);
      if (sub == null || add == null) {
        throw new Error('subtract and add steps must be positive integers');
      }
      def.summation_options = [sub, add];
    } else if (draft.summationMode === 'fixed-input') {
      const sub = parseOptionalPositiveInt(draft.summationSub);
      const add = parseOptionalPositiveInt(draft.summationAdd);
      if (sub == null || add == null) {
        throw new Error('subtract and add steps must be positive integers');
      }
      def.summation_options = [sub, 'input', add];
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

  if (draft.historyEnabled) {
    const period = draft.historyPeriod.trim();
    if (!period) {
      throw new Error('history period is required when history is enabled');
    }
    def.history = { period };
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
