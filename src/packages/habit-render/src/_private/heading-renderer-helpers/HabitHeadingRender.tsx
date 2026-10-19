// exclusive-bem-block: habit-heading
import { useCallback, type ComponentType, type ReactNode } from 'react';
import { Button } from '@habsum/ui/components/Button';
import { Icon } from '@habsum/ui/components/Icon';
import { useModal } from '@habsum/ui/contexts/modal';
import { classBuilder } from '@habsum/utils/class-builder';
import { HabitMenuModal } from './HabitMenuModal';

type HabitHeadingRenderProps = {
  user: string;
  habitName: string;
  ctaUrl?: string;
  className?: string;
  pending?: boolean;
  goalHit?: boolean;
  LinkComponent?: ComponentType<{ to: string; className?: string; children: ReactNode }>;
  onNavigate?: (url: string) => void;
  onReset: () => Promise<void>;
  demo?: boolean;
  /** Right-side controls (e.g. summation count buttons). */
  actions?: ReactNode;
};

export function HabitHeadingRender({
  user,
  habitName,
  ctaUrl,
  className,
  pending = false,
  goalHit = false,
  LinkComponent,
  onNavigate,
  onReset,
  demo = false,
  actions,
}: HabitHeadingRenderProps) {
  const { present, closeModal, closeModalThen } = useModal();
  const openMenu = useCallback(() => {
    present({
      content: (
        <HabitMenuModal
          user={user}
          habitName={habitName}
          onNavigate={onNavigate}
          closeModalThen={closeModalThen}
          onReset={async () => {
            await onReset();
            closeModal();
          }}
        />
      ),
    });
  }, [closeModal, closeModalThen, habitName, onNavigate, onReset, present, user]);

  return (
    <div className={classBuilder({}, ['habit-heading', className].filter(Boolean).join(' '))}>
      <div className="habit-heading__left">
        {goalHit ? (
          <Icon name="check" size="medium" className="habit-heading__goal-hit-check text-success" />
        ) : null}
        {demo || !ctaUrl ? (
          <span className="text-h-m">{habitName}</span>
        ) : LinkComponent ? (
          <LinkComponent className="text-color-link text-h-m" to={ctaUrl}>
            {habitName}
          </LinkComponent>
        ) : (
          <a className="text-color-link text-h-m" href={ctaUrl}>
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
            onClick={openMenu}
            aria-label={`More options for ${habitName}`}
            className="habit-heading__menu"
          />
        )}
      </div>

      {actions ? <div className="habit-heading__actions">{actions}</div> : null}
    </div>
  );
}
