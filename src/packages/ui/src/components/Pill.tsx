// exclusive-bem-block: pill
import { forwardRef, useEffect, useRef, useState } from 'react';
import type { ButtonHTMLAttributes, HTMLAttributes, KeyboardEvent, ReactNode } from 'react';
import { Icon } from './Icon';
import { classBuilder } from '../utils/class-builder';

export type PillSize = 'large' | 'small';

type TogglePillProps = {
  selected: boolean;
  negative?: boolean;
  onToggle: (selected: boolean) => void;
  size?: PillSize;
  children: ReactNode;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'onClick'>;

export function TogglePill({
  selected,
  negative = false,
  onToggle,
  size = 'large',
  children,
  className,
  type = 'button',
  ...props
}: TogglePillProps) {
  return (
    <button
      type={type}
      className={classBuilder(
        {
          'pill--selected': selected,
          'pill--selected-negative': selected && negative,
          'pill--small text-b-s': size === 'small',
          'pill--large text-b-m': size === 'large',
        },
        `pill pill--toggle ${className}`,
      )}
      aria-pressed={selected}
      onClick={() => onToggle(!selected)}
      {...props}
    >
      {children}
    </button>
  );
}

type DismissablePillProps = {
  children: ReactNode;
  onDismiss: () => void;
  dismissAriaLabel?: string;
  size?: PillSize;
} & Omit<HTMLAttributes<HTMLSpanElement>, 'children' | 'onSubmit'>;

export function DismissablePill({
  children,
  onDismiss,
  dismissAriaLabel = 'Remove',
  size = 'large',
  className,
  ...props
}: DismissablePillProps) {
  return (
    <span
      className={classBuilder(
        {
          'pill--small text-b-s': size === 'small',
          'pill--large text-b-m': size === 'large',
        },
        `pill pill--dismissable ${className}`,
      )}
      {...props}
    >
      <span className="pill__label">{children}</span>
      <button
        type="button"
        className="pill__dismiss-button"
        aria-label={dismissAriaLabel}
        onClick={(event) => {
          event.stopPropagation();
          onDismiss();
        }}
      >
        <Icon name="close" size="small" />
      </button>
    </span>
  );
}

type EditablePillProps = {
  value: string;
  onSubmit: (value: string) => boolean | void;
  onDismiss?: () => void;
  dismissAriaLabel?: string;
  size?: PillSize;
} & Omit<HTMLAttributes<HTMLSpanElement>, 'children' | 'onSubmit'>;

export function EditablePill({
  value,
  onSubmit,
  onDismiss,
  dismissAriaLabel = 'Remove',
  size = 'large',
  className,
  onClick,
  onKeyDown,
  tabIndex,
  ...props
}: EditablePillProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) setDraft(value);
  }, [editing, value]);

  useEffect(() => {
    if (!editing) return;
    queueMicrotask(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
  }, [editing]);

  const cancelEdit = () => {
    setDraft(value);
    setEditing(false);
  };

  const submitEdit = () => {
    const next = draft.trim();
    if (next === '') {
      cancelEdit();
      return;
    }
    if (next === value) {
      setEditing(false);
      return;
    }
    const accepted = onSubmit(next);
    if (accepted === false) {
      queueMicrotask(() => inputRef.current?.focus());
      return;
    }
    setEditing(false);
  };

  const onInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      cancelEdit();
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      submitEdit();
    }
  };

  return (
    <span
      className={classBuilder(
        {
          'pill--small text-b-s': size === 'small',
          'pill--large text-b-m': size === 'large',
          'pill--editing': editing,
        },
        `pill pill--editable ${className}`,
      )}
      tabIndex={editing ? undefined : (tabIndex ?? 0)}
      onClick={(event) => {
        onClick?.(event);
        if (!editing) setEditing(true);
      }}
      onKeyDown={(event) => {
        onKeyDown?.(event);
        if (editing) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          setEditing(true);
        }
      }}
      {...props}
    >
      {editing ? (
        <input
          ref={inputRef}
          className="pill__input"
          value={draft}
          style={{ width: `${Math.max(draft.length, 1)}ch` }}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={onInputKeyDown}
          onBlur={submitEdit}
        />
      ) : (
        <span className="pill__label">{value}</span>
      )}
      {onDismiss ? (
        <button
          type="button"
          className="pill__dismiss-button"
          aria-label={dismissAriaLabel}
          onClick={(event) => {
            event.stopPropagation();
            onDismiss();
          }}
        >
          <Icon name="close" size="small" />
        </button>
      ) : null}
    </span>
  );
}

type TriggerPillProps = {
  size?: PillSize;
  children: ReactNode;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'>;

export const TriggerPill = forwardRef<HTMLButtonElement, TriggerPillProps>(function TriggerPill(
  { size = 'small', children, className, type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={classBuilder(
        {
          'pill--small text-b-s': size === 'small',
          'pill--large text-b-m': size === 'large',
        },
        `pill pill--trigger ${className}`,
      )}
      {...props}
    >
      <span className="pill__label">{children}</span>
      <Icon name="chevronDown" size="small" className="pill__trigger-icon" />
    </button>
  );
});
