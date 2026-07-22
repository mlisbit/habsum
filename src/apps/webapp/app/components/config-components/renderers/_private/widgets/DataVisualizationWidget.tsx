// exclusive-bem-block: widget-config-data-visualization
import { useState } from 'react';
import type { ConfigHabitDraft } from '~/api.client';
import { Widget } from './Widget';

const DEFAULT_WEEKLY_HISTORY_WEEKS = '3';

type DataVisualizationType = ConfigHabitDraft['historyDisplays'][number];

type DataVisualizationWidgetProps = {
  draft: ConfigHabitDraft;
  patch: (partial: Partial<ConfigHabitDraft>) => void;
  type: DataVisualizationType[];
};

function nextDisplays(
  current: ConfigHabitDraft['historyDisplays'],
  display: DataVisualizationType,
  shown: boolean,
) {
  if (shown) {
    return current.includes(display) ? current : [...current, display];
  }
  return current.filter((item) => item !== display);
}

const WEEKLY_HISTORY_OPTIONS = [
  { value: '1', label: '1 week' },
  { value: '2', label: '2 weeks' },
  { value: '3', label: '3 weeks' },
] as const;

type WeeklyHistoryValue = (typeof WEEKLY_HISTORY_OPTIONS)[number]['value'];

export function DataVisualizationWidget({ draft, patch, type }: DataVisualizationWidgetProps) {
  const [keepOpenWhenDisabled, setKeepOpenWhenDisabled] = useState(false);
  const activeDisplays = draft.historyEnabled ? draft.historyDisplays : [];
  const hasHeatmap = activeDisplays.includes('heatmap');
  const hasWeeklyHistory = activeDisplays.includes('weekly_history');
  const weeklyHistoryValue: WeeklyHistoryValue =
    hasWeeklyHistory && ['1', '2', '3'].includes(draft.historyPeriodAmount)
      ? (draft.historyPeriodAmount as WeeklyHistoryValue)
      : DEFAULT_WEEKLY_HISTORY_WEEKS;

  const setHistoryEnabled = (historyEnabled: boolean) => {
    setKeepOpenWhenDisabled(false);
    const supportedDisplays = draft.historyDisplays.filter((display) => type.includes(display));
    patch({
      historyEnabled,
      ...(historyEnabled
        ? {
            historyDisplays: supportedDisplays.length > 0 ? supportedDisplays : type.slice(0, 1),
            historyPeriodAmount: draft.historyPeriodAmount.trim() || DEFAULT_WEEKLY_HISTORY_WEEKS,
            historyPeriodUnit: 'w',
          }
        : {}),
    });
  };

  const patchDisplays = (
    displays: ConfigHabitDraft['historyDisplays'],
    extra?: Partial<ConfigHabitDraft>,
  ) => {
    const next = displays.filter((display) => type.includes(display));
    if (next.length === 0) {
      setKeepOpenWhenDisabled(true);
      patch({ historyEnabled: false, historyDisplays: [], averageEnabled: false });
      return;
    }
    setKeepOpenWhenDisabled(false);
    patch({
      historyEnabled: true,
      historyDisplays: next,
      historyPeriodUnit: 'w',
      ...(!next.includes('weekly_history') ? { averageEnabled: false } : {}),
      ...extra,
    });
  };

  const setHeatmapVisibility = (shown: boolean) => {
    patchDisplays(nextDisplays(activeDisplays, 'heatmap', shown));
  };

  const setWeeklyHistoryVisibility = (shown: boolean) => {
    patchDisplays(nextDisplays(activeDisplays, 'weekly_history', shown), {
      ...(shown ? { historyPeriodAmount: weeklyHistoryValue, historyPeriodUnit: 'w' } : {}),
    });
  };

  const setWeeklyHistoryWeeks = (weeks: WeeklyHistoryValue) => {
    patchDisplays(activeDisplays, {
      historyPeriodAmount: weeks,
      historyPeriodUnit: 'w',
    });
  };

  return (
    <div className="widget-config-data-visualization">
      <Widget
        checked={draft.historyEnabled}
        checkboxId="habit-history-enabled"
        expanded={draft.historyEnabled || keepOpenWhenDisabled}
        label="Data Visualization"
        onCheckedChange={setHistoryEnabled}
      >
        <div className="widget-config-data-visualization__options" aria-label="Data visualization">
          {type.includes('heatmap') ? (
            <label className="widget-config-data-visualization__option text-b-m">
              <input
                className="config-habit-modal__checkbox"
                type="checkbox"
                checked={hasHeatmap}
                onChange={(event) => setHeatmapVisibility(event.target.checked)}
              />
              Heatmap
            </label>
          ) : null}
          {type.includes('weekly_history') ? (
            <div className="widget-config-data-visualization__weekly">
              <label className="widget-config-data-visualization__option text-b-m">
                <input
                  className="config-habit-modal__checkbox"
                  type="checkbox"
                  checked={hasWeeklyHistory}
                  onChange={(event) => setWeeklyHistoryVisibility(event.target.checked)}
                />
                Weekly history
              </label>
              <select
                className="config-habit-modal__select widget-config-data-visualization__weekly-select text-b-m"
                aria-label="Weekly history period"
                value={weeklyHistoryValue}
                disabled={!hasWeeklyHistory}
                onChange={(event) =>
                  setWeeklyHistoryWeeks(event.target.value as WeeklyHistoryValue)
                }
              >
                {WEEKLY_HISTORY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </div>
      </Widget>
    </div>
  );
}
