// exclusive-bem-block: config-widget
import type { ReactNode } from 'react';
import { CollapsibleCard } from '@habsum/ui/components/CollapsibleCard';
import { Toggle } from '@habsum/ui/components/Toggle';
import { ConfigHabitFieldLabel } from '../../../ConfigHabitFieldLabel';

type WidgetProps = {
  checked: boolean;
  checkboxId: string;
  children: ReactNode;
  label: string;
  onCheckedChange: (checked: boolean) => void;
  subheader?: string;
  tooltip?: string;
};

export function Widget({
  checked,
  checkboxId,
  children,
  label,
  onCheckedChange,
  subheader,
  tooltip,
}: WidgetProps) {
  return (
    <CollapsibleCard expanded={checked} collapsible={checked} className="config-widget">
      <CollapsibleCard.Header>
        <div className="collapsible-card__header-main">
          <div className="config-widget__header-label" onClick={(e) => e.stopPropagation()}>
            <ConfigHabitFieldLabel htmlFor={checkboxId} label={label} tooltip={tooltip} />
            {subheader ? (
              <p className="config-widget__subheader text-b-s text-light">{subheader}</p>
            ) : null}
          </div>
          <span className="config-widget__toggle" onClick={(e) => e.stopPropagation()}>
            <Toggle
              id={checkboxId}
              checked={checked}
              onChange={onCheckedChange}
              aria-label={`${checked ? 'Disable' : 'Enable'} ${label}`}
            />
          </span>
        </div>
      </CollapsibleCard.Header>
      <CollapsibleCard.Content className="flex flex-flow-col gap-3">
        {children}
      </CollapsibleCard.Content>
    </CollapsibleCard>
  );
}
