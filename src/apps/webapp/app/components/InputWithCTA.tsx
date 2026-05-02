import { useId, useLayoutEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { Button } from '~/core-components/Button';

export type InputWithCTAProps = {
  /** Initial field text (edits are kept inside the component after mount). */
  value?: string;
  /** Called with the current field text (e.g. ↑ or Enter). */
  onSubmit: (raw: string) => void;
  /** Discard edits (×). Hidden until the trimmed value is non-empty, unless `dismissAlwaysVisible`. Escape triggers this too. */
  onRevert: () => void;
  /** When true, × stays visible even with an empty field (e.g. close without typing). */
  dismissAlwaysVisible?: boolean;
  disabled?: boolean;
  className?: string;
  inputClassName?: string;
  applyAriaLabel?: string;
  revertAriaLabel?: string;
};

/**
 * Framed numeric field: ↑ is always visible (disabled until there is non-whitespace input). × appears once there is input, or always when `dismissAlwaysVisible`.
 */
export function InputWithCTA({
  value = '',
  onSubmit,
  onRevert,
  disabled = false,
  className,
  inputClassName,
  applyAriaLabel = 'Apply change',
  revertAriaLabel = 'Discard change',
  dismissAlwaysVisible = false,
}: InputWithCTAProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const mirrorRef = useRef<HTMLSpanElement>(null);
  const [textWidthPx, setTextWidthPx] = useState<number>();
  const [draft, setDraft] = useState(value);
  const filled = draft.trim() !== '';
  const revertOpen = filled || dismissAlwaysVisible;

  useLayoutEffect(() => {
    queueMicrotask(() => inputRef.current?.focus());
  }, []);

  useLayoutEffect(() => {
    const m = mirrorRef.current;
    if (!m) return;
    let w = Math.ceil(m.getBoundingClientRect().width);
    if (revertOpen) w += 8;
    setTextWidthPx(Math.max(w, revertOpen ? 90 : 1));
  }, [draft, revertOpen]);

  const rootClass = [
    'input-with-cta',
    revertOpen && 'input-with-cta--revert-open',
    revertOpen && 'input-with-cta--filled',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onRevert();
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!filled) return;
      onSubmit(draft);
    }
  };

  return (
    <label className={rootClass} htmlFor={inputId}>
      <div className="input-with-cta__slot">
        <div className="input-with-cta__revert-wrap" aria-hidden={!revertOpen}>
          <Button
            type="tertiary"
            size="tiny"
            icon="close"
            circle
            text=""
            tabIndex={revertOpen ? undefined : -1}
            disabled={disabled || !revertOpen}
            aria-label={revertAriaLabel}
            className="input-with-cta__cta input-with-cta__cta--revert"
            onClick={() => onRevert()}
          />
        </div>
        <div className="input-with-cta__field">
          <span ref={mirrorRef} className="input-with-cta__mirror text-b-m">
            {draft === '' ? '\u00a0' : draft}
          </span>
          <input
            ref={inputRef}
            id={inputId}
            type="number"
            min={0}
            step={1}
            inputMode="numeric"
            className={
              ['input-with-cta__input', inputClassName ?? 'text-b-m'].filter(Boolean).join(' ') ||
              undefined
            }
            style={textWidthPx != null ? { width: `${textWidthPx}px` } : undefined}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            disabled={disabled}
            onKeyDown={handleKeyDown}
          />
        </div>
        <div className="input-with-cta__apply-wrap">
          <Button
            type="primary"
            size="small"
            icon="arrowUp"
            circle
            text=""
            disabled={disabled || !filled}
            aria-label={applyAriaLabel}
            className="input-with-cta__cta input-with-cta__cta--submit"
            onClick={() => {
              if (!filled) return;
              onSubmit(draft);
            }}
          />
        </div>
      </div>
    </label>
  );
}
