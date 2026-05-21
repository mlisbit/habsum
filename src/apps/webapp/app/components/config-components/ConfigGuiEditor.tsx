// exclusive-bem-block: config-gui-editor
import {
  Fragment,
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { useLocation, useNavigate } from '@remix-run/react';
import { useModal } from '~/context/modal';
import type { ConfigHabitCard } from '~/utils/configYaml';
import {
  configEditHabitQueryValue,
  findHabitNameByConfigEditId,
  readConfigEditHabitId,
  withConfigEditHabitId,
} from '~/utils/habit-id';
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
  const openedModalForHabitIdRef = useRef<string | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { present, closeModal } = useModal();

  const editingHabitId = readConfigEditHabitId(location.search);

  const setEditingHabitId = useCallback(
    (habitId: string | null) => {
      navigate(
        {
          pathname: location.pathname,
          search: withConfigEditHabitId(location.search, habitId),
        },
        { replace: true },
      );
    },
    [location.pathname, location.search, navigate],
  );

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

  const closeHabitModal = useCallback(() => {
    openedModalForHabitIdRef.current = null;
    setEditingHabitId(null);
    closeModal();
  }, [closeModal, setEditingHabitId]);

  const presentModalForHabit = useCallback(
    (habit: ConfigHabitCard) => {
      const habitId = configEditHabitQueryValue(habit.name);
      openedModalForHabitIdRef.current = habitId;
      present({
        size: 'large',
        content: (
          <ConfigCardModal
            configText={configText}
            habitName={habit.name}
            onDone={(next) => {
              onConfigTextChange(next);
              closeHabitModal();
            }}
            onCancel={closeHabitModal}
          />
        ),
        onRequestClose: closeHabitModal,
      });
    },
    [closeHabitModal, configText, onConfigTextChange, present],
  );

  const openHabitModal = useCallback(
    (habit: ConfigHabitCard) => {
      presentModalForHabit(habit);
      setEditingHabitId(configEditHabitQueryValue(habit.name));
    },
    [presentModalForHabit, setEditingHabitId],
  );

  useEffect(() => {
    if (!editingHabitId) {
      openedModalForHabitIdRef.current = null;
      return;
    }
    if (openedModalForHabitIdRef.current === editingHabitId) return;

    const habitName = findHabitNameByConfigEditId(habits, editingHabitId);
    const habit = habitName ? habits.find((h) => h.name === habitName) : undefined;
    if (!habit) return;

    presentModalForHabit(habit);
  }, [editingHabitId, habits, presentModalForHabit]);

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
