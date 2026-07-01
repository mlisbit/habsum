// exclusive-bem-block: dropdown
import {
  createContext,
  cloneElement,
  forwardRef,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type HTMLAttributes,
  type ReactElement,
  type Ref,
  type MutableRefObject,
  type ReactNode,
} from 'react';
import * as ReactDOM from 'react-dom';
import { Icon } from './Icon';
import { classBuilder } from '../utils/class-builder';

export type DropdownContentSide = 'top' | 'bottom';

type DropdownContextValue = {
  open: boolean;
  contentId: string;
  triggerRef: MutableRefObject<HTMLButtonElement | null>;
  contentRef: MutableRefObject<HTMLDivElement | null>;
  setOpen: (open: boolean) => void;
};

const DropdownContext = createContext<DropdownContextValue | null>(null);

function useDropdown(component: string): DropdownContextValue {
  const ctx = useContext(DropdownContext);
  if (!ctx) throw new Error(`${component} must be used inside Dropdown.Root`);
  return ctx;
}

export type DropdownRootProps = {
  children: ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
};

function DropdownRoot({
  children,
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
}: DropdownRootProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const contentId = useId();
  const open = controlledOpen ?? uncontrolledOpen;

  const setOpen = useCallback(
    (nextOpen: boolean) => {
      if (controlledOpen == null) setUncontrolledOpen(nextOpen);
      onOpenChange?.(nextOpen);
    },
    [controlledOpen, onOpenChange],
  );

  useEffect(() => {
    if (!open) return;

    const closeOnDocumentPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (triggerRef.current?.contains(target) || contentRef.current?.contains(target)) return;
      setOpen(false);
    };

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      triggerRef.current?.focus();
    };

    document.addEventListener('pointerdown', closeOnDocumentPointerDown);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnDocumentPointerDown);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open, setOpen]);

  const value = useMemo(
    () => ({ open, contentId, triggerRef, contentRef, setOpen }),
    [contentId, open, setOpen],
  );

  return <DropdownContext.Provider value={value}>{children}</DropdownContext.Provider>;
}

export type DropdownTriggerProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
  showIcon?: boolean;
};

type DropdownTriggerChildProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  ref?: Ref<HTMLButtonElement>;
};

const DropdownTrigger = forwardRef<HTMLButtonElement, DropdownTriggerProps>(
  function DropdownTrigger(
    { asChild = false, children, className, onClick, showIcon = true, ...props },
    ref,
  ) {
    const { open, contentId, triggerRef, setOpen } = useDropdown('Dropdown.Trigger');

    const setRefs = (el: HTMLButtonElement | null) => {
      triggerRef.current = el;
      if (typeof ref === 'function') ref(el);
      else if (ref) (ref as MutableRefObject<HTMLButtonElement | null>).current = el;
    };

    const handleClick: ButtonHTMLAttributes<HTMLButtonElement>['onClick'] = (event) => {
      onClick?.(event);
      if (event.defaultPrevented) return;
      setOpen(!open);
    };

    if (asChild) {
      if (!isValidElement(children)) {
        throw new Error('Dropdown.Trigger with asChild expects exactly one valid element');
      }
      const child = children as ReactElement<DropdownTriggerChildProps>;
      return cloneElement(child, {
        ...props,
        ...child.props,
        ref: setRefs,
        className: [className, child.props.className].filter(Boolean).join(' ') || undefined,
        'aria-expanded': open,
        'aria-controls': contentId,
        onClick: (event) => {
          child.props.onClick?.(event);
          if (event.defaultPrevented) return;
          handleClick(event);
        },
      });
    }

    return (
      <button
        ref={setRefs}
        type="button"
        className={classBuilder(
          {
            'dropdown__trigger--open': open,
            [className ?? '']: Boolean(className),
          },
          'dropdown__trigger',
        )}
        aria-expanded={open}
        aria-controls={contentId}
        onClick={handleClick}
        {...props}
      >
        <span className="dropdown__trigger-label">{children}</span>
        {showIcon ? (
          <Icon name="chevronDown" size="small" className="dropdown__trigger-icon" />
        ) : null}
      </button>
    );
  },
);

export type DropdownContentProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  offset?: number;
  side?: DropdownContentSide;
};

function DropdownContent({
  children,
  className,
  offset = 4,
  side = 'bottom',
  ...props
}: DropdownContentProps) {
  const { open, contentId, triggerRef, contentRef } = useDropdown('Dropdown.Content');
  const [style, setStyle] = useState<CSSProperties>({
    position: 'fixed',
    visibility: 'hidden',
    zIndex: 1200,
    left: 0,
    top: 0,
  });

  useLayoutEffect(() => {
    if (!open) return;

    const update = () => {
      const trigger = triggerRef.current;
      const content = contentRef.current;
      if (!trigger || !content) return;

      const triggerRect = trigger.getBoundingClientRect();
      const margin = 8;
      const maxWidth = Math.min(320, window.innerWidth - 2 * margin);

      content.style.maxWidth = `${maxWidth}px`;
      const contentRect = content.getBoundingClientRect();

      let left = triggerRect.left;
      if (left + contentRect.width > window.innerWidth - margin) {
        left = window.innerWidth - contentRect.width - margin;
      }
      if (left < margin) left = margin;

      let top =
        side === 'top'
          ? triggerRect.top - contentRect.height - offset
          : triggerRect.bottom + offset;

      if (side === 'top' && top < margin) top = triggerRect.bottom + offset;
      if (side === 'bottom' && top + contentRect.height > window.innerHeight - margin) {
        top = triggerRect.top - contentRect.height - offset;
      }
      if (top < margin) top = margin;

      setStyle({
        position: 'fixed',
        zIndex: 1200,
        left,
        top,
        visibility: 'visible',
      });
    };

    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [contentRef, offset, open, side, triggerRef]);

  if (!open || typeof document === 'undefined') return null;

  return ReactDOM.createPortal(
    <div
      ref={contentRef}
      id={contentId}
      className={classBuilder({ [className ?? '']: Boolean(className) }, 'dropdown__content')}
      style={style}
      {...props}
    >
      {children}
    </div>,
    document.body,
  );
}

export const Dropdown = Object.assign(DropdownRoot, {
  Root: DropdownRoot,
  Trigger: DropdownTrigger,
  Content: DropdownContent,
});
