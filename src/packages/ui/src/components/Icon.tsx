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
} from 'lucide-react';

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
