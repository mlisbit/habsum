import type { ElementType, ReactNode } from 'react';
import { Button } from '@habsum/ui/components/Button';
import { InfoText } from '@habsum/ui/components/InfoText';

type SettingsPageCardProps = {
  headerText: string;
  children?: ReactNode;
  actions?: ReactNode;
  onBack?: () => void;
  subtitle?: ReactNode;
  error?: string | null;
  headerAs?: 'h2' | 'h3';
  headerClassName?: string;
  className?: string;
};

export function SettingsPageCard({
  headerText,
  children,
  actions,
  onBack,
  subtitle,
  error,
  headerAs,
  headerClassName,
  className,
}: SettingsPageCardProps) {
  const Heading = (headerAs ?? 'h2') as ElementType;
  const resolvedHeaderClassName = ['settings-header__title text-h-s', headerClassName]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={['card card--no-padding', className].filter(Boolean).join(' ')}>
      <header className="settings-header card-padding">
        <div className="settings-header__row">
          {onBack ? (
            <Button
              type="tertiary"
              icon="chevronBack"
              circle
              className="settings-header__back"
              aria-label="Back"
              onClick={onBack}
            />
          ) : null}
          <div className="settings-header__text">
            <Heading className={resolvedHeaderClassName}>{headerText}</Heading>
            {subtitle != null ? (
              <div className="settings-header__subtitle text-light text-b-m">{subtitle}</div>
            ) : null}
            {error != null && error !== '' ? (
              <InfoText
                size="small"
                variant="error"
                className="settings-header__error"
                id="settings-header-error"
              >
                {error}
              </InfoText>
            ) : null}
          </div>
          {actions != null ? <div className="settings-header__actions">{actions}</div> : null}
        </div>
      </header>
      {children ?? null}
    </div>
  );
}
