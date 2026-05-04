import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import type { InputHTMLAttributes, KeyboardEvent } from 'react';
import { Button } from '~/core-components/Button';

function sanitizeDigitsOnly(raw: string): string {
  return raw.replace(/\D/g, '');
}

/** Must match `input--reject-flash` animation duration in SCSS. */
const REJECT_FLASH_MS = 480;

export type InputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type' | 'value' | 'onSubmit' | 'onChange' | 'className' | 'disabled' | 'placeholder'
> & {
  type?: 'string' | 'number';
  value?: string;
  onChange?: (raw: string) => void;
  onSubmit?: (raw: string) => void;
  onReject?: () => void;
  dismissable?: boolean;
  alwaysDismissable?: boolean;
  submittable?: boolean;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  inputClassName?: string;
  applyAriaLabel?: string;
  revertAriaLabel?: string;
};

/**
 * An input component.
 * Has a little "x" that will clear the input to the right.
 * Has an inline submit button to the right if "submittable" is true.
 * if type is "number", the input will only accept digits, and will flash red on invalid input.
 */
export function Input({
  value = '',
  type: fieldType = 'string',
  onChange,
  onSubmit,
  onReject,
  dismissable = false,
  submittable = false,
  disabled = false,
  alwaysDismissable = false,
  className,
  inputClassName,
  applyAriaLabel,
  revertAriaLabel,
  placeholder,
  autoComplete,
  inputMode,
  pattern,
  ...inputProps
}: InputProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const computeSeedDraft = (v: string) => (fieldType === 'number' ? sanitizeDigitsOnly(v) : v);

  const [draft, setDraft] = useState(() => computeSeedDraft(value));
  const [rejectFlash, setRejectFlash] = useState(false);
  const rejectFlashEndTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    setDraft(fieldType === 'number' ? sanitizeDigitsOnly(value) : value);
  }, [fieldType, value]);

  const canSubmit = draft.trim() !== '';
  const showDismissButton = alwaysDismissable || (dismissable && canSubmit);

  useLayoutEffect(() => {
    queueMicrotask(() => inputRef.current?.focus());
  }, []);

  useEffect(
    () => () => {
      if (rejectFlashEndTimerRef.current !== undefined) {
        clearTimeout(rejectFlashEndTimerRef.current);
      }
    },
    [],
  );

  const rootClass = [
    'input',
    !submittable && 'input--not-submittable',
    showDismissButton && 'input--dismissable',
    rejectFlash && 'input--reject-flash',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const isNumberField = fieldType === 'number';

  const pulseRejectFlash = () => {
    if (rejectFlashEndTimerRef.current !== undefined) {
      clearTimeout(rejectFlashEndTimerRef.current);
      rejectFlashEndTimerRef.current = undefined;
    }
    setRejectFlash(false);
    queueMicrotask(() => {
      setRejectFlash(true);
      rejectFlashEndTimerRef.current = setTimeout(() => {
        setRejectFlash(false);
        rejectFlashEndTimerRef.current = undefined;
      }, REJECT_FLASH_MS);
    });
  };

  const handleReject = () => {
    if (onReject) {
      onReject();
      return;
    }
    const nextDraft = computeSeedDraft(value);
    setDraft(nextDraft);
    if (!submittable) onChange?.(nextDraft);
  };

  const handleDraftChange = (raw: string) => {
    if (isNumberField && sanitizeDigitsOnly(raw) !== raw) {
      pulseRejectFlash();
    }
    const nextDraft = isNumberField ? sanitizeDigitsOnly(raw) : raw;
    setDraft(nextDraft);
    if (!submittable) onChange?.(nextDraft);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      handleReject();
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!submittable) return;
      if (!canSubmit) return;
      onSubmit?.(draft);
    }
  };

  const dismissButton = showDismissButton ? (
    <Button
      type="tertiary"
      size="tiny"
      icon="close"
      circle
      disabled={disabled}
      className="input__cta"
      aria-label={revertAriaLabel}
      onClick={handleReject}
    />
  ) : null;

  return (
    <label className={rootClass} htmlFor={inputId}>
      {submittable ? dismissButton : null}
      <input
        {...inputProps}
        ref={inputRef}
        id={inputId}
        type="text"
        placeholder={placeholder}
        inputMode={isNumberField ? 'numeric' : inputMode}
        pattern={isNumberField ? '[0-9]*' : pattern}
        autoComplete={isNumberField ? 'off' : autoComplete}
        aria-valuemin={fieldType === 'number' ? 0 : undefined}
        className={['input__input', inputClassName].filter(Boolean).join(' ')}
        value={draft}
        onChange={(e) => handleDraftChange(e.target.value)}
        disabled={disabled}
        onKeyDown={handleKeyDown}
      />
      {!submittable ? dismissButton : null}
      {submittable && (
        <Button
          type="primary"
          size="small"
          icon="arrowUp"
          circle
          disabled={disabled || !canSubmit}
          className="input__cta"
          aria-label={applyAriaLabel}
          onClick={() => {
            if (!canSubmit) return;
            onSubmit?.(draft);
          }}
        />
      )}
    </label>
  );
}
