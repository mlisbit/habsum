import { ModalBody, ModalHeader } from '~/context/modal';
import { InfoText } from '~/core-components/InfoText';
import { Input } from '~/core-components/Input';
import { ConfigHabitFieldLabel } from '../ConfigHabitFieldLabel';
import { ConfigHabitQuickAddPills } from '../ConfigHabitQuickAddPills';
import {
  ConfigHabitModalActions,
  ConfigHabitModalField,
  useConfigHabitModalDraft,
  type ConfigHabitModalProps,
} from '../ConfigHabitModalShared';
import { sortQuickAddItems } from '~/utils/configHabitDraft';

export function ConfigSummationHabitModal(props: ConfigHabitModalProps) {
  const {
    draft,
    dirty,
    editingHabitName,
    error,
    handleDoneClick,
    handleRemoveClick,
    patch,
    saving,
  } = useConfigHabitModalDraft(props);
  const { onCancel } = props;
  const goalEnabled = draft.goal.trim() !== '';
  const quickAddEnabled = draft.quickAddItems.length > 0;

  const setGoalEnabled = (enabled: boolean) => {
    patch({ goal: enabled ? draft.goal.trim() || '1' : '' });
  };

  const setQuickAddEnabled = (enabled: boolean) => {
    if (enabled) {
      patch({
        quickAddItems:
          draft.quickAddItems.length > 0 ? draft.quickAddItems : sortQuickAddItems(['1', '10']),
      });
      return;
    }
    patch({ quickAddItems: [] });
  };

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
    <>
      <ModalHeader>Editing "{editingHabitName}"</ModalHeader>
      <ModalBody className="config-habit-modal">
        <ConfigHabitModalField label="Name" htmlFor="habit-name">
          <Input
            id="habit-name"
            className="config-habit-modal__name"
            value={draft.name}
            size="small"
            onChange={(name) => patch({ name })}
            placeholder="Habit name"
          />
        </ConfigHabitModalField>

        <div className="config-habit-modal__field">
          <div className="config-habit-modal__label config-habit-modal__checkbox-field">
            <input
              id="habit-goal-enabled"
              className="config-habit-modal__checkbox"
              type="checkbox"
              checked={goalEnabled}
              onChange={(e) => setGoalEnabled(e.target.checked)}
            />
            <ConfigHabitFieldLabel
              htmlFor="habit-goal-enabled"
              label="Goal"
              info="Reach this amount to complete the habit."
            />
          </div>
          <div className="config-habit-modal__control">
            {goalEnabled ? (
              <Input
                id="habit-goal"
                type="number"
                size="small"
                className="config-habit-modal__input"
                value={draft.goal}
                onChange={(goal) => patch({ goal })}
                placeholder="Goal"
              />
            ) : null}
          </div>
        </div>

        <div className="config-habit-modal__field config-habit-modal__field--option-pills">
          <div className="config-habit-modal__label config-habit-modal__checkbox-field">
            <input
              id="habit-quick-add-enabled"
              className="config-habit-modal__checkbox"
              type="checkbox"
              checked={quickAddEnabled}
              onChange={(e) => setQuickAddEnabled(e.target.checked)}
            />
            <ConfigHabitFieldLabel
              htmlFor="habit-quick-add-enabled"
              label="Quick add options"
              info="Frequently used amounts that can be added with one click."
            />
          </div>
          <div className="config-habit-modal__control">
            {quickAddEnabled ? (
              <ConfigHabitQuickAddPills
                values={draft.quickAddItems}
                onChange={(quickAddItems) => patch({ quickAddItems })}
              />
            ) : null}
          </div>
        </div>

        <div className="config-habit-modal__field">
          <div className="config-habit-modal__label config-habit-modal__checkbox-field">
            <input
              id="habit-history-enabled"
              className="config-habit-modal__checkbox"
              type="checkbox"
              checked={draft.historyEnabled}
              onChange={(e) => setHistoryEnabled(e.target.checked)}
            />
            <ConfigHabitFieldLabel
              htmlFor="habit-history-enabled"
              label="History"
              info="Show a chart of past entries for this habit."
            />
          </div>
          <div className="config-habit-modal__control">
            {draft.historyEnabled ? (
              <div className="config-habit-modal__history-length">
                <Input
                  id="habit-history-amount"
                  type="number"
                  size="small"
                  className="config-habit-modal__history-length-input"
                  value={draft.historyPeriodAmount}
                  onChange={(historyPeriodAmount) => patch({ historyPeriodAmount })}
                  placeholder="Length"
                />
                <span className="text-b-m text-light">weeks</span>
              </div>
            ) : null}
          </div>
        </div>

        {error != null ? (
          <InfoText variant="error" className="config-habit-modal__error">
            {error}
          </InfoText>
        ) : null}
      </ModalBody>
      <ConfigHabitModalActions
        dirty={dirty}
        saving={saving}
        onCancel={onCancel}
        onRemoveClick={() => void handleRemoveClick()}
        onDoneClick={() => void handleDoneClick()}
      />
    </>
  );
}
