// exclusive-bem-block: ternary-checkbox
import { useId, type ButtonHTMLAttributes } from 'react';
import { Icon } from './Icon';
import { Hoverable } from './Hoverable';
import { classBuilder } from '../utils/class-builder';

export type TernaryCheckboxValue = 'yes' | 'no' | null;

export function nextTernaryCheckboxValue(value: TernaryCheckboxValue): TernaryCheckboxValue {
  if (value == null) return 'yes';
  if (value === 'yes') return 'no';
  return null;
}

type TernaryCheckboxProps = {
  value: TernaryCheckboxValue;
  valueLabel?: string;
  onChange: (value: TernaryCheckboxValue) => void;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onClick' | 'children' | 'value' | 'onChange'>;

export function TernaryCheckbox({
  value,
  valueLabel,
  onChange,
  className,
  type = 'button',
  'aria-describedby': ariaDescribedBy,
  ...props
}: TernaryCheckboxProps) {
  const tooltipId = useId();

  return (
    <Hoverable.Root>
      <Hoverable.Anchor className="ternary-checkbox__anchor">
        <button
          type={type}
          className={classBuilder(
            {
              'ternary-checkbox--yes': value === 'yes',
              'ternary-checkbox--no': value === 'no',
            },
            ['ternary-checkbox', className].filter(Boolean).join(' '),
          )}
          aria-describedby={
            [ariaDescribedBy, value != null ? tooltipId : undefined].filter(Boolean).join(' ') ||
            undefined
          }
          onClick={() => onChange(nextTernaryCheckboxValue(value))}
          {...props}
        >
          {value === 'yes' ? <Icon name="check" sizePx={24} className="text-success" /> : null}
          {value === 'no' ? <Icon name="close" sizePx={24} className="text-error" /> : null}
        </button>
      </Hoverable.Anchor>
      {value != null ? (
        <Hoverable.Content id={tooltipId} side="top">
          {valueLabel ?? value}
        </Hoverable.Content>
      ) : null}
    </Hoverable.Root>
  );
}
