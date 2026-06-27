import { Input } from '@habsum/ui/components/Input';
import type { ConfigHabitDraft } from '~/api.client';
import { ConfigHabitFieldLabel } from '../../../ConfigHabitFieldLabel';
import { SummationQuickAddOptions } from '../utils/SummationQuickAddOptions';

type SummationBaseOptionsProps = {
  draft: ConfigHabitDraft;
  patch: (partial: Partial<ConfigHabitDraft>) => void;
};

export function SummationBaseOptions({ draft, patch }: SummationBaseOptionsProps) {
  return (
    <div className="config-habit-modal__field-row">
      <div className="config-habit-modal__stacked-field">
        <div className="config-habit-modal__stacked-label">
          <ConfigHabitFieldLabel
            htmlFor="habit-goal"
            label="Goal"
            info="Reach this amount to complete the habit."
          />
        </div>
        <Input
          id="habit-goal"
          type="number"
          size="small"
          className="config-habit-modal__input"
          value={draft.goal}
          onChange={(goal) => patch({ goal })}
          placeholder="No goal"
        />
      </div>

      <div className="config-habit-modal__stacked-field">
        <div className="config-habit-modal__stacked-label">
          <ConfigHabitFieldLabel
            label="Quick add options"
            info="Frequently used amounts that can be added with one click."
          />
        </div>
        <SummationQuickAddOptions
          values={draft.quickAddItems}
          onChange={(quickAddItems) => patch({ quickAddItems })}
        />
      </div>
    </div>
  );
}
