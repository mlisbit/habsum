// exclusive-bem-block: config-habit-option-pills
import { useState } from 'react';
import { Icon } from '~/core-components/Icon';
import { Input } from '~/core-components/Input';
import { DismissablePill, Pill } from '~/core-components/Pill';

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
        <DismissablePill
          key={label}
          role="listitem"
          className="text-b-m"
          dismissAriaLabel={`Remove ${label}`}
          onDismiss={() => removeOption(label)}
        >
          {label}
        </DismissablePill>
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
        <button
          type="button"
          className="pill config-habit-option-pills__add text-b-m"
          aria-label="Add option"
          onClick={() => setAdding(true)}
        >
          <Icon name="plus" size="small" />
        </button>
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
        <Pill
          key={label}
          selected={selectedSet.has(label)}
          className="text-b-m"
          onToggle={(nextSelected) => {
            if (nextSelected) {
              onChange([...selected, label]);
              return;
            }
            onChange(selected.filter((opt) => opt !== label));
          }}
        >
          {label}
        </Pill>
      ))}
    </div>
  );
}
