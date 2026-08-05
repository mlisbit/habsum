// exclusive-bem-block: config-gui-editor
import {
  Fragment,
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useModal } from '@habsum/ui/contexts/modal';
import { useToast } from '@habsum/ui/contexts/toast';
import { type ConfigHabitDraft, type UserConfigJson, type UserConfigJsonHabit } from '~/api.client';
import {
  configEditHabitQueryValue,
  findHabitNameByConfigEditId,
  readConfigEditHabitId,
  readShowAddModal,
  withConfigEditHabitId,
  withShowAddModal,
} from '~/utils/habit-id';
import { ConfigCard, createConfigCardDragPreview } from './ConfigCard';
import { ConfigModalRenderer } from './renderers/ConfigModalRenderer';
import { ConfigHabitTypePickerModal, type HabitTypeChoice } from './ConfigHabitTypePickerModal';
import {
  addHabitToConfig,
  applyHabitDraftToConfig,
  draftFromHabit,
  removeHabitFromConfig,
} from '~/utils/configHabitDraft';

type ConfigGuiEditorProps = {
  config: UserConfigJson | null;
  habits: UserConfigJsonHabit[];
  order: string[];
  onOrderChange: (order: string[]) => void;
  onConfigChange: (config: UserConfigJson) => void;
  registerAddHabit?: (addHabit: (() => void) | null) => void;
};

type ReorderSession = {
  name: string;
  offsetY: number;
  lockedLeft: number;
};

type ActiveConfigModal =
  | {
      kind: 'habit';
      habitId: string;
      dispose: () => void;
    }
  | {
      kind: 'add';
      dispose: () => void;
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
  config,
  habits,
  order,
  onOrderChange,
  onConfigChange,
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
  const configRef = useRef(config);
  const onConfigChangeRef = useRef(onConfigChange);
  const pendingNewHabitRef = useRef<string | null>(null);
  const activeConfigModalRef = useRef<ActiveConfigModal | null>(null);
  const pendingConfigModalSearchRef = useRef<string | null>(null);

  locationRef.current = location;
  configRef.current = config;
  onConfigChangeRef.current = onConfigChange;

  const syncConfigSearch = useCallback(
    (search: string, options?: { replace?: boolean }): Promise<void> => {
      const { pathname } = locationRef.current;
      if (pathname === locationRef.current.pathname && search === locationRef.current.search) {
        return Promise.resolve();
      }
      navigate({ pathname, search }, { replace: options?.replace ?? true });
      return Promise.resolve();
    },
    [navigate],
  );

  const syncHabitQueryParam = useCallback(
    (habitId: string | null, options?: { replace?: boolean }): Promise<void> => {
      const { search } = locationRef.current;
      let next = withConfigEditHabitId(search, habitId);
      if (habitId) next = withShowAddModal(next, false);
      return syncConfigSearch(next, options);
    },
    [syncConfigSearch],
  );

  const syncShowAddModalQueryParam = useCallback(
    (show: boolean, options?: { replace?: boolean }): Promise<void> => {
      const { search } = locationRef.current;
      let next = withShowAddModal(search, show);
      if (show) next = withConfigEditHabitId(next, null);
      return syncConfigSearch(next, options);
    },
    [syncConfigSearch],
  );

  const cleanupPendingNewHabit = useCallback(() => {
    const pendingNewHabit = pendingNewHabitRef.current;
    pendingNewHabitRef.current = null;
    if (!pendingNewHabit || configRef.current == null) return;
    try {
      const next = removeHabitFromConfig(configRef.current, pendingNewHabit);
      configRef.current = next;
      onConfigChangeRef.current(next);
    } catch (e) {
      showToast({ type: 'error', message: e instanceof Error ? e.message : String(e) });
    }
  }, [showToast]);

  const disposeActiveConfigModal = useCallback(
    (cleanupNewHabit: boolean) => {
      const activeConfigModal = activeConfigModalRef.current;
      activeConfigModalRef.current = null;
      activeConfigModal?.dispose();
      if (cleanupNewHabit) cleanupPendingNewHabit();
    },
    [cleanupPendingNewHabit],
  );

  const closeHabitModal = useCallback(() => {
    closeModal();
  }, [closeModal]);

  const onHabitModalRequestClose = useCallback(() => {
    void syncHabitQueryParam(null);
    activeConfigModalRef.current = null;
    cleanupPendingNewHabit();
  }, [cleanupPendingNewHabit, syncHabitQueryParam]);

  const cancelHabitModal = closeHabitModal;

  const applyHabitDraft = useCallback(
    async (habitName: string, draft: ConfigHabitDraft) => {
      try {
        if (configRef.current == null) throw new Error('config is not loaded');
        const next = applyHabitDraftToConfig(configRef.current, habitName, draft);
        pendingNewHabitRef.current = null;
        configRef.current = next.config;
        closeModal();
        onConfigChangeRef.current(next.config);
        void syncHabitQueryParam(null);
        showToast({
          type: 'info',
          message: `Applied changes to ${next.appliedHabitName}`,
        });
      } catch (e) {
        showToast({ type: 'error', message: e instanceof Error ? e.message : String(e) });
      }
    },
    [closeModal, showToast, syncHabitQueryParam],
  );

  const handleRemoveClick = useCallback(
    async (habitName: string) => {
      try {
        pendingNewHabitRef.current = null;
        if (configRef.current == null) throw new Error('config is not loaded');
        const next = removeHabitFromConfig(configRef.current, habitName);
        configRef.current = next;
        closeModal();
        onConfigChangeRef.current(next);
        void syncHabitQueryParam(null);
        showToast({
          type: 'info',
          message: `Removed ${habitName}`,
        });
      } catch (e) {
        showToast({ type: 'error', message: e instanceof Error ? e.message : String(e) });
      }
    },
    [closeModal, showToast, syncHabitQueryParam],
  );

  const presentHabitModal = useCallback(
    (habit: UserConfigJsonHabit, options?: { isNew?: boolean; config?: UserConfigJson }) => {
      const modalConfig = options?.config ?? configRef.current;
      let habitModel: UserConfigJsonHabit | undefined;
      try {
        habitModel = modalConfig?.habits.find((item) => item.name === habit.name);
        if (!habitModel) throw new Error(`unknown habit: ${habit.name}`);
      } catch (e) {
        showToast({ type: 'error', message: e instanceof Error ? e.message : String(e) });
        return;
      }
      const draft = draftFromHabit(habitModel);
      const habitId = configEditHabitQueryValue(habitModel.name);
      const content = (
        <ConfigModalRenderer
          habit={habitModel}
          initialDraft={draft}
          isNewHabit={options?.isNew}
          onDoneClick={applyHabitDraft}
          onRemoveClick={handleRemoveClick}
          onCancel={cancelHabitModal}
        />
      );
      disposeActiveConfigModal(false);
      const dispose = present({
        size: 'xl',
        content,
        onRequestClose: onHabitModalRequestClose,
        history: false,
      });
      activeConfigModalRef.current = { kind: 'habit', habitId, dispose };
    },
    [
      cancelHabitModal,
      applyHabitDraft,
      disposeActiveConfigModal,
      handleRemoveClick,
      onHabitModalRequestClose,
      present,
      showToast,
    ],
  );

  const openHabitModal = useCallback(
    async (habit: UserConfigJsonHabit, options?: { isNew?: boolean; config?: UserConfigJson }) => {
      let nextSearch = withConfigEditHabitId(
        locationRef.current.search,
        configEditHabitQueryValue(habit.name),
      );
      nextSearch = withShowAddModal(nextSearch, false);
      pendingConfigModalSearchRef.current = nextSearch;
      void syncConfigSearch(nextSearch, { replace: false });
      presentHabitModal(habit, options);
    },
    [presentHabitModal, syncConfigSearch],
  );

  const addHabitWithType = useCallback(
    async (typeChoice: HabitTypeChoice) => {
      try {
        if (configRef.current == null) throw new Error('config is not loaded');
        const type = typeChoice === 'checkbox' ? 'single_select' : typeChoice;
        const checkboxTheme = typeChoice === 'checkbox';
        const result = addHabitToConfig(
          configRef.current,
          type,
          checkboxTheme ? { theme: 'checkbox' } : undefined,
        );
        const next = result.config;
        const { habitName } = result;
        configRef.current = next;
        onConfigChangeRef.current(next);
        pendingNewHabitRef.current = habitName;
        const habit = next.habits.find((item) => item.name === habitName);
        if (!habit) throw new Error(`unknown habit: ${habitName}`);
        await openHabitModal(habit, { isNew: true, config: next });
      } catch (e) {
        showToast({ type: 'error', message: e instanceof Error ? e.message : String(e) });
      }
    },
    [openHabitModal, showToast],
  );

  const onAddModalRequestClose = useCallback(() => {
    void syncShowAddModalQueryParam(false);
    activeConfigModalRef.current = null;
  }, [syncShowAddModalQueryParam]);

  const presentAddModal = useCallback(() => {
    disposeActiveConfigModal(false);
    const dispose = present({
      size: 'xl',
      content: <ConfigHabitTypePickerModal onSelect={addHabitWithType} />,
      onRequestClose: onAddModalRequestClose,
      history: false,
    });
    activeConfigModalRef.current = { kind: 'add', dispose };
  }, [addHabitWithType, disposeActiveConfigModal, onAddModalRequestClose, present]);

  const openAddModal = useCallback(() => {
    let nextSearch = withShowAddModal(locationRef.current.search, true);
    nextSearch = withConfigEditHabitId(nextSearch, null);
    pendingConfigModalSearchRef.current = nextSearch;
    void syncConfigSearch(nextSearch, { replace: false });
    presentAddModal();
  }, [presentAddModal, syncConfigSearch]);

  const addHabit = openAddModal;

  useEffect(() => {
    registerAddHabit?.(addHabit);
    return () => registerAddHabit?.(null);
  }, [addHabit, registerAddHabit]);

  useEffect(() => {
    return () => {
      const activeConfigModal = activeConfigModalRef.current;
      disposeActiveConfigModal(activeConfigModal?.kind === 'habit');
    };
  }, [disposeActiveConfigModal]);

  useEffect(() => {
    const pendingSearch = pendingConfigModalSearchRef.current;
    if (pendingSearch) {
      if (location.search !== pendingSearch) return;
      pendingConfigModalSearchRef.current = null;
    }

    const habitId = readConfigEditHabitId(location.search);
    if (habitId) {
      const activeConfigModal = activeConfigModalRef.current;
      if (activeConfigModal?.kind === 'habit' && activeConfigModal.habitId === habitId) return;

      const habitName = findHabitNameByConfigEditId(habits, habitId);
      const habit = habitName ? habits.find((h) => h.name === habitName) : null;
      if (habit) presentHabitModal(habit);
      return;
    }

    if (readShowAddModal(location.search)) {
      if (activeConfigModalRef.current?.kind !== 'add') presentAddModal();
      return;
    }

    const activeConfigModal = activeConfigModalRef.current;
    if (!activeConfigModal) return;
    disposeActiveConfigModal(activeConfigModal.kind === 'habit');
  }, [disposeActiveConfigModal, habits, location.search, presentAddModal, presentHabitModal]);

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
              onEdit={() => void openHabitModal(habit)}
              onReorderPointerDown={(event) => onReorderPointerDown(name, event)}
            />
          </Fragment>
        );
      })}
      {insertIndex === order.length ? <ConfigInsertMarker /> : null}
    </ul>
  );
}
