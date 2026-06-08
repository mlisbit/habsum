import type { ReactNode } from 'react';
import { Link } from '@remix-run/react';
import { Button } from '@habsum/ui/components/Button';
import { Icon } from '@habsum/ui/components/Icon';
import { habitDetailUrl } from '~/utils/habit-id';

type HabitWidgetHeadingProps = {
  user: string;
  habitName: string;
  pending?: boolean;
  goalHit?: boolean;
  menuAriaLabel: string;
  onMenuClick: () => void;
  /** Right-side controls (e.g. summation count buttons). */
  actions?: ReactNode;
};

export function HabitWidgetHeading({
  user,
  habitName,
  pending = false,
  goalHit = false,
  menuAriaLabel,
  onMenuClick,
  actions,
}: HabitWidgetHeadingProps) {
  const to = habitDetailUrl(
    user,
    habitName,
    typeof window !== 'undefined' ? window.location.search : '',
  );

  return (
    <div className="habit-widget__heading">
      <div className="habit-widget__heading-left">
        {goalHit ? (
          <Icon name="check" size="medium" className="habit-widget__goal-hit-check text-success" />
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
          className="habit-widget__menu"
        />
      </div>

      {actions ? <div className="habit-widget__heading-actions">{actions}</div> : null}
    </div>
  );
}
