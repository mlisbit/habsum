// exclusive-bem-block: config-gui-editor
import {
  Fragment,
  useCallback,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { useModal } from '~/context/modal';
import type { ConfigHabitCard } from '~/utils/configYaml';
import { ConfigCard, createConfigCardDragPreview } from './ConfigCard';
import { ConfigCardModal } from './ConfigCardModal';

type ConfigGuiEditorProps = {
  configText: string;
  habits: ConfigHabitCard[];
  order: string[];
  onOrderChange: (order: string[]) => void;
  onConfigTextChange: (text: string) => void;
};

type ReorderSession = {
  name: string;
  offsetY: number;
  lockedLeft: number;
};

function reorderToInsertIndex(order: string[], fromIndex: number, insertIndex: number): string[] {
  if (fromIndex < 0 || fromIndex >= order.length) return order;
  const clampedInsert = Math.max(0, Math.min(insertIndex, order.length));

  const next = [...order];
  const [item] = next.splice(fromIndex, 1);
  let target = fromIndex < clampedInsert ? clampedInsert - 1 : clampedInsert;
  target = Math.max(0, Math.min(target, next.length));
  if (target === fromIndex) return order;

  next.splice(target, 0, item);
  return next;
}

function findInsertIndex(clientY: number, listEl: HTMLElement, order: string[]): number {
  for (let i = 0; i < order.length; i++) {
    const name = order[i];
    const el = listEl.querySelector<HTMLElement>(`[data-habit-name="${CSS.escape(name)}"]`);
    if (!el) continue;

    const rect = el.getBoundingClientRect();
    if (clientY < rect.top + rect.height / 2) {
      return i;
    }
  }
  return order.length;
}

function isNoOpInsert(fromIndex: number, insertIndex: number): boolean {
  return insertIndex === fromIndex || insertIndex === fromIndex + 1;
}

function ConfigInsertMarker() {
  return <li className="config-gui-editor__insert-marker" aria-hidden />;
}

export function ConfigGuiEditor({
  configText,
  habits,
  order,
  onOrderChange,
  onConfigTextChange,
}: ConfigGuiEditorProps) {
  const [draggingName, setDraggingName] = useState<string | null>(null);
  const [insertIndex, setInsertIndex] = useState<number | null>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const dragPreviewRef = useRef<HTMLElement | null>(null);
  const sessionRef = useRef<ReorderSession | null>(null);
  const { present, closeModal } = useModal();

  const habitByName = new Map(habits.map((h) => [h.name, h]));

  const endReorder = useCallback(() => {
    listRef.current
      ?.querySelectorAll('[data-reorder-dragging]')
      .forEach((el) => delete (el as HTMLElement).dataset.reorderDragging);

    dragPreviewRef.current?.remove();
    dragPreviewRef.current = null;
    sessionRef.current = null;
    setDraggingName(null);
    setInsertIndex(null);
    document.body.style.removeProperty('user-select');
    document.body.style.removeProperty('cursor');
  }, []);

  const openHabitModal = useCallback(
    (habit: ConfigHabitCard) => {
      present({
        size: 'large',
        content: (
          <ConfigCardModal
            configText={configText}
            habitName={habit.name}
            onDone={(next) => {
              onConfigTextChange(next);
              closeModal();
            }}
            onCancel={closeModal}
          />
        ),
        onRequestClose: closeModal,
      });
    },
    [closeModal, configText, onConfigTextChange, present],
  );

  const onReorderPointerDown = useCallback(
    (name: string, event: ReactPointerEvent<HTMLSpanElement>) => {
      if (event.button !== 0) return;

      const card = event.currentTarget.closest('[data-habit-name]');
      const listEl = listRef.current;
      if (!(card instanceof HTMLElement) || !listEl) return;

      event.preventDefault();
      const captureTarget = event.currentTarget;
      captureTarget.setPointerCapture(event.pointerId);

      const rect = card.getBoundingClientRect();
      const session: ReorderSession = {
        name,
        offsetY: event.clientY - rect.top,
        lockedLeft: rect.left,
      };
      sessionRef.current = session;

      card.dataset.reorderDragging = '';

      dragPreviewRef.current?.remove();
      dragPreviewRef.current = createConfigCardDragPreview(card, rect.top, rect.left);
      setDraggingName(name);
      setInsertIndex(null);
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'grabbing';

      const onPointerMove = (moveEvent: PointerEvent) => {
        const active = sessionRef.current;
        const preview = dragPreviewRef.current;
        if (!active || !preview) return;

        preview.style.left = `${active.lockedLeft}px`;
        preview.style.top = `${moveEvent.clientY - active.offsetY}px`;

        const fromIndex = order.indexOf(active.name);
        const nextInsert = findInsertIndex(moveEvent.clientY, listEl, order);
        setInsertIndex(fromIndex >= 0 && isNoOpInsert(fromIndex, nextInsert) ? null : nextInsert);
      };

      const onPointerUp = (upEvent: PointerEvent) => {
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
        window.removeEventListener('pointercancel', onPointerUp);

        if (captureTarget.hasPointerCapture(upEvent.pointerId)) {
          captureTarget.releasePointerCapture(upEvent.pointerId);
        }

        const active = sessionRef.current;
        if (!active) return;

        const fromIndex = order.indexOf(active.name);
        if (fromIndex >= 0) {
          const nextInsert = findInsertIndex(upEvent.clientY, listEl, order);
          if (!isNoOpInsert(fromIndex, nextInsert)) {
            onOrderChange(reorderToInsertIndex(order, fromIndex, nextInsert));
          }
        }

        endReorder();
      };

      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
      window.addEventListener('pointercancel', onPointerUp);
    },
    [endReorder, onOrderChange, order],
  );

  if (order.length === 0) {
    return (
      <p className="config-gui-editor__empty text-light text-b-m card-padding">
        No habits in this config yet.
      </p>
    );
  }

  return (
    <ul ref={listRef} className="config-gui-editor__list card-padding" aria-label="Habits">
      {order.map((name, index) => {
        const habit = habitByName.get(name);
        if (!habit) return null;
        const isDragging = draggingName === name;

        return (
          <Fragment key={name}>
            {insertIndex === index ? <ConfigInsertMarker /> : null}
            <ConfigCard
              habit={habit}
              isDragging={isDragging}
              onEdit={() => openHabitModal(habit)}
              onReorderPointerDown={(event) => onReorderPointerDown(name, event)}
            />
          </Fragment>
        );
      })}
      {insertIndex === order.length ? <ConfigInsertMarker /> : null}
    </ul>
  );
}
