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
import { useToast } from '~/context/toast';
import type { ConfigHabitCard } from '~/utils/configYaml';
import {
  configEditHabitQueryValue,
  findHabitNameByConfigEditId,
  readConfigEditHabitId,
  readShowAddModal,
  withConfigEditHabitId,
  withShowAddModal,
} from '~/utils/habit-id';
import { ConfigCard, createConfigCardDragPreview } from './ConfigCard';
import { ConfigCardModal } from './ConfigCardModal';
import { ConfigHabitTypePickerModal, type HabitTypeChoice } from './ConfigHabitTypePickerModal';
import { removeHabitFromConfigYaml, addHabitToConfigYaml } from '~/utils/configHabitDraft';

type ConfigGuiEditorProps = {
  configText: string;
  habits: ConfigHabitCard[];
  order: string[];
  onOrderChange: (order: string[]) => void;
  onConfigTextChange: (text: string) => void;
  registerAddHabit?: (addHabit: (() => void) | null) => void;
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
  registerAddHabit,
}: ConfigGuiEditorProps) {
  const [draggingName, setDraggingName] = useState<string | null>(null);
  const [insertIndex, setInsertIndex] = useState<number | null>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const dragPreviewRef = useRef<HTMLElement | null>(null);
  const sessionRef = useRef<ReorderSession | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { present, closeModal } = useModal();
  const { showToast } = useToast();
  const locationRef = useRef(location);
  const configTextRef = useRef(configText);
  const onConfigTextChangeRef = useRef(onConfigTextChange);
  const pendingNewHabitRef = useRef<string | null>(null);
  const pendingDeepLinkHabitIdRef = useRef<string | null | undefined>(undefined);
  const pendingShowAddModalRef = useRef<boolean | undefined>(undefined);

  locationRef.current = location;
  configTextRef.current = configText;
  onConfigTextChangeRef.current = onConfigTextChange;

  if (pendingDeepLinkHabitIdRef.current === undefined) {
    pendingDeepLinkHabitIdRef.current = readConfigEditHabitId(location.search);
  }

  if (pendingShowAddModalRef.current === undefined) {
    pendingShowAddModalRef.current = readShowAddModal(location.search);
  }

  const syncConfigSearch = useCallback(
    (search: string): Promise<void> => {
      const { pathname } = locationRef.current;
      navigate({ pathname, search }, { replace: true });
      return Promise.resolve();
    },
    [navigate],
  );

  const syncHabitQueryParam = useCallback(
    (habitId: string | null): Promise<void> => {
      const { search } = locationRef.current;
      let next = withConfigEditHabitId(search, habitId);
      if (habitId) next = withShowAddModal(next, false);
      return syncConfigSearch(next);
    },
    [syncConfigSearch],
  );

  const syncShowAddModalQueryParam = useCallback(
    (show: boolean): Promise<void> => {
      const { search } = locationRef.current;
      let next = withShowAddModal(search, show);
      if (show) next = withConfigEditHabitId(next, null);
      return syncConfigSearch(next);
    },
    [syncConfigSearch],
  );

  const closeHabitModal = useCallback(() => {
    closeModal();
  }, [closeModal]);

  const onHabitModalRequestClose = useCallback(() => {
    const pendingNewHabit = pendingNewHabitRef.current;
    pendingNewHabitRef.current = null;
    void syncHabitQueryParam(null);
    if (pendingNewHabit) {
      onConfigTextChangeRef.current(
        removeHabitFromConfigYaml(configTextRef.current, pendingNewHabit),
      );
    }
  }, [syncHabitQueryParam]);

  const cancelHabitModal = closeHabitModal;

  const handleDoneClick = useCallback(
    async (next: string, appliedHabitName: string) => {
      pendingNewHabitRef.current = null;
      configTextRef.current = next;
      closeModal();
      onConfigTextChangeRef.current(next);
      void syncHabitQueryParam(null);
      showToast({
        type: 'info',
        message: `Applied changes to ${appliedHabitName}`,
      });
    },
    [closeModal, showToast, syncHabitQueryParam],
  );

  const handleRemoveClick = useCallback(
    async (habitName: string) => {
      pendingNewHabitRef.current = null;
      const next = removeHabitFromConfigYaml(configTextRef.current, habitName);
      configTextRef.current = next;
      closeModal();
      onConfigTextChangeRef.current(next);
      void syncHabitQueryParam(null);
      showToast({
        type: 'info',
        message: `Removed ${habitName}`,
      });
    },
    [closeModal, showToast, syncHabitQueryParam],
  );

  const openHabitModal = useCallback(
    (habit: ConfigHabitCard, options?: { isNew?: boolean; configText?: string }) => {
      const modalConfigText = options?.configText ?? configTextRef.current;
      void syncHabitQueryParam(configEditHabitQueryValue(habit.name));
      present({
        size: 'large',
        content: (
          <ConfigCardModal
            configText={modalConfigText}
            habitName={habit.name}
            isNewHabit={options?.isNew}
            onDoneClick={handleDoneClick}
            onRemoveClick={handleRemoveClick}
            onCancel={cancelHabitModal}
          />
        ),
        onRequestClose: onHabitModalRequestClose,
      });
    },
    [
      cancelHabitModal,
      handleDoneClick,
      handleRemoveClick,
      onHabitModalRequestClose,
      present,
      syncHabitQueryParam,
    ],
  );

  const addHabitWithType = useCallback(
    (type: HabitTypeChoice) => {
      const { text: next, habitName } = addHabitToConfigYaml(configTextRef.current, type);
      configTextRef.current = next;
      onConfigTextChangeRef.current(next);
      pendingNewHabitRef.current = habitName;
      openHabitModal(
        {
          name: habitName,
          type,
          goal: null,
          hasSummationOptions: false,
          hasHistory: false,
          ...(type === 'single_select' ? { optionLabels: ['1', '2', '3'] } : {}),
        },
        { isNew: true, configText: next },
      );
    },
    [openHabitModal],
  );

  const onAddModalRequestClose = useCallback(() => {
    void syncShowAddModalQueryParam(false);
  }, [syncShowAddModalQueryParam]);

  const openAddModal = useCallback(() => {
    void syncShowAddModalQueryParam(true);
    present({
      size: 'large',
      content: <ConfigHabitTypePickerModal onSelect={addHabitWithType} />,
      onRequestClose: onAddModalRequestClose,
    });
  }, [addHabitWithType, onAddModalRequestClose, present, syncShowAddModalQueryParam]);

  const addHabit = openAddModal;

  useEffect(() => {
    registerAddHabit?.(addHabit);
    return () => registerAddHabit?.(null);
  }, [addHabit, registerAddHabit]);

  useEffect(() => {
    const habitId = pendingDeepLinkHabitIdRef.current;
    if (!habitId) return;

    pendingDeepLinkHabitIdRef.current = null;

    const habitName = findHabitNameByConfigEditId(habits, habitId);
    if (!habitName) return;

    const habit = habits.find((h) => h.name === habitName);
    if (!habit) return;

    pendingShowAddModalRef.current = false;
    openHabitModal(habit);
  }, [habits, openHabitModal]);

  useEffect(() => {
    if (!pendingShowAddModalRef.current) return;

    pendingShowAddModalRef.current = false;
    present({
      size: 'large',
      content: <ConfigHabitTypePickerModal onSelect={addHabitWithType} />,
      onRequestClose: onAddModalRequestClose,
    });
  }, [addHabitWithType, onAddModalRequestClose, present]);

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
