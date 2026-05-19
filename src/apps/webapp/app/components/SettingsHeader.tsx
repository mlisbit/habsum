import type { ElementType, ReactNode } from 'react';

export type SettingsHeaderProps = {
  title: string;
  /** Optional supporting line under the title (does not change title size). */
  subtitle?: ReactNode;
  /** Primary actions (e.g. Save / Cancel) aligned to the right of the title row. */
  actions?: ReactNode;
  /**
   * Section header inside a card: smaller title type and `h3` by default.
   * Page-level headers omit this for the large title style.
   */
  isEmbedded?: boolean;
  titleAs?: 'h2' | 'h3';
  className?: string;
};

export function SettingsHeader({
  title,
  subtitle,
  actions,
  isEmbedded = false,
  titleAs,
  className,
}: SettingsHeaderProps) {
  const headingLevel = titleAs ?? (isEmbedded ? 'h3' : 'h2');
  const Heading = headingLevel as ElementType;
  const titleClassName = isEmbedded
    ? 'settings-header__title text-h-s'
    : 'settings-header__title text-h-l';

  return (
    <header
      className={[
        'settings-header',
        'card-padding',
        !isEmbedded && 'settings-header--sticky',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="settings-header__row">
        <div className="settings-header__text">
          <Heading className={titleClassName}>{title}</Heading>
          {subtitle != null ? (
            <div className="settings-header__subtitle text-light text-b-m">{subtitle}</div>
          ) : null}
        </div>
        {actions != null ? <div className="settings-header__actions">{actions}</div> : null}
      </div>
    </header>
  );
}
