import { useCallback, useState } from 'react';
import type { HabitRowSingleSelect } from '@habsum/types/common/habit';
import { dayFromString } from '@habsum/types/common/day';
import { HabitWidgetHeading } from '~/components/widgets/HabitWidgetHeading';
import { HabitWidgetMenuModal } from '~/components/widgets/modules/HabitWidgetMenuModal';
import { InfoText } from '~/core-components/InfoText';
import { Icon } from '~/core-components/Icon';
import { TogglePill } from '~/core-components/Pill';
import { useModal } from '~/context/modal';
import { Streak } from '~/components/widgets/modules/Streak';
import { classBuilder } from '~/utils/class-builder';

type SingleSelectWidgetProps = {
  user: string;
  habit: HabitRowSingleSelect;
  /** Selected calendar day for this widget (`YYYY-MM-DD`). */
  dayKey: string;
  onSelectOption: (option: string) => Promise<void>;
  /** Clears the stored selection for today (`null` in the API). */
  onClearSelection: () => Promise<void>;
};

function singleSelectIsComplete(habit: HabitRowSingleSelect): boolean {
  return habit.value != null;
}

function isCheckboxTheme(habit: HabitRowSingleSelect): boolean {
  return (
    habit.theme === 'checkbox' &&
    habit.options.length === 2 &&
    habit.options.includes('yes') &&
    habit.options.includes('no')
  );
}

function nextCheckboxThemeValue(value: string | null): 'yes' | 'no' | null {
  if (value == null) return 'yes';
  if (value === 'yes') return 'no';
  return null;
}

export function SingleSelectWidget({
  user,
  habit,
  dayKey,
  onSelectOption,
  onClearSelection,
}: SingleSelectWidgetProps) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const isComplete = singleSelectIsComplete(habit);
  const checkboxTheme = isCheckboxTheme(habit);
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
    <div className={classBuilder({ 'habit-widget--complete': isComplete }, 'card')}>
      <div className="habit-select__row">
        <HabitWidgetHeading
          user={user}
          habitName={habit.name}
          pending={pending}
          menuAriaLabel={`More options for ${habit.name}`}
          onMenuClick={openResetModal}
        />
        {checkboxTheme ? (
          <button
            className={classBuilder(
              {
                'habit-select__checkbox--yes': habit.value === 'yes',
                'habit-select__checkbox--no': habit.value === 'no',
              },
              'habit-select__checkbox',
            )}
            type="button"
            aria-label={`${habit.name}: ${habit.value ?? 'not set'}`}
            disabled={pending}
            onClick={() => {
              const nextValue = nextCheckboxThemeValue(habit.value);
              void (async () => {
                setPending(true);
                setError(null);
                try {
                  if (nextValue == null) {
                    await onClearSelection();
                  } else {
                    await onSelectOption(nextValue);
                  }
                } catch (err) {
                  setError(err instanceof Error ? err.message : String(err));
                } finally {
                  setPending(false);
                }
              })();
            }}
          >
            {habit.value === 'yes' ? (
              <Icon name="check" sizePx={24} className="text-success" />
            ) : null}
            {habit.value === 'no' ? <Icon name="close" sizePx={24} className="text-error" /> : null}
          </button>
        ) : (
          <div className="habit-select__options">
            {habit.options.map((opt) => {
              const selected = habit.value === opt;
              const dim = habit.value != null && !selected;
              return (
                <TogglePill
                  key={opt}
                  selected={selected}
                  disabled={pending}
                  className={
                    dim ? 'habit-select__option habit-select__option--dim' : 'habit-select__option'
                  }
                  onToggle={(nextSelected) => {
                    void (async () => {
                      setPending(true);
                      setError(null);
                      try {
                        if (nextSelected) {
                          await onSelectOption(opt);
                        } else {
                          await onClearSelection();
                        }
                      } catch (e) {
                        setError(e instanceof Error ? e.message : String(e));
                      } finally {
                        setPending(false);
                      }
                    })();
                  }}
                >
                  {opt}
                </TogglePill>
              );
            })}
          </div>
        )}
      </div>
      {error ? (
        <InfoText variant="error" className="habit-select__error">
          {error}
        </InfoText>
      ) : null}
      {habit.streak ? <Streak streak={habit.streak} viewDate={dayFromString(dayKey)} /> : null}
    </div>
  );
}
