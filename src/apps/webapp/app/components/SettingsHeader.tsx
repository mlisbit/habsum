import type { ElementType, ReactNode } from 'react';
import { InfoText } from '@habsum/ui/components/InfoText';

export type SettingsHeaderProps = {
  title: string;
  /** Optional supporting line under the title (does not change title size). */
  subtitle?: ReactNode;
  /** Error message shown under the title (e.g. failed save). */
  error?: string | null;
  /** Primary actions (e.g. Save / Cancel) aligned to the right of the title row. */
  actions?: ReactNode;
  titleAs?: 'h2' | 'h3';
  titleClassName?: string;
  className?: string;
};

export function SettingsHeader({
  title,
  subtitle,
  error,
  actions,
  titleAs,
  titleClassName,
  className,
}: SettingsHeaderProps) {
  const headingLevel = titleAs ?? 'h2';
  const Heading = headingLevel as ElementType;
  const resolvedTitleClassName = ['settings-header__title text-h-s', titleClassName]
    .filter(Boolean)
    .join(' ');

  return (
    <header className={['settings-header', 'card-padding', className].filter(Boolean).join(' ')}>
      <div className="settings-header__row">
        <div className="settings-header__text">
          <Heading className={resolvedTitleClassName}>{title}</Heading>
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
  );
}
