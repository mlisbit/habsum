// exclusive-bem-block: toggle
import type { ButtonHTMLAttributes } from 'react';
import { Icon, type IconName } from './Icon';
import { classBuilder } from '../utils/class-builder';

type ToggleSize = 'small' | 'medium';

type ToggleProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  size?: ToggleSize;
  checkedLabel?: string;
  uncheckedLabel?: string;
  checkedIllustration?: IconName;
  uncheckedIllustration?: IconName;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'onChange' | 'onClick' | 'role'>;

export function Toggle({
  checked,
  onChange,
  size = 'small',
  checkedLabel,
  uncheckedLabel,
  checkedIllustration,
  uncheckedIllustration,
  className,
  type = 'button',
  ...props
}: ToggleProps) {
  const label = checked ? checkedLabel : uncheckedLabel;
  const hasIllustrations = checkedIllustration != null && uncheckedIllustration != null;
  const illustrationSize = size === 'medium' ? 'medium' : 'small';

  return (
    <button
      type={type}
      role="switch"
      aria-checked={checked}
      className={classBuilder(
        {
          'toggle--checked': checked,
          'toggle--with-label': label != null,
          'toggle--medium': size === 'medium',
          'toggle--small': size === 'small',
        },
        ['toggle', className].filter(Boolean).join(' '),
      )}
      onClick={() => onChange(!checked)}
      {...props}
    >
      <span className="toggle__track" aria-hidden>
        {hasIllustrations ? (
          <>
            <span className="toggle__illustration toggle__illustration--unchecked">
              <Icon name={uncheckedIllustration} size={illustrationSize} className="text-inverse" />
            </span>
            <span className="toggle__illustration toggle__illustration--checked">
              <Icon name={checkedIllustration} size={illustrationSize} className="text-light" />
            </span>
          </>
        ) : null}
        <span className="toggle__thumb" />
      </span>
      {label != null ? <span className="toggle__label text-b-m">{label}</span> : null}
    </button>
  );
}
