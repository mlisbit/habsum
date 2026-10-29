// exclusive-bem-block: widget-config-insights
import { useState } from 'react';
import { Button } from '@habsum/ui/components/Button';
import type { ConfigHabitDraft } from '~/api.client';
import { classBuilder } from '~/utils/class-builder';
import { Widget } from './Widget';

type BaseInsightsWidgetProps = {
  draft: ConfigHabitDraft;
  patch: (partial: Partial<ConfigHabitDraft>) => void;
  onOpenStreakOptions: () => void;
};

type SingleSelectInsightsWidgetProps = BaseInsightsWidgetProps & {
  type: 'single_select';
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
  return {};
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
              onChange={(event) => {
                const checked = event.target.checked;
                patchInsight({
                  averageEnabled: checked,
                  ...(checked
                    ? {
                        historyEnabled: true,
                        historyDisplays: draft.historyDisplays.includes('weekly_history')
                          ? draft.historyDisplays
                          : [...draft.historyDisplays, 'weekly_history'],
                      }
                    : {}),
                });
              }}
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

  return (
    <div className="widget-config-insights__streak-modal-fields">
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
