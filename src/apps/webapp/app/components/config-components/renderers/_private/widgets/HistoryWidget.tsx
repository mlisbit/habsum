// exclusive-bem-block: widget-config-history
import { Input } from '@habsum/ui/components/Input';
import type { ConfigHabitDraft } from '~/api.client';
import { Widget } from './Widget';

type HistoryWidgetProps = {
  draft: ConfigHabitDraft;
  patch: (partial: Partial<ConfigHabitDraft>) => void;
};

export function HistoryWidget({ draft, patch }: HistoryWidgetProps) {
  const setHistoryEnabled = (historyEnabled: boolean) => {
    patch({
      historyEnabled,
      ...(historyEnabled
        ? {
            historyPeriodAmount: draft.historyPeriodAmount.trim() || '1',
            historyPeriodUnit: draft.historyPeriodUnit,
          }
        : {}),
    });
  };

  return (
    <div className="widget-config-history">
      <Widget
        checked={draft.historyEnabled}
        checkboxId="habit-history-enabled"
        label="History"
        onCheckedChange={setHistoryEnabled}
      >
        <div className="widget-config-history__length">
          <Input
            id="habit-history-amount"
            type="number"
            size="small"
            className="widget-config-history__length-input"
            value={draft.historyPeriodAmount}
            onChange={(historyPeriodAmount) => patch({ historyPeriodAmount })}
            placeholder="Length"
          />
          <span className="text-b-m text-light">weeks</span>
        </div>
      </Widget>
    </div>
  );
}
