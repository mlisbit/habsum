import { useCallback, useState } from 'react';
import type { HabitRowSingleSelect } from '@habsum/types/common/habit';
import { HabitWidgetHeading } from '~/components/widgets/HabitWidgetHeading';
import { HabitWidgetMenuModal } from '~/components/widgets/modules/HabitWidgetMenuModal';
import { Button } from '~/core-components/Button';
import { InfoText } from '~/core-components/InfoText';
import { useModal } from '~/context/modal';
import { Streak } from '~/components/widgets/modules/Streak';

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
        <HabitWidgetMenuModal
          user={user}
          habitName={habit.name}
          pending={pending}
          closeModal={closeModal}
          onReset={runClear}
        />
      ),
    });
  }, [present, closeModal, onClearSelection, pending, user, habit.name]);

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
      <div className="habit-select__row">
        <HabitWidgetHeading
          user={user}
          habitName={habit.name}
          pending={pending}
          menuAriaLabel={`More options for ${habit.name}`}
          onMenuClick={openResetModal}
        />
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
                onClick={() => {
                  void (async () => {
                    setPending(true);
                    setError(null);
                    try {
                      await onSelectOption(opt);
                    } catch (e) {
                      setError(e instanceof Error ? e.message : String(e));
                    } finally {
                      setPending(false);
                    }
                  })();
                }}
              />
            );
          })}
        </div>
      </div>
      {error ? (
        <InfoText variant="error" className="habit-select__error">
          {error}
        </InfoText>
      ) : null}
      {habit.streak ? <Streak streak={habit.streak} /> : null}
    </div>
  );
}
