import { useCallback, useState } from 'react';
import { Link } from '@remix-run/react';
import type { HabitRowSingleSelect } from '@habsum/api-types';
import { habitIdPathSegment } from '~/utils/habit-id';
import { useLongPress } from '~/utils/use-long-press';
import { Button } from '~/core-components/Button';
import { HistoryDisplay } from '~/components/HistoryDisplay';
import { ModalActions, ModalBody, useModal } from '~/context/modal';

type SingleSelectWidgetProps = {
  user: string;
  habit: HabitRowSingleSelect;
  onSelectOption: (option: string) => Promise<void>;
  /** Clears the stored selection for today (`null` in the API). */
  onClearSelection: () => Promise<void>;
  /** Extra root class(es), e.g. page layout hooks (`habits-page__tile`). */
  surfaceClassName?: string;
};

function singleSelectIsComplete(habit: HabitRowSingleSelect): boolean {
  return habit.value != null;
}

export function SingleSelectWidget({
  user,
  habit,
  onSelectOption,
  onClearSelection,
  surfaceClassName,
}: SingleSelectWidgetProps) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const isComplete = singleSelectIsComplete(habit);
  const { present, closeModal } = useModal();

  const openResetModal = useCallback(() => {
    const runClear = async () => {
      setPending(true);
      setError(null);
      try {
        await onClearSelection();
        closeModal();
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setPending(false);
      }
    };

    present({
      content: (
        <>
          <ModalBody>
            <p id="modal-title" className="text-b-m">
              Reset?
            </p>
          </ModalBody>
          <ModalActions>
            <Button type="secondary" size="small" text="Cancel" onClick={closeModal} />
            <Button type="secondary" size="small" text="Reset" onClick={() => void runClear()} />
          </ModalActions>
        </>
      ),
    });
  }, [present, closeModal, onClearSelection]);

  const longPress = useLongPress(openResetModal);

  const idSeg = habitIdPathSegment(habit.name);
  const to = `/users/${encodeURIComponent(user)}/habits/${encodeURIComponent(idSeg)}${
    typeof window !== 'undefined' ? window.location.search : ''
  }`;

  return (
    <div
      className={[
        'card',
        'habit-select',
        surfaceClassName,
        isComplete ? 'habit-widget--complete' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="row">
        <div>
          <h2 className="text-h-l">
            <Link className="habit-widget__title text-h-l" to={to}>
              {habit.name}
            </Link>
          </h2>
          <div className="text-light text-b-m">{habit.value ?? '—'}</div>
        </div>
        <div className="habit-select__options">
          {habit.options.map((opt) => {
            const selected = habit.value === opt;
            const dim = habit.value != null && !selected;
            return (
              <Button
                key={opt}
                type={selected ? 'primary' : 'secondary'}
                text={opt}
                disabled={pending}
                className={
                  dim ? 'habit-select__option habit-select__option--dim' : 'habit-select__option'
                }
                {...longPress.pointerProps}
                onClick={longPress.wrapOnClick(async () => {
                  setPending(true);
                  setError(null);
                  try {
                    await onSelectOption(opt);
                  } catch (e) {
                    setError(e instanceof Error ? e.message : String(e));
                  } finally {
                    setPending(false);
                  }
                })}
              />
            );
          })}
        </div>
      </div>
      {error ? <p className="warn text-b-s habit-select__error">{error}</p> : null}
      <HistoryDisplay history={habit.history} />
    </div>
  );
}
