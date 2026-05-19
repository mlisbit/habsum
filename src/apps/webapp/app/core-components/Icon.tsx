import {
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  Info,
  type LucideIcon,
  KeyRound,
  Minus,
  UserRoundPlus,
  OctagonX,
  PartyPopper,
  Plus,
  Settings,
  SquarePen,
  Trash2,
  UserLock,
  X,
} from 'lucide-react';

/** Named icons usable with {@link Icon} (shared lucide mappings). */
const ICON_COMPONENTS = {
  gear: Settings,
  chevronLeft: ChevronLeft,
  chevronRight: ChevronRight,
  /** Same glyph as `chevronLeft`, for semantics (e.g. “back”). */
  chevronBack: ChevronLeft,
  arrowUp: ArrowUp,
  close: X,
  'circle-check': CircleCheck,
  info: Info,
  minus: Minus,
  'key-round': KeyRound,
  'octagon-x': OctagonX,
  'square-pen': SquarePen,
  trash: Trash2,
  'user-lock': UserLock,
  'user-round-plus': UserRoundPlus,
  plus: Plus,
  party: PartyPopper,
  'party-popper': PartyPopper,
} as const satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICON_COMPONENTS;

/** Default pixel heights per preset (used by `Button` and `Icon`). */
export const ICON_SIZES_PX = { tiny: 13, small: 16, medium: 18, large: 20 } as const;

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
