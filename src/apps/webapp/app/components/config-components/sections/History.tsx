import { useId, useState } from 'react';
import { CollapsibleCard } from '@habsum/ui/components/CollapsibleCard';
import { Toggle } from '@habsum/ui/components/Toggle';
import { ConfigHabitFieldLabel } from '../ConfigHabitFieldLabel';

export function History() {
  const checkboxId = useId();
  const [enabled, setEnabled] = useState(false);

  return (
    <CollapsibleCard
      expanded={enabled}
      collapsible={enabled}
      onExpandedChange={setEnabled}
      className="config-habit-modal__collpasable-card"
    >
      <CollapsibleCard.Header>
        <div className="collapsible-card__header-main">
          <span onClick={(e) => e.stopPropagation()}>
            <Toggle
              id={checkboxId}
              checked={enabled}
              onChange={setEnabled}
              aria-label="Enable history"
            />
          </span>
          <div
            className="config-habit-modal__collapsible-header-label"
            onClick={(e) => e.stopPropagation()}
          >
            <ConfigHabitFieldLabel
              htmlFor={checkboxId}
              label="History"
              info="Manage history settings for this habit."
            />
          </div>
        </div>
        <CollapsibleCard.Toggle ariaLabel="Toggle history options" />
      </CollapsibleCard.Header>
      <CollapsibleCard.Content>
        <p className="text-b-m text-light config-habit-modal__section-placeholder">todo</p>
      </CollapsibleCard.Content>
    </CollapsibleCard>
  );
}
