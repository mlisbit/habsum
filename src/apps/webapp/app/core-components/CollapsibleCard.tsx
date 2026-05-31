import {
  createContext,
  useContext,
  useId,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type ReactNode,
} from 'react';
import { Icon } from '~/core-components/Icon';
import { classBuilder } from '~/utils/class-builder';

type CollapsibleCardContextValue = {
  expanded: boolean;
  collapsible: boolean;
  contentId: string;
  onExpandedChange?: (expanded: boolean) => void;
};

const CollapsibleCardContext = createContext<CollapsibleCardContextValue | null>(null);

function useCollapsibleCard(component: string): CollapsibleCardContextValue {
  const ctx = useContext(CollapsibleCardContext);
  if (!ctx) throw new Error(`${component} must be used inside CollapsibleCard`);
  return ctx;
}

export type CollapsibleCardProps = {
  children: ReactNode;
  /** Whether the content panel is open. */
  expanded: boolean;
  /** When false, the panel cannot expand (e.g. feature disabled). */
  collapsible?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  className?: string;
};

function CollapsibleCardRoot({
  children,
  expanded,
  collapsible = true,
  onExpandedChange,
  className,
}: CollapsibleCardProps) {
  const contentId = useId();

  const value: CollapsibleCardContextValue = {
    expanded,
    collapsible,
    contentId,
    onExpandedChange,
  };

  return (
    <CollapsibleCardContext.Provider value={value}>
      <div
        className={classBuilder(
          {
            'collapsible-card--expanded': expanded && collapsible,
            [className ?? '']: Boolean(className),
          },
          'collapsible-card card',
        )}
      >
        {children}
      </div>
    </CollapsibleCardContext.Provider>
  );
}

export type CollapsibleCardHeaderProps = HTMLAttributes<HTMLDivElement>;

function CollapsibleCardHeader({
  children,
  className,
  onClick,
  ...props
}: CollapsibleCardHeaderProps) {
  const { expanded, collapsible, onExpandedChange } = useCollapsibleCard('CollapsibleCard.Header');

  return (
    <div
      className={classBuilder(
        { [className ?? '']: Boolean(className) },
        'collapsible-card__header',
      )}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented) return;
        if (!collapsible || !onExpandedChange) return;
        onExpandedChange(!expanded);
      }}
      {...props}
    >
      {children}
    </div>
  );
}

export type CollapsibleCardToggleProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'type' | 'children'
> & {
  ariaLabel?: string;
};

function CollapsibleCardToggle({
  ariaLabel = 'Expand section',
  className,
  onClick,
  ...props
}: CollapsibleCardToggleProps) {
  const { expanded, collapsible, contentId, onExpandedChange } =
    useCollapsibleCard('CollapsibleCard.Toggle');

  return (
    <button
      type="button"
      className={classBuilder(
        {
          'collapsible-card__toggle--expanded': expanded,
          [className ?? '']: Boolean(className),
        },
        'collapsible-card__toggle',
      )}
      disabled={!collapsible}
      aria-expanded={collapsible ? expanded : false}
      aria-controls={contentId}
      aria-label={ariaLabel}
      onClick={(event) => {
        event.stopPropagation();
        onClick?.(event);
        if (event.defaultPrevented) return;
        if (!collapsible || !onExpandedChange) return;
        onExpandedChange(!expanded);
      }}
      {...props}
    >
      <Icon name="chevronRight" size="medium" />
    </button>
  );
}

export type CollapsibleCardContentProps = HTMLAttributes<HTMLDivElement>;

function CollapsibleCardContent({ children, className, ...props }: CollapsibleCardContentProps) {
  const { expanded, collapsible, contentId } = useCollapsibleCard('CollapsibleCard.Content');
  const visible = collapsible && expanded;

  return (
    <div
      id={contentId}
      className={classBuilder(
        { [className ?? '']: Boolean(className) },
        'collapsible-card__content',
      )}
      hidden={!visible}
      {...props}
    >
      {children}
    </div>
  );
}

export const CollapsibleCard = Object.assign(CollapsibleCardRoot, {
  Header: CollapsibleCardHeader,
  Toggle: CollapsibleCardToggle,
  Content: CollapsibleCardContent,
});
