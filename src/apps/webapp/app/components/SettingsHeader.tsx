import type { ElementType, ReactNode } from 'react';
import { InfoText } from '~/core-components/InfoText';

export type SettingsHeaderProps = {
  title: string;
  /** Optional supporting line under the title (does not change title size). */
  subtitle?: ReactNode;
  /** Error message shown under the title (e.g. failed save). */
  error?: string | null;
  /** Primary actions (e.g. Save / Cancel) aligned to the right of the title row. */
  actions?: ReactNode;
  titleAs?: 'h2' | 'h3';
  className?: string;
};

export function SettingsHeader({
  title,
  subtitle,
  error,
  actions,
  titleAs,
  className,
}: SettingsHeaderProps) {
  const headingLevel = titleAs ?? 'h2';
  const Heading = headingLevel as ElementType;
  const titleClassName = 'settings-header__title text-h-s';

  return (
    <header
      className={['settings-header', 'card-padding', 'settings-header--sticky', className]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="settings-header__row">
        <div className="settings-header__text">
          <Heading className={titleClassName}>{title}</Heading>
          {subtitle != null ? (
            <div className="settings-header__subtitle text-light text-b-m">{subtitle}</div>
          ) : null}
          {error != null && error !== '' ? (
            <InfoText variant="error" className="settings-header__error" id="settings-header-error">
              {error}
            </InfoText>
          ) : null}
        </div>
        {actions != null ? <div className="settings-header__actions">{actions}</div> : null}
      </div>
    </header>
  );
}
