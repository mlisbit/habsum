// exclusive-bem-block: hover-layer
import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type HTMLAttributes,
  type MutableRefObject,
  type ReactNode,
} from 'react';
import * as ReactDOM from 'react-dom';

/** Where the floating panel is placed relative to the anchor (before viewport clamp / flip). */
export type HoverablePanelSide = 'top' | 'bottom' | 'left' | 'right';

type HoverableRootProps = {
  children: ReactNode;
  /** Delay before opening (ms). */
  openDelay?: number;
};

type HoverableContextValue = {
  open: boolean;
  anchorRef: MutableRefObject<HTMLDivElement | null>;
  beginHover: () => void;
  endHover: () => void;
};

const HoverableContext = createContext<HoverableContextValue | null>(null);

function useHoverableContext(component: string): HoverableContextValue {
  const v = useContext(HoverableContext);
  if (!v) throw new Error(`${component} must be used inside Hoverable.Root`);
  return v;
}

function HoverableRoot({ children, openDelay = 60 }: HoverableRootProps) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearOpenTimer = useCallback(() => {
    if (openTimer.current) {
      clearTimeout(openTimer.current);
      openTimer.current = null;
    }
  }, []);

  const beginHover = useCallback(() => {
    if (open) return;
    clearOpenTimer();
    openTimer.current = setTimeout(() => {
      openTimer.current = null;
      setOpen(true);
    }, openDelay);
  }, [open, openDelay, clearOpenTimer]);

  /** Close as soon as the pointer leaves the anchor (panel does not keep it open). */
  const endHover = useCallback(() => {
    clearOpenTimer();
    setOpen(false);
  }, [clearOpenTimer]);

  const value = useMemo(
    () => ({
      open,
      anchorRef,
      beginHover,
      endHover,
    }),
    [open, beginHover, endHover],
  );

  useLayoutEffect(
    () => () => {
      clearOpenTimer();
    },
    [clearOpenTimer],
  );

  return <HoverableContext.Provider value={value}>{children}</HoverableContext.Provider>;
}

const HoverableAnchor = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  function HoverableAnchor({ onMouseEnter, onMouseLeave, ...props }, ref) {
    const { anchorRef, beginHover, endHover } = useHoverableContext('Hoverable.Anchor');

    const setRefs = (el: HTMLDivElement | null) => {
      anchorRef.current = el;
      if (typeof ref === 'function') ref(el);
      else if (ref) (ref as MutableRefObject<HTMLDivElement | null>).current = el;
    };

    return (
      <div
        ref={setRefs}
        onMouseEnter={(e) => {
          beginHover();
          onMouseEnter?.(e);
        }}
        onMouseLeave={(e) => {
          endHover();
          onMouseLeave?.(e);
        }}
        {...props}
      />
    );
  },
);

type HoverableContentProps = Omit<HTMLAttributes<HTMLDivElement>, 'children'> & {
  children: ReactNode;
  /** Gap between anchor and panel (px). */
  offset?: number;
  /** Preferred placement; may flip when there is not enough room in the viewport. */
  side?: HoverablePanelSide;
};

/** Fixed-position panel; intrinsic width — set min/max sizing via your feature classNames on `Hoverable.Content`. */
function HoverableContent({
  children,
  className,
  offset = 8,
  side = 'bottom',
  ...rest
}: HoverableContentProps) {
  const { open, anchorRef } = useHoverableContext('Hoverable.Content');
  const panelRef = useRef<HTMLDivElement | null>(null);
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
      const anchor = anchorRef.current;
      const panel = panelRef.current;
      if (!anchor || !panel) return;

      const ar = anchor.getBoundingClientRect();
      const margin = 8;
      const maxW = Math.min(320, window.innerWidth - 2 * margin);

      panel.style.maxWidth = `${maxW}px`;
      const pr = panel.getBoundingClientRect();

      const vh = window.innerHeight;
      const vw = window.innerWidth;

      let top: number;
      let left: number;

      const clampVertical = (t: number) => Math.min(Math.max(margin, t), vh - pr.height - margin);

      const centeredOverAnchorX = (): number => {
        let x = ar.left + ar.width / 2 - pr.width / 2;
        if (x < margin) x = margin;
        if (x + pr.width > vw - margin) x = vw - pr.width - margin;
        return x;
      };

      if (side === 'top') {
        top = ar.top - pr.height - offset;
        if (top < margin) top = ar.bottom + offset;
        if (top + pr.height > vh - margin) top = vh - pr.height - margin;
        left = centeredOverAnchorX();
      } else if (side === 'bottom') {
        top = ar.bottom + offset;
        if (top + pr.height > vh - margin) top = ar.top - pr.height - offset;
        if (top < margin) top = margin;
        left = centeredOverAnchorX();
      } else if (side === 'left') {
        left = ar.left - pr.width - offset;
        if (left < margin) left = ar.right + offset;
        if (left + pr.width > vw - margin) left = vw - pr.width - margin;
        top = clampVertical(ar.top + (ar.height - pr.height) / 2);
      } else {
        left = ar.right + offset;
        if (left + pr.width > vw - margin) left = ar.left - pr.width - offset;
        if (left < margin) left = margin;
        top = clampVertical(ar.top + (ar.height - pr.height) / 2);
      }

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
  }, [open, anchorRef, offset, side]);

  if (!open || typeof document === 'undefined') return null;

  return ReactDOM.createPortal(
    <div
      ref={panelRef}
      role="tooltip"
      className={['hover-layer__panel', 'text-b-m', 'text--hoverable', className]
        .filter(Boolean)
        .join(' ')}
      style={style}
      {...rest}
    >
      {children}
    </div>,
    document.body,
  );
}

/** Compose `Hoverable.Anchor` + `Hoverable.Content` inside `Hoverable.Root`. */
export const Hoverable = {
  Root: HoverableRoot,
  Anchor: HoverableAnchor,
  Content: HoverableContent,
};
