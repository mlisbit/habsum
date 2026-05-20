// exclusive-bem-block: config-habit-quick-add-pills
import { useState } from 'react';
import { Icon } from '~/core-components/Icon';
import { Input } from '~/core-components/Input';
import { DismissablePill } from '~/core-components/Pill';
import { sortQuickAddItems } from '~/utils/configHabitDraft';

type ConfigHabitQuickAddPillsProps = {
  values: string[];
  onChange: (values: string[]) => void;
};

function parseQuickAddValue(raw: string): string | null {
  const t = raw.trim();
  if (t === '') return null;
  const n = Math.trunc(Number(t));
  if (!Number.isFinite(n)) return null;
  return String(n);
}

export function ConfigHabitQuickAddPills({ values, onChange }: ConfigHabitQuickAddPillsProps) {
  const [adding, setAdding] = useState(false);
  const [addDraft, setAddDraft] = useState('');

  const removeAt = (index: number) => {
    onChange(values.filter((_, i) => i !== index));
  };

  const cancelAdd = () => {
    setAdding(false);
    setAddDraft('');
  };

  const submitAdd = (raw: string) => {
    const label = parseQuickAddValue(raw);
    if (label == null) {
      if (raw.trim() === '') cancelAdd();
      return;
    }
    onChange(sortQuickAddItems([...values, label]));
    cancelAdd();
  };

  return (
    <div className="config-habit-quick-add-pills" role="list">
      {values.map((label, index) => (
        <DismissablePill
          key={`${label}-${index}`}
          role="listitem"
          className="text-b-m"
          dismissAriaLabel={`Remove ${label}`}
          onDismiss={() => removeAt(index)}
        >
          {label}
        </DismissablePill>
      ))}
      {adding ? (
        <Input
          className="config-habit-quick-add-pills__add-input"
          size="small"
          type="number"
          submittable
          alwaysDismissable
          allowNegative
          value={addDraft}
          onChange={setAddDraft}
          onSubmit={submitAdd}
          onReject={cancelAdd}
          placeholder="Amount"
          applyAriaLabel="Add quick add value"
          revertAriaLabel="Cancel"
        />
      ) : (
        <button
          type="button"
          className="pill config-habit-quick-add-pills__add text-b-m"
          aria-label="Add quick add value"
          onClick={() => setAdding(true)}
        >
          <Icon name="plus" size="small" />
        </button>
      )}
    </div>
  );
}
