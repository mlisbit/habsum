// exclusive-bem-block: summation-quick-add-options
import { useState } from 'react';
import { Button } from '@habsum/ui/components/Button';
import { Input } from '@habsum/ui/components/Input';
import { EditablePill } from '@habsum/ui/components/Pill';
import type { ConfigHabitDraft } from '~/api.client';
import { sortQuickAddItems } from '~/utils/configHabitDraft';

type SummationBaseOptionsProps = {
  draft: ConfigHabitDraft;
  patch: (partial: Partial<ConfigHabitDraft>) => void;
};

function parseQuickAddValue(raw: string): string | null {
  const t = raw.trim();
  if (t === '') return null;
  const n = Math.trunc(Number(t));
  if (!Number.isFinite(n)) return null;
  return String(n);
}

export function SummationBaseOptions({ draft, patch }: SummationBaseOptionsProps) {
  const { quickAddItems } = draft;
  const [addingQuickAdd, setAddingQuickAdd] = useState(false);
  const [quickAddDraft, setQuickAddDraft] = useState('');
  const showQuickAddText = quickAddItems.length === 0;

  const removeQuickAddAt = (index: number) => {
    patch({ quickAddItems: quickAddItems.filter((_, i) => i !== index) });
  };

  const renameQuickAddAt = (index: number, raw: string): boolean => {
    const label = parseQuickAddValue(raw);
    if (label == null) return raw.trim() === '';
    patch({
      quickAddItems: sortQuickAddItems(
        quickAddItems.map((value, i) => (i === index ? label : value)),
      ),
    });
    return true;
  };

  const cancelQuickAdd = () => {
    setAddingQuickAdd(false);
    setQuickAddDraft('');
  };

  const submitQuickAdd = (raw: string) => {
    const label = parseQuickAddValue(raw);
    if (label == null) {
      if (raw.trim() === '') cancelQuickAdd();
      return;
    }
    patch({ quickAddItems: sortQuickAddItems([...quickAddItems, label]) });
    cancelQuickAdd();
  };

  return (
    <div className="config-habit-modal__field-row">
      <div className="config-habit-modal__stacked-field">
        <div className="config-habit-modal__inline-field">
          <label htmlFor="habit-goal" className="text-h-xs">
            Goal
          </label>
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
      </div>

      <div className="config-habit-modal__stacked-field">
        <div className="summation-quick-add-options">
          <div className="summation-quick-add-options__header">
            <div className="summation-quick-add-options__label">
              <span className="text-h-xs">Quick add options</span>
              <p className="summation-quick-add-options__info text-b-s text-light">
                Frequently used amounts that can be added with one click.
              </p>
            </div>
            {!addingQuickAdd && showQuickAddText ? (
              <Button
                type="primary"
                color="muted"
                size="medium"
                icon="plus"
                text="Add"
                className="summation-quick-add-options__add"
                aria-label="Add quick add value"
                onClick={() => setAddingQuickAdd(true)}
              />
            ) : null}
          </div>

          <div className="summation-quick-add-options__values" role="list">
            {quickAddItems.map((label, index) => (
              <EditablePill
                key={`${label}-${index}`}
                value={label}
                role="listitem"
                dismissAriaLabel={`Remove ${label}`}
                onSubmit={(next) => renameQuickAddAt(index, next)}
                onDismiss={() => removeQuickAddAt(index)}
              />
            ))}
            {addingQuickAdd ? (
              <Input
                className="summation-quick-add-options__add-input"
                size="small"
                type="number"
                submittable
                alwaysDismissable
                allowNegative
                value={quickAddDraft}
                onChange={setQuickAddDraft}
                onSubmit={submitQuickAdd}
                onReject={cancelQuickAdd}
                placeholder="Amount"
                applyAriaLabel="Add quick add value"
                revertAriaLabel="Cancel"
              />
            ) : !showQuickAddText ? (
              <Button
                type="primary"
                color="muted"
                size="medium"
                icon="plus"
                circle
                className="summation-quick-add-options__add"
                aria-label="Add quick add value"
                onClick={() => setAddingQuickAdd(true)}
              />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
