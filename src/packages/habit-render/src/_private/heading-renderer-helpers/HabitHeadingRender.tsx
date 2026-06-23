// exclusive-bem-block: habit-heading
import type { ComponentType, ReactNode } from 'react';
import { Button } from '@habsum/ui/components/Button';
import { Icon } from '@habsum/ui/components/Icon';
import { classBuilder } from '@habsum/utils/class-builder';
import { habitDetailUrl } from '@habsum/utils/habit-id';

type HabitHeadingRenderProps = {
  user: string;
  habitName: string;
  className?: string;
  pending?: boolean;
  goalHit?: boolean;
  currentSearch?: string;
  LinkComponent?: ComponentType<{ to: string; className?: string; children: ReactNode }>;
  demo?: boolean;
  menuAriaLabel: string;
  onMenuClick: () => void;
  /** Right-side controls (e.g. summation count buttons). */
  actions?: ReactNode;
};

export function HabitHeadingRender({
  user,
  habitName,
  className,
  pending = false,
  goalHit = false,
  currentSearch,
  LinkComponent,
  demo = false,
  menuAriaLabel,
  onMenuClick,
  actions,
}: HabitHeadingRenderProps) {
  const to = habitDetailUrl(
    user,
    habitName,
    currentSearch ?? (typeof window !== 'undefined' ? window.location.search : ''),
  );

  return (
    <div className={classBuilder({}, ['habit-heading', className].filter(Boolean).join(' '))}>
      <div className="habit-heading__left">
        {goalHit ? (
          <Icon name="check" size="medium" className="habit-heading__goal-hit-check text-success" />
        ) : null}
        {demo ? (
          <span className="text-color-link text-h-m">{habitName}</span>
        ) : LinkComponent ? (
          <LinkComponent className="text-color-link text-h-m" to={to}>
            {habitName}
          </LinkComponent>
        ) : (
          <a className="text-color-link text-h-m" href={to}>
            {habitName}
          </a>
        )}
        {demo ? null : (
          <Button
            type="tertiary"
            size="small"
            icon="ellipsis-vertical"
            circle
            text=""
            disabled={pending}
            onClick={onMenuClick}
            aria-label={menuAriaLabel}
            className="habit-heading__menu"
          />
        )}
      </div>

      {actions ? <div className="habit-heading__actions">{actions}</div> : null}
    </div>
  );
}
