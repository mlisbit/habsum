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
import { createPortal } from 'react-dom';

/** Where the floating panel is placed relative to the anchor (before viewport clamp / flip). */
export type HoverPanelSide = 'top' | 'bottom' | 'left' | 'right';

type HoverRootProps = {
  children: ReactNode;
  /** Delay before opening (ms). */
  openDelay?: number;
};

type HoverContextValue = {
  open: boolean;
  anchorRef: MutableRefObject<HTMLDivElement | null>;
  beginHover: () => void;
  endHover: () => void;
};

const HoverContext = createContext<HoverContextValue | null>(null);

function useHoverContext(component: string): HoverContextValue {
  const v = useContext(HoverContext);
  if (!v) throw new Error(`${component} must be used inside Hover.Root`);
  return v;
}

function HoverRoot({ children, openDelay = 60 }: HoverRootProps) {
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

  return <HoverContext.Provider value={value}>{children}</HoverContext.Provider>;
}

const HoverAnchor = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(function HoverAnchor(
  { onMouseEnter, onMouseLeave, ...props },
  ref,
) {
  const { anchorRef, beginHover, endHover } = useHoverContext('Hover.Anchor');

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
});

type HoverContentProps = Omit<HTMLAttributes<HTMLDivElement>, 'children'> & {
  children: ReactNode;
  /** Gap between anchor and panel (px). */
  offset?: number;
  /** Preferred placement; may flip when there is not enough room in the viewport. */
  side?: HoverPanelSide;
};

function HoverContent({
  children,
  className,
  offset = 8,
  side = 'bottom',
  ...rest
}: HoverContentProps) {
  const { open, anchorRef } = useHoverContext('Hover.Content');
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

  return createPortal(
    <div
      ref={panelRef}
      role="tooltip"
      className={['hover-layer__panel', 'text-b-m', className].filter(Boolean).join(' ')}
      style={style}
      {...rest}
    >
      {children}
    </div>,
    document.body,
  );
}

/** Composable hover: wrap `Hover.Anchor` + `Hover.Content` inside `Hover.Root`. */
export const Hover = {
  Root: HoverRoot,
  Anchor: HoverAnchor,
  Content: HoverContent,
};
