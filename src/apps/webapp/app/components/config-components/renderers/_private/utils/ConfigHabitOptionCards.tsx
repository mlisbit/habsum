// exclusive-bem-block: config-habit-option-cards
import { useState } from 'react';
import type { SingleSelectOption } from '@habsum/types/common/habit';
import { Button } from '@habsum/ui/components/Button';
import { Input } from '@habsum/ui/components/Input';
import { EditablePill } from '@habsum/ui/components/Pill';

type ConfigHabitOptionCardsProps = {
  options: SingleSelectOption[];
  onChange: (options: SingleSelectOption[]) => void;
};

export function ConfigHabitOptionCards({ options, onChange }: ConfigHabitOptionCardsProps) {
  const [adding, setAdding] = useState(false);
  const [addDraft, setAddDraft] = useState('');

  const removeOption = (label: string) => {
    onChange(options.filter((opt) => opt.label !== label));
  };

  const renameOption = (label: string, nextRaw: string): boolean => {
    const next = nextRaw.trim();
    if (next === '' || next === label) return true;
    if (options.some((opt) => opt.label === next)) return false;
    onChange(options.map((opt) => (opt.label === label ? { ...opt, label: next } : opt)));
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
    if (options.some((opt) => opt.label === label)) {
      setAddDraft('');
      return;
    }
    onChange([...options, { label, sentiment: 'positive' }]);
    cancelAdd();
  };

  return (
    <div className="config-habit-option-cards" role="list">
      {options.map(({ label, sentiment }) => (
        <div key={label} className="config-habit-option-cards__card" role="listitem">
          <EditablePill
            value={label}
            size="small"
            className="config-habit-option-cards__label"
            onSubmit={(next) => renameOption(label, next)}
          />
          <select
            className="config-habit-option-cards__sentiment text-b-s"
            aria-label={`Sentiment for ${label}`}
            value={sentiment}
            onChange={(event) =>
              onChange(
                options.map((option) =>
                  option.label === label
                    ? {
                        ...option,
                        sentiment: event.target.value === 'negative' ? 'negative' : 'positive',
                      }
                    : option,
                ),
              )
            }
          >
            <option value="positive">Positive</option>
            <option value="negative">Negative</option>
          </select>
          <Button
            type="tertiary"
            size="small"
            icon="close"
            aria-label={`Remove ${label}`}
            onClick={() => removeOption(label)}
          />
        </div>
      ))}
      {adding ? (
        <Input
          className="config-habit-option-cards__add-input"
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
          type="secondary"
          size="small"
          icon="plus"
          text="Add"
          className="config-habit-option-cards__add"
          onClick={() => setAdding(true)}
        />
      )}
    </div>
  );
}
