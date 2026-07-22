// exclusive-bem-block: widget-config-insights
import { useState } from 'react';
import { Button } from '@habsum/ui/components/Button';
import type { ConfigHabitDraft } from '~/api.client';
import { ConfigHabitStreakOptionsPills } from '../utils/ConfigHabitOptionPills';
import { formatOptionLines } from '~/utils/configHabitDraft';
import { classBuilder } from '~/utils/class-builder';
import { Widget } from './Widget';

type BaseInsightsWidgetProps = {
  draft: ConfigHabitDraft;
  patch: (partial: Partial<ConfigHabitDraft>) => void;
  onOpenStreakOptions: () => void;
};

type SingleSelectInsightsWidgetProps = BaseInsightsWidgetProps & {
  type: 'single_select';
  habitOptions: string[];
  streakOptions: string[];
};

type SummationInsightsWidgetProps = BaseInsightsWidgetProps & {
  type: 'summation';
};

export type InsightsWidgetProps = SingleSelectInsightsWidgetProps | SummationInsightsWidgetProps;

type StreakOptionsFieldsProps =
  | Omit<SingleSelectInsightsWidgetProps, 'onOpenStreakOptions'>
  | Omit<SummationInsightsWidgetProps, 'onOpenStreakOptions'>;

function streakDefaults(props: InsightsWidgetProps): Partial<ConfigHabitDraft> {
  if (props.type === 'summation') {
    return props.draft.goal.trim() === '' ? { goal: '1' } : {};
  }
  if (props.streakOptions.length > 0 || props.habitOptions.length === 0) return {};
  return { streakOptionsText: formatOptionLines(props.habitOptions.slice(0, 1)) };
}

export function InsightsWidget(props: InsightsWidgetProps) {
  const { draft, patch, type, onOpenStreakOptions } = props;
  const [keepOpenWhenDisabled, setKeepOpenWhenDisabled] = useState(false);
  const enabled = draft.averageEnabled || draft.streakShowCurrent || draft.streakShowLongest;
  const streakEnabled = draft.streakShowCurrent || draft.streakShowLongest;

  const patchInsight = (partial: Partial<ConfigHabitDraft>) => {
    const next = { ...draft, ...partial };
    const nextEnabled = next.averageEnabled || next.streakShowCurrent || next.streakShowLongest;
    setKeepOpenWhenDisabled(!nextEnabled);
    patch(partial);
  };

  const setInsightsEnabled = (nextEnabled: boolean) => {
    setKeepOpenWhenDisabled(false);
    if (!nextEnabled) {
      patch({
        averageEnabled: false,
        streakShowCurrent: false,
        streakShowLongest: false,
      });
      return;
    }
    patch({ streakShowCurrent: true, ...streakDefaults(props) });
  };

  const setStreakInsight = (field: 'streakShowCurrent' | 'streakShowLongest', checked: boolean) => {
    patchInsight({ [field]: checked, ...(checked ? streakDefaults(props) : {}) });
  };

  return (
    <div className="widget-config-insights">
      <Widget
        checked={enabled}
        checkboxId="habit-insights-enabled"
        expanded={enabled || keepOpenWhenDisabled}
        label="Insights"
        onCheckedChange={setInsightsEnabled}
      >
        <div className="widget-config-insights__options" aria-label="Insights">
          <label
            className={classBuilder(
              { 'text-light': type !== 'summation' },
              'widget-config-insights__option text-b-m',
            )}
          >
            <input
              className="config-habit-modal__checkbox"
              type="checkbox"
              checked={draft.averageEnabled}
              disabled={type !== 'summation'}
              onChange={(event) => patchInsight({ averageEnabled: event.target.checked })}
            />
            Average
          </label>

          <div className="widget-config-insights__streak-options">
            <div className="widget-config-insights__streak-toggles">
              <label className="widget-config-insights__option text-b-m">
                <input
                  className="config-habit-modal__checkbox"
                  type="checkbox"
                  checked={draft.streakShowLongest}
                  onChange={(event) => setStreakInsight('streakShowLongest', event.target.checked)}
                />
                Longest streak
              </label>
              <label className="widget-config-insights__option text-b-m">
                <input
                  className="config-habit-modal__checkbox"
                  type="checkbox"
                  checked={draft.streakShowCurrent}
                  onChange={(event) => setStreakInsight('streakShowCurrent', event.target.checked)}
                />
                Current streak
              </label>
            </div>
            {streakEnabled ? (
              <Button
                type="tertiary"
                size="small"
                text="Streak Options"
                className="widget-config-insights__streak-options-cta"
                onClick={onOpenStreakOptions}
              />
            ) : null}
          </div>
        </div>
      </Widget>
    </div>
  );
}

export function StreakOptionsFields(props: StreakOptionsFieldsProps) {
  const { draft, patch, type } = props;
  const frequencyInfo =
    type === 'summation'
      ? 'Reach the goal at least this many days each week to continue your streak.'
      : 'Complete this habit at least this many days each week to continue your streak.';

  const setStreakOptions =
    type === 'single_select'
      ? (selected: string[]) => {
          const selectedSet = new Set(selected);
          patch({
            streakOptionsText: formatOptionLines(
              props.habitOptions.filter((option) => selectedSet.has(option)),
            ),
          });
        }
      : null;

  return (
    <div className="widget-config-insights__streak-modal-fields">
      {type === 'single_select' ? (
        <div className="config-habit-modal__field config-habit-modal__field--option-pills">
          <div className="config-habit-modal__label">
            <span className="text-b-m">Streak</span>
            <p className="config-habit-modal__field-info text-b-s text-light">
              Values that count toward maintaining a streak.
            </p>
          </div>
          <div className="config-habit-modal__control">
            <ConfigHabitStreakOptionsPills
              options={props.habitOptions}
              selected={props.streakOptions}
              onChange={setStreakOptions ?? (() => undefined)}
            />
          </div>
        </div>
      ) : null}

      <div className="config-habit-modal__field">
        <div className="config-habit-modal__label">
          <label htmlFor="habit-streak-frequency" className="text-b-m">
            Frequency
          </label>
          <p className="config-habit-modal__field-info text-b-s text-light">{frequencyInfo}</p>
        </div>
        <div className="config-habit-modal__control">
          <select
            id="habit-streak-frequency"
            className="config-habit-modal__select text-b-m"
            value={draft.streakFrequencyPerWeek}
            onChange={(event) => patch({ streakFrequencyPerWeek: event.target.value })}
          >
            {Array.from({ length: 7 }, (_, index) => {
              const days = index + 1;
              const value = String(days);
              return (
                <option key={value} value={value}>
                  {days === 1 ? '1 day per week' : `${days} days per week`}
                </option>
              );
            })}
          </select>
        </div>
      </div>
    </div>
  );
}
