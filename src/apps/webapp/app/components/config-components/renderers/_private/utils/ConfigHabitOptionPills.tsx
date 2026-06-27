// exclusive-bem-block: config-habit-option-pills
import { useState } from 'react';
import { Button } from '@habsum/ui/components/Button';
import { Input } from '@habsum/ui/components/Input';
import { EditablePill, TogglePill } from '@habsum/ui/components/Pill';

type ConfigHabitOptionsPillsProps = {
  options: string[];
  onChange: (options: string[]) => void;
};

export function ConfigHabitOptionsPills({ options, onChange }: ConfigHabitOptionsPillsProps) {
  const [adding, setAdding] = useState(false);
  const [addDraft, setAddDraft] = useState('');

  const removeOption = (label: string) => {
    onChange(options.filter((opt) => opt !== label));
  };

  const renameOption = (label: string, nextRaw: string): boolean => {
    const next = nextRaw.trim();
    if (next === '' || next === label) return true;
    if (options.includes(next)) return false;
    onChange(options.map((opt) => (opt === label ? next : opt)));
    return true;
  };

  const cancelAdd = () => {
    setAdding(false);
    setAddDraft('');
  };

  const submitAdd = (raw: string) => {
    const label = raw.trim();
    if (label === '') {
      cancelAdd();
      return;
    }
    if (options.includes(label)) {
      setAddDraft('');
      return;
    }
    onChange([...options, label]);
    cancelAdd();
  };

  return (
    <div className="config-habit-option-pills" role="list">
      {options.map((label) => (
        <EditablePill
          key={label}
          value={label}
          size="small"
          role="listitem"
          dismissAriaLabel={`Remove ${label}`}
          onSubmit={(next) => renameOption(label, next)}
          onDismiss={() => removeOption(label)}
        />
      ))}
      {adding ? (
        <Input
          className="config-habit-option-pills__add-input"
          size="small"
          submittable
          alwaysDismissable
          value={addDraft}
          onChange={setAddDraft}
          onSubmit={submitAdd}
          onReject={cancelAdd}
          placeholder="New option"
          applyAriaLabel="Add option"
          revertAriaLabel="Cancel"
        />
      ) : (
        <Button
          type="tertiary"
          size="small"
          icon="plus"
          text="Add"
          onClick={() => setAdding(true)}
        />
      )}
    </div>
  );
}

type ConfigHabitStreakOptionsPillsProps = {
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
};

export function ConfigHabitStreakOptionsPills({
  options,
  selected,
  onChange,
}: ConfigHabitStreakOptionsPillsProps) {
  const selectedSet = new Set(selected);

  if (options.length === 0) {
    return (
      <p className="config-habit-option-pills__empty text-b-s text-light">
        Add options above to choose tracking options.
      </p>
    );
  }

  return (
    <div className="config-habit-option-pills" role="list">
      {options.map((label) => (
        <TogglePill
          key={label}
          size="small"
          selected={selectedSet.has(label)}
          className="text-b-s"
          onToggle={(nextSelected) => {
            if (nextSelected) {
              onChange([...selected, label]);
              return;
            }
            onChange(selected.filter((opt) => opt !== label));
          }}
        >
          {label}
        </TogglePill>
      ))}
    </div>
  );
}
