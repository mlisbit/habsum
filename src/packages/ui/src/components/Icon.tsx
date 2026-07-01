import { forwardRef } from 'react';
import {
  ArrowUp,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Circle,
  CircleCheck,
  CircleDashed,
  Download,
  EllipsisVertical,
  GripHorizontal,
  Hand,
  Info,
  type LucideIcon,
  KeyRound,
  Laugh,
  Menu,
  Minus,
  Moon,
  UserRoundPlus,
  OctagonX,
  PartyPopper,
  Pencil,
  Plus,
  Settings,
  Shuffle,
  SquarePen,
  Sun,
  Trash2,
  UserLock,
  X,
  type LucideProps,
} from 'lucide-react';

const PencilSparkles = forwardRef<SVGSVGElement, Omit<LucideProps, 'ref'>>(
  ({ size, strokeWidth = 2, className, ...rest }, ref) => {
    return (
      <svg
        ref={ref}
        className={className}
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
        {...rest}
      >
        <path d="m15 5 4 4" />
        <path d="M13 7 4 16l-1 5 5-1 9-9" />
        <path d="m14 6 2-2a1.5 1.5 0 0 1 2 0l2 2a1.5 1.5 0 0 1 0 2l-2 2" />
        <path d="M5 4v3" />
        <path d="M6.5 5.5h-3" />
        <path d="M19 15v4" />
        <path d="M21 17h-4" />
      </svg>
    );
  },
);
PencilSparkles.displayName = 'PencilSparkles';

/** Named icons usable with {@link Icon} (shared lucide mappings). */
const ICON_COMPONENTS = {
  gear: Settings,
  chevronDown: ChevronDown,
  chevronLeft: ChevronLeft,
  chevronRight: ChevronRight,
  /** Same glyph as `chevronLeft`, for semantics (e.g. “back”). */
  chevronBack: ChevronLeft,
  arrowUp: ArrowUp,
  check: Check,
  close: X,
  'circle-check': CircleCheck,
  circle: Circle,
  'circle-dashed': CircleDashed,
  download: Download,
  'ellipsis-vertical': EllipsisVertical,
  'grip-horizontal': GripHorizontal,
  hand: Hand,
  info: Info,
  minus: Minus,
  moon: Moon,
  'key-round': KeyRound,
  laugh: Laugh,
  menu: Menu,
  'octagon-x': OctagonX,
  pencil: Pencil,
  'pencil-sparkles': PencilSparkles,
  'square-pen': SquarePen,
  trash: Trash2,
  'user-lock': UserLock,
  'user-round-plus': UserRoundPlus,
  plus: Plus,
  shuffle: Shuffle,
  sun: Sun,
  party: PartyPopper,
  'party-popper': PartyPopper,
} as const satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICON_COMPONENTS;

/** Default pixel heights per preset (used by `Button` and `Icon`). */
export const ICON_SIZES_PX = { small: 13, medium: 16, large: 20 } as const;

type IconProps = {
  /** Which glyph to render. */
  name: IconName;
  /** Pixel size presets. Defaults to `'medium'`. */
  size?: keyof typeof ICON_SIZES_PX;
  /** Override preset with an explicit pixel size. */
  sizePx?: number;
  className?: string;
};

/**
 * Renders lucide glyphs with consistent sizes and stroke (e.g. “plus”) for buttons and chrome.
 */
export function Icon({ name, size = 'medium', sizePx, className }: IconProps) {
  const Lucide = ICON_COMPONENTS[name];
  const px = sizePx ?? ICON_SIZES_PX[size];
  const strokeWidth = name === 'plus' || name === 'minus' ? 2.5 : 2;
  return <Lucide className={className} size={px} strokeWidth={strokeWidth} aria-hidden />;
}
