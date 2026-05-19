import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import type { InputHTMLAttributes, KeyboardEvent } from 'react';
import { Button } from '~/core-components/Button';

function sanitizeDigitsOnly(raw: string): string {
  return raw.replace(/\D/g, '');
}

/** Optional leading `-` / `−` (U+2212), then digits only. */
function sanitizeSignedIntegerDraft(raw: string): string {
  const normalized = raw.replace(/\u2212/g, '-');
  let sign = '';
  let i = 0;
  if (normalized[i] === '-') {
    sign = '-';
    i += 1;
  }
  let digits = '';
  for (; i < normalized.length; i += 1) {
    const c = normalized[i];
    if (c >= '0' && c <= '9') digits += c;
  }
  if (sign !== '' && digits === '') return '-';
  return sign + digits;
}

function signedIntegerTypingInvalid(raw: string): boolean {
  const normalized = raw.replace(/\u2212/g, '-');
  return !/^-?\d*$/.test(normalized);
}

/** Must match `input--reject-flash` animation duration in SCSS. */
const REJECT_FLASH_MS = 480;

export type InputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type' | 'value' | 'onSubmit' | 'onChange' | 'className' | 'disabled' | 'placeholder' | 'size'
> & {
  type?: 'string' | 'number' | 'password';
  value?: string;
  onChange?: (raw: string) => void;
  onSubmit?: (raw: string) => void;
  onReject?: () => void;
  dismissable?: boolean;
  alwaysDismissable?: boolean;
  submittable?: boolean;
  /** Control height; `medium` matches original styling. */
  size?: 'medium' | 'small';
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  inputClassName?: string;
  applyAriaLabel?: string;
  revertAriaLabel?: string;
  /** When `type` is `number`, allow a leading minus for signed integers (e.g. manual delta). */
  allowNegative?: boolean;
};

/**
 * An input component.
 * Has a little "x" that will clear the input to the right.
 * Has an inline submit button to the right if "submittable" is true.
 * If type is "number", the input accepts digits (and optional leading `-` / `−` when `allowNegative`), and flashes red on invalid input.
 * If type is "password", uses a masked password field (`<input type="password">`).
 * Use `size="small"` for compact fields (e.g. settings forms).
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
  size = 'medium',
  className,
  inputClassName,
  applyAriaLabel,
  revertAriaLabel,
  allowNegative = false,
  placeholder,
  autoComplete,
  inputMode,
  pattern,
  ...inputProps
}: InputProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const computeSeedDraft = (v: string) =>
    fieldType === 'number'
      ? allowNegative
        ? sanitizeSignedIntegerDraft(v)
        : sanitizeDigitsOnly(v)
      : v;

  const [draft, setDraft] = useState(() => computeSeedDraft(value));
  const [rejectFlash, setRejectFlash] = useState(false);
  const rejectFlashEndTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    setDraft(
      fieldType === 'number'
        ? allowNegative
          ? sanitizeSignedIntegerDraft(value)
          : sanitizeDigitsOnly(value)
        : value,
    );
  }, [fieldType, value, allowNegative]);

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
    size === 'small' && 'input--small',
    !submittable && 'input--not-submittable',
    showDismissButton && 'input--dismissable',
    rejectFlash && 'input--reject-flash',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const isNumberField = fieldType === 'number';
  const isPasswordField = fieldType === 'password';

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
    if (submittable) {
      const nextDraft = computeSeedDraft(value);
      setDraft(nextDraft);
      return;
    }
    const cleared = computeSeedDraft('');
    setDraft(cleared);
    onChange?.(cleared);
  };

  const handleDraftChange = (raw: string) => {
    if (isNumberField) {
      if (allowNegative) {
        if (signedIntegerTypingInvalid(raw)) pulseRejectFlash();
      } else if (sanitizeDigitsOnly(raw) !== raw) {
        pulseRejectFlash();
      }
    }
    const nextDraft = isNumberField
      ? allowNegative
        ? sanitizeSignedIntegerDraft(raw)
        : sanitizeDigitsOnly(raw)
      : raw;
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
        type={isPasswordField ? 'password' : 'text'}
        role={isNumberField ? 'spinbutton' : undefined}
        placeholder={placeholder}
        inputMode={isNumberField ? 'numeric' : inputMode}
        pattern={isNumberField ? (allowNegative ? '-?[0-9]*' : '[0-9]*') : pattern}
        autoComplete={
          isNumberField
            ? 'off'
            : isPasswordField
              ? (autoComplete ?? 'current-password')
              : autoComplete
        }
        aria-valuemin={isNumberField && !allowNegative ? 0 : undefined}
        aria-valuenow={
          isNumberField && draft !== '' && Number.isFinite(Number(draft))
            ? Number(draft)
            : undefined
        }
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
