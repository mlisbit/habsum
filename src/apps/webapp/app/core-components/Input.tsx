import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { Button } from '~/core-components/Button';

function sanitizeDigitsOnly(raw: string): string {
  return raw.replace(/\D/g, '');
}

/** Must match `input--reject-flash` animation duration in SCSS. */
const REJECT_FLASH_MS = 480;

export type InputProps = {
  type?: 'string' | 'number';
  value?: string;
  onSubmit: (raw: string) => void;
  onReject?: () => void;
  dismissable?: boolean;
  submittable?: boolean;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
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
  onSubmit,
  onReject,
  submittable = true,
  disabled = false,
  className,
  dismissable = false,
  placeholder,
}: InputProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const computeSeedDraft = (v: string) => (fieldType === 'number' ? sanitizeDigitsOnly(v) : v);

  const [draft, setDraft] = useState(() => computeSeedDraft(value));
  const [rejectFlash, setRejectFlash] = useState(false);
  const rejectFlashEndTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const canSubmit = draft.trim() !== '';
  const revertOpen = canSubmit || dismissable;

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
    revertOpen && 'input--dismissable',
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
    setDraft(computeSeedDraft(value));
  };

  const handleDraftChange = (raw: string) => {
    if (isNumberField && sanitizeDigitsOnly(raw) !== raw) {
      pulseRejectFlash();
    }
    setDraft(isNumberField ? sanitizeDigitsOnly(raw) : raw);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      handleReject();
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!canSubmit) return;
      onSubmit(draft);
    }
  };

  return (
    <label className={rootClass} htmlFor={inputId}>
      <Button
        type="tertiary"
        size="tiny"
        icon="close"
        circle
        tabIndex={revertOpen ? undefined : -1}
        disabled={disabled || !revertOpen}
        className="input__cta"
        onClick={handleReject}
      />
      <input
        ref={inputRef}
        id={inputId}
        type="text"
        placeholder={placeholder}
        inputMode={isNumberField ? 'numeric' : undefined}
        pattern={isNumberField ? '[0-9]*' : undefined}
        autoComplete={isNumberField ? 'off' : undefined}
        aria-valuemin={fieldType === 'number' ? 0 : undefined}
        className="input__input"
        value={draft}
        onChange={(e) => handleDraftChange(e.target.value)}
        disabled={disabled}
        onKeyDown={handleKeyDown}
      />
      {submittable && (
        <Button
          type="primary"
          size="small"
          icon="arrowUp"
          circle
          disabled={disabled || !canSubmit}
          className="input__cta"
          onClick={() => {
            if (!canSubmit) return;
            onSubmit(draft);
          }}
        />
      )}
    </label>
  );
}
