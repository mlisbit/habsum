// exclusive-bem-block: config-card
import type { MouseEvent, PointerEvent } from 'react';
import { Button } from '@habsum/ui/components/Button';
import { Icon } from '@habsum/ui/components/Icon';
import type { ConfigHabitCard } from '~/utils/configYaml';
import { habitDetailLines } from './configHabitDisplay';

function ConfigCardDetails({ habit }: { habit: ConfigHabitCard }) {
  const details = habitDetailLines(habit);

  return (
    <ul className="config-card__details text-light text-b-s">
      {details.map((line) => (
        <li key={line} className="config-card__detail">
          {line}
        </li>
      ))}
    </ul>
  );
}

function stopEditButtonPointer(event: MouseEvent<HTMLElement>) {
  event.stopPropagation();
}

export type ConfigCardProps = {
  habit: ConfigHabitCard;
  isDragging?: boolean;
  onEdit?: () => void;
  onReorderPointerDown?: (event: PointerEvent<HTMLSpanElement>) => void;
};

export function createConfigCardDragPreview(
  card: HTMLElement,
  originTop: number,
  originLeft: number,
): HTMLElement {
  const rect = card.getBoundingClientRect();
  const preview = card.cloneNode(true) as HTMLElement;
  preview.removeAttribute('data-reorder-dragging');
  preview.classList.add('config-card--drag-preview');
  const cardStyles = getComputedStyle(card);
  preview.style.width = `${rect.width}px`;
  preview.style.backgroundColor = cardStyles.backgroundColor;
  preview.style.border = cardStyles.border;
  preview.style.borderRadius = cardStyles.borderRadius;
  preview.style.position = 'fixed';
  preview.style.top = `${originTop}px`;
  preview.style.left = `${originLeft}px`;
  preview.style.zIndex = '1000';
  preview.style.opacity = '0.75';
  preview.style.pointerEvents = 'none';
  preview.style.margin = '0';
  document.body.appendChild(preview);
  return preview;
}

export function ConfigCard({
  habit,
  isDragging = false,
  onEdit,
  onReorderPointerDown,
}: ConfigCardProps) {
  const { name } = habit;

  return (
    <li
      className="config-card"
      data-habit-name={name}
      data-reorder-dragging={isDragging ? '' : undefined}
      aria-grabbed={isDragging}
      aria-label={`${name}, drag to reorder`}
    >
      <span
        className="config-card__handle text-light"
        aria-hidden
        onPointerDown={onReorderPointerDown}
      >
        <Icon name="grip-horizontal" size="medium" className="config-card__handle-icon" />
      </span>
      <div className="config-card__body">
        <h3 className="config-card__title text-h-xs">{name}</h3>
        <ConfigCardDetails habit={habit} />
      </div>
      <Button
        type="tertiary"
        size="medium"
        icon="square-pen"
        circle
        className="config-card__edit"
        aria-label={`View details for ${name}`}
        onMouseDown={stopEditButtonPointer}
        onPointerDown={stopEditButtonPointer}
        onClick={(event) => {
          event.stopPropagation();
          onEdit?.();
        }}
      />
    </li>
  );
}
