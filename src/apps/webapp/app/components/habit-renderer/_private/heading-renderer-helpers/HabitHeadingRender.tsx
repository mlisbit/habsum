// exclusive-bem-block: habit-heading
import type { ReactNode } from 'react';
import { Link } from '@remix-run/react';
import { Button } from '@habsum/ui/components/Button';
import { Icon } from '@habsum/ui/components/Icon';
import { habitDetailUrl } from '~/utils/habit-id';
import { classBuilder } from '~/utils/class-builder';

type HabitHeadingRenderProps = {
  user: string;
  habitName: string;
  className?: string;
  pending?: boolean;
  goalHit?: boolean;
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
  menuAriaLabel,
  onMenuClick,
  actions,
}: HabitHeadingRenderProps) {
  const to = habitDetailUrl(
    user,
    habitName,
    typeof window !== 'undefined' ? window.location.search : '',
  );

  return (
    <div className={classBuilder({}, ['habit-heading', className].filter(Boolean).join(' '))}>
      <div className="habit-heading__left">
        {goalHit ? (
          <Icon name="check" size="medium" className="habit-heading__goal-hit-check text-success" />
        ) : null}
        <Link className="text-color-link text-h-m" to={to}>
          {habitName}
        </Link>
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
      </div>

      {actions ? <div className="habit-heading__actions">{actions}</div> : null}
    </div>
  );
}
