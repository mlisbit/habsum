// exclusive-bem-block: config-habit-quick-add-pills
import { useState } from 'react';
import { Button } from '@habsum/ui/components/Button';
import { Input } from '@habsum/ui/components/Input';
import { EditablePill } from '@habsum/ui/components/Pill';
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

  const renameAt = (index: number, raw: string): boolean => {
    const label = parseQuickAddValue(raw);
    if (label == null) return raw.trim() === '';
    onChange(sortQuickAddItems(values.map((value, i) => (i === index ? label : value))));
    return true;
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
        <EditablePill
          key={`${label}-${index}`}
          value={label}
          role="listitem"
          dismissAriaLabel={`Remove ${label}`}
          onSubmit={(next) => renameAt(index, next)}
          onDismiss={() => removeAt(index)}
        />
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
        <Button
          type="tertiary"
          size="medium"
          icon="plus"
          circle
          className="config-habit-quick-add-pills__add"
          aria-label="Add quick add value"
          onClick={() => setAdding(true)}
        />
      )}
    </div>
  );
}
