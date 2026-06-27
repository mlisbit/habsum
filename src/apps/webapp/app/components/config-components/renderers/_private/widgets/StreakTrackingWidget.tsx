// exclusive-bem-block: widget-config-streak
import type { ConfigHabitDraft } from '~/api.client';
import { ConfigHabitFieldLabel } from '../../../ConfigHabitFieldLabel';
import { ConfigHabitModalField } from '../utils/ConfigHabitModalField';
import { ConfigHabitStreakOptionsPills } from '../utils/ConfigHabitOptionPills';
import { formatOptionLines } from '~/utils/configHabitDraft';
import { Widget } from './Widget';

type BaseStreakTrackingWidgetProps = {
  draft: ConfigHabitDraft;
  patch: (partial: Partial<ConfigHabitDraft>) => void;
};

type SingleSelectStreakTrackingWidgetProps = BaseStreakTrackingWidgetProps & {
  type: 'single_select';
  habitOptions: string[];
  streakOptions: string[];
};

type SummationStreakTrackingWidgetProps = BaseStreakTrackingWidgetProps & {
  type: 'summation';
};

type StreakTrackingWidgetProps =
  | SingleSelectStreakTrackingWidgetProps
  | SummationStreakTrackingWidgetProps;

function StreakFrequencyField({
  draft,
  info,
  patch,
}: {
  draft: ConfigHabitDraft;
  info: string;
  patch: (partial: Partial<ConfigHabitDraft>) => void;
}) {
  return (
    <ConfigHabitModalField label="Frequency" info={info} htmlFor="habit-streak-frequency">
      <select
        id="habit-streak-frequency"
        className="config-habit-modal__select text-b-m"
        value={draft.streakFrequencyPerWeek}
        onChange={(e) => patch({ streakFrequencyPerWeek: e.target.value })}
      >
        {Array.from({ length: 7 }, (_, i) => {
          const n = i + 1;
          const value = String(n);
          const label = n === 1 ? '1 day per week' : `${n} days per week`;
          return (
            <option key={value} value={value}>
              {label}
            </option>
          );
        })}
      </select>
    </ConfigHabitModalField>
  );
}

export function StreakTrackingWidget(props: StreakTrackingWidgetProps) {
  const { draft, patch, type } = props;

  const setStreakEnabled = (streakEnabled: boolean) => {
    patch({
      streakEnabled,
      ...(type === 'summation' && streakEnabled && draft.goal.trim() === '' ? { goal: '1' } : {}),
    });
  };

  const setStreakOptions =
    type === 'single_select'
      ? (selected: string[]) => {
          const selectedSet = new Set(selected);
          patch({
            streakOptionsText: formatOptionLines(
              props.habitOptions.filter((opt) => selectedSet.has(opt)),
            ),
          });
        }
      : null;

  const frequencyInfo =
    type === 'summation'
      ? 'Reach the goal at least this many days each week to continue your streak.'
      : 'Complete this habit at least this many days each week to continue your streak.';

  return (
    <div className="widget-config-streak">
      <Widget
        checked={draft.streakEnabled}
        checkboxId="habit-tracking-enabled"
        label="Streak"
        onCheckedChange={setStreakEnabled}
      >
        {type === 'single_select' ? (
          <ConfigHabitModalField
            label="Streak"
            info="Values that count toward maintaining a streak."
            className="config-habit-modal__field--option-pills"
          >
            <ConfigHabitStreakOptionsPills
              options={props.habitOptions}
              selected={props.streakOptions}
              onChange={(selected) => setStreakOptions?.(selected)}
            />
          </ConfigHabitModalField>
        ) : null}

        <StreakFrequencyField draft={draft} info={frequencyInfo} patch={patch} />

        <div className="config-habit-modal__checkbox-field">
          <input
            id="habit-streak-show-longest"
            className="config-habit-modal__checkbox"
            type="checkbox"
            checked={draft.streakShowLongest}
            onChange={(e) => patch({ streakShowLongest: e.target.checked })}
          />
          <ConfigHabitFieldLabel htmlFor="habit-streak-show-longest" label="Show longest streak" />
        </div>
      </Widget>
    </div>
  );
}
