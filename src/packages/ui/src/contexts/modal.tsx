import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { Button } from '../components/Button';

export type ModalSize = 'medium' | 'large' | 'xl';

type ActiveModal = {
  generation: number;
  content: ReactNode;
  size: ModalSize;
  onRequestClose?: () => void;
  historyToken: string | null;
};

export type PresentModalOptions = {
  content: ReactNode;
  /** Dialog width preset. Default: `medium`. */
  size?: ModalSize;
  onRequestClose?: () => void;
  /** Default: true. Set false when the route/search params already own modal history. */
  history?: boolean;
};

type ModalContextValue = {
  /** Shows this content in the root modal shell. Replaces any modal already open. Returns a disposer that removes this instance without calling `onRequestClose`. */
  present: (options: PresentModalOptions) => () => void;
  /** Closes the active modal and runs its `onRequestClose`, if any. */
  closeModal: () => void;
  /** Closes the active modal, including its history entry, before running a follow-up action. */
  closeModalThen: (afterClose: () => void) => void;
};

const ModalContext = createContext<ModalContextValue | null>(null);

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter((el) => {
    if (el.getAttribute('aria-hidden') === 'true') return false;
    return el.getClientRects().length > 0;
  });
}

function focusInitialElement(dialog: HTMLElement) {
  const focusables = getFocusableElements(dialog);
  const target = focusables[0] ?? dialog;
  if (target === dialog) dialog.tabIndex = -1;
  target.focus();
}

/** Shell slots for modal content. Compose inside `present({ content: <>...</> })`. */
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
  return <div className={['modal__content', className].filter(Boolean).join(' ')}>{children}</div>;
}

export function ModalFooter({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={['modal__footer', className].filter(Boolean).join(' ')}>{children}</div>;
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

/** Two-action confirmation layout for `present({ content: <AlertModal ... /> })`. */
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
      <ModalFooter>
        <Button
          type="tertiary"
          color="danger"
          className="mr-1"
          text={continueLabel}
          onClick={onContinueWithoutSaving}
        />
        <Button type="secondary" text={cancelLabel} onClick={onCancel} />
      </ModalFooter>
    </>
  );
}

export function ModalProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<ActiveModal | null>(null);
  const activeRef = useRef<ActiveModal | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const genRef = useRef(0);
  const closeAfterHistoryPopRef = useRef<{
    modal: ActiveModal;
    afterClose?: () => void;
  } | null>(null);
  activeRef.current = active;

  const dismissActive = useCallback((invokeRequestClose: boolean) => {
    const prev = activeRef.current;
    if (!prev) return;
    setActive(null);
    activeRef.current = null;
    if (invokeRequestClose) prev.onRequestClose?.();
  }, []);

  const requestClose = useCallback(
    (afterClose?: () => void) => {
      const prev = activeRef.current;
      if (!prev) {
        afterClose?.();
        return;
      }
      if (prev.historyToken && window.history.state?.habsumModalToken === prev.historyToken) {
        closeAfterHistoryPopRef.current = { modal: prev, afterClose };
        window.history.back();
        return;
      }
      dismissActive(true);
      afterClose?.();
    },
    [dismissActive],
  );

  const closeModal = useCallback(() => requestClose(), [requestClose]);
  const closeModalThen = useCallback(
    (afterClose: () => void) => requestClose(afterClose),
    [requestClose],
  );

  const present = useCallback((options: PresentModalOptions) => {
    const current = activeRef.current;
    const generation = ++genRef.current;
    const historyToken =
      options.history === false
        ? null
        : `modal-${Date.now().toString(36)}-${generation.toString(36)}`;
    const next: ActiveModal = {
      generation,
      content: options.content,
      size: options.size ?? 'medium',
      onRequestClose: options.onRequestClose,
      historyToken,
    };
    activeRef.current = next;
    setActive(next);

    if (historyToken) {
      const state = { ...(window.history.state ?? {}), habsumModalToken: historyToken };
      const replacesCurrentModalHistory =
        current?.historyToken && window.history.state?.habsumModalToken === current.historyToken;
      if (replacesCurrentModalHistory) {
        window.history.replaceState(state, '', window.location.href);
      } else {
        window.history.pushState(state, '', window.location.href);
      }
    }

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
    const onPopState = () => {
      const pendingClose = closeAfterHistoryPopRef.current;
      closeAfterHistoryPopRef.current = null;
      if (pendingClose && activeRef.current?.generation === pendingClose.modal.generation) {
        dismissActive(true);
        pendingClose.afterClose?.();
        return;
      }

      const activeModal = activeRef.current;
      if (activeModal?.historyToken) dismissActive(false);
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [dismissActive]);

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeModal();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, closeModal]);

  useLayoutEffect(() => {
    if (!active) return;

    const dialog = dialogRef.current;
    if (!dialog) return;

    const previousFocus =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    focusInitialElement(dialog);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const focusables = getFocusableElements(dialog);
      if (focusables.length === 0) {
        e.preventDefault();
        dialog.focus();
        return;
      }

      const first = focusables[0]!;
      const last = focusables[focusables.length - 1]!;
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      if (previousFocus && document.contains(previousFocus)) {
        previousFocus.focus();
      }
    };
  }, [active?.generation]);

  const value = useMemo(
    () => ({ present, closeModal, closeModalThen }),
    [present, closeModal, closeModalThen],
  );

  return (
    <ModalContext.Provider value={value}>
      {children}
      {active ? (
        <div className="modal__backdrop" role="presentation" onClick={closeModal}>
          <div
            ref={dialogRef}
            className={[
              'modal__dialog',
              active.size === 'large' && 'modal__dialog--large',
              active.size === 'xl' && 'modal__dialog--xl',
            ]
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
