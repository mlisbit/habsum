import type { ReactNode } from 'react';
import { Link } from '@remix-run/react';
import { Button } from '@habsum/ui/components/Button';
import { habitDetailUrl } from '~/utils/habit-id';

type HabitWidgetHeadingProps = {
  user: string;
  habitName: string;
  pending?: boolean;
  menuAriaLabel: string;
  onMenuClick: () => void;
  /** Right-side controls (e.g. summation count buttons). */
  actions?: ReactNode;
};

export function HabitWidgetHeading({
  user,
  habitName,
  pending = false,
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
      <Link className="text-color-link text-h-m" to={to}>
        {habitName}
      </Link>
      <Button
        type="tertiary"
        size="medium"
        icon="ellipsis-vertical"
        circle
        text=""
        disabled={pending}
        onClick={onMenuClick}
        aria-label={menuAriaLabel}
        className="habit-widget__menu"
      />
      {actions ? <div className="habit-widget__heading-actions">{actions}</div> : null}
    </div>
  );
}
