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

type ActiveModal = {
  generation: number;
  content: ReactNode;
  onRequestClose?: () => void;
};

export type PresentModalOptions = {
  content: ReactNode;
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
export function ModalTitle({ children, id = 'modal-title' }: { children: ReactNode; id?: string }) {
  return (
    <h2 id={id} className="text-h-l">
      {children}
    </h2>
  );
}

export function ModalBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={className}>{children}</div>;
}

export function ModalActions({ children }: { children: ReactNode }) {
  return <div className="modal__actions">{children}</div>;
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
            className="modal__dialog card"
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
