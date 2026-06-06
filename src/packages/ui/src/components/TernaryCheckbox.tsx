// exclusive-bem-block: ternary-checkbox
import type { ButtonHTMLAttributes } from 'react';
import { Icon } from './Icon';
import { classBuilder } from '../utils/class-builder';

export type TernaryCheckboxValue = 'yes' | 'no' | null;

export function nextTernaryCheckboxValue(value: TernaryCheckboxValue): TernaryCheckboxValue {
  if (value == null) return 'yes';
  if (value === 'yes') return 'no';
  return null;
}

type TernaryCheckboxProps = {
  value: TernaryCheckboxValue;
  onChange: (value: TernaryCheckboxValue) => void;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onClick' | 'children' | 'value' | 'onChange'>;

export function TernaryCheckbox({
  value,
  onChange,
  className,
  type = 'button',
  ...props
}: TernaryCheckboxProps) {
  return (
    <button
      type={type}
      className={classBuilder(
        {
          'ternary-checkbox--yes': value === 'yes',
          'ternary-checkbox--no': value === 'no',
        },
        ['ternary-checkbox', className].filter(Boolean).join(' '),
      )}
      onClick={() => onChange(nextTernaryCheckboxValue(value))}
      {...props}
    >
      {value === 'yes' ? <Icon name="check" sizePx={24} className="text-success" /> : null}
      {value === 'no' ? <Icon name="close" sizePx={24} className="text-error" /> : null}
    </button>
  );
}
