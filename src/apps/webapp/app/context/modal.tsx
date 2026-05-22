import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Button } from '~/core-components/Button';

export type ModalSize = 'medium' | 'large';

type ActiveModal = {
  generation: number;
  content: ReactNode;
  size: ModalSize;
  onRequestClose?: () => void;
};

export type PresentModalOptions = {
  content: ReactNode;
  /** Dialog width preset. Default: `medium`. */
  size?: ModalSize;
  onRequestClose?: () => void;
};

type ModalContextValue = {
  /** Shows this content in the root modal shell. Replaces any modal already open. Returns a disposer that removes this instance without calling `onRequestClose`. */
  present: (options: PresentModalOptions) => () => void;
  /** Closes the active modal and runs its `onRequestClose`, if any. */
  closeModal: () => void;
};

const ModalContext = createContext<ModalContextValue | null>(null);

/** Shell slots for modal content. Compose inside `present({ content: <>…</> })`. */
export function ModalHeader({
  children,
  id = 'modal-title',
  className,
  titleClassName,
  dismissDisabled = false,
  dismissLabel = 'Close',
}: {
  children: ReactNode;
  id?: string;
  className?: string;
  titleClassName?: string;
  dismissDisabled?: boolean;
  dismissLabel?: string;
}) {
  const { closeModal } = useModal();

  return (
    <div className={['modal__header', className].filter(Boolean).join(' ')}>
      <h2
        id={id}
        className={['modal__header-title', 'text-h-l', titleClassName].filter(Boolean).join(' ')}
      >
        {children}
      </h2>
      <Button
        type="tertiary"
        size="medium"
        icon="close"
        circle
        text=""
        className="modal__header-dismiss"
        aria-label={dismissLabel}
        onClick={closeModal}
        disabled={dismissDisabled}
      />
    </div>
  );
}

export function ModalBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={className}>{children}</div>;
}

export function ModalActions({ children }: { children: ReactNode }) {
  return <div className="modal__actions">{children}</div>;
}

export type AlertModalProps = {
  title: string;
  message: ReactNode;
  /** Default: Cancel */
  cancelLabel?: string;
  /** Default: Continue without saving */
  continueLabel?: string;
  /** Dismisses the alert without leaving the page (e.g. close modal, reset navigation blocker). */
  onCancel: () => void;
  /** Confirms destructive or navigation action (primary CTA). */
  onContinueWithoutSaving: () => void;
};

/** Two-action confirmation layout for `present({ content: <AlertModal … /> })`. */
export function AlertModal({
  title,
  message,
  cancelLabel = 'Cancel',
  continueLabel = 'Continue without saving',
  onCancel,
  onContinueWithoutSaving,
}: AlertModalProps) {
  return (
    <>
      <ModalHeader>{title}</ModalHeader>
      <ModalBody>
        <p className="text-b-m text-light">{message}</p>
      </ModalBody>
      <ModalActions>
        <Button type="secondary" text={cancelLabel} onClick={onCancel} />
        <Button type="primary" text={continueLabel} onClick={onContinueWithoutSaving} />
      </ModalActions>
    </>
  );
}

export function ModalProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<ActiveModal | null>(null);
  const activeRef = useRef<ActiveModal | null>(null);
  const genRef = useRef(0);
  activeRef.current = active;

  const closeModal = useCallback(() => {
    const prev = activeRef.current;
    if (!prev) return;
    setActive(null);
    activeRef.current = null;
    prev.onRequestClose?.();
  }, []);

  const present = useCallback((options: PresentModalOptions) => {
    const generation = ++genRef.current;
    const next: ActiveModal = {
      generation,
      content: options.content,
      size: options.size ?? 'medium',
      onRequestClose: options.onRequestClose,
    };
    activeRef.current = next;
    setActive(next);

    return () => {
      setActive((cur) => {
        if (cur?.generation === generation) {
          activeRef.current = null;
          return null;
        }
        return cur;
      });
    };
  }, []);

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeModal();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, closeModal]);

  const value = useMemo(() => ({ present, closeModal }), [present, closeModal]);

  return (
    <ModalContext.Provider value={value}>
      {children}
      {active ? (
        <div className="modal__backdrop" role="presentation" onClick={closeModal}>
          <div
            className={['modal__dialog', 'card', active.size === 'large' && 'modal__dialog--large']
              .filter(Boolean)
              .join(' ')}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            {active.content}
          </div>
        </div>
      ) : null}
    </ModalContext.Provider>
  );
}

export function useModal() {
  const ctx = useContext(ModalContext);
  if (!ctx) throw new Error('useModal must be used within ModalProvider');
  return ctx;
}
