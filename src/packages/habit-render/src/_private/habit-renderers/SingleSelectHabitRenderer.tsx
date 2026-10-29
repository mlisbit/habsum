import { useCallback } from 'react';
import type { HabitRowSingleSelect } from '@habsum/types/common/habit';
import type { HabitPatch } from '@habsum/types/api-responses/habit-patch';
import { HabitHeadingRender } from '../heading-renderer-helpers/HabitHeadingRender';
import { TogglePill } from '@habsum/ui/components/Pill';
import { TernaryCheckbox, type TernaryCheckboxValue } from '@habsum/ui/components/TernaryCheckbox';
import type HabitRenderingInterface from './HabitRenderingInterface';
import type { HabitRenderingProps } from './HabitRenderingInterface';

function SingleSelectActions({
  habit,
  onUpdate,
}: {
  habit: HabitRowSingleSelect;
  onUpdate: (patch: HabitPatch) => Promise<void>;
}) {
  const checkboxTheme = habit.details.theme === 'checkbox';
  const positiveValue = habit.details.options.find(
    (option) => option.sentiment === 'positive',
  )?.label;
  const negativeValue = habit.details.options.find(
    (option) => option.sentiment === 'negative',
  )?.label;
  const checkboxValue =
    habit.details.value == null
      ? null
      : habit.details.value === positiveValue
        ? 'yes'
        : habit.details.value === negativeValue
          ? 'no'
          : null;

  const handleSelectChange = useCallback(
    async (nextValue: TernaryCheckboxValue) => {
      if (nextValue == null) {
        await onUpdate({ habit: habit.name, action: 'clear' });
      } else {
        const value = nextValue === 'yes' ? positiveValue : negativeValue;
        if (value != null) await onUpdate({ habit: habit.name, value });
      }
    },
    [habit.name, positiveValue, negativeValue, onUpdate],
  );

  if (checkboxTheme) {
    return (
      <TernaryCheckbox
        value={checkboxValue}
        valueLabel={habit.details.value ?? undefined}
        aria-label={`${habit.name}: ${habit.details.value ?? 'not set'}`}
        onChange={(nextValue) => {
          void handleSelectChange(nextValue);
        }}
      />
    );
  }

  return (
    <div className="habit-select__options">
      {habit.details.options.map(({ label: option, sentiment }) => {
        const selected = habit.details.value === option;
        const dim = habit.details.value != null && !selected;
        return (
          <TogglePill
            key={option}
            selected={selected}
            negative={sentiment === 'negative'}
            className={
              dim ? 'habit-select__option habit-select__option--dim' : 'habit-select__option'
            }
            onToggle={(nextSelected) => {
              void (async () => {
                if (nextSelected) {
                  await onUpdate({ habit: habit.name, value: option });
                } else {
                  await onUpdate({ habit: habit.name, action: 'clear' });
                }
              })();
            }}
          >
            {option}
          </TogglePill>
        );
      })}
    </div>
  );
}

export default class SingleSelectHabitRenderer implements HabitRenderingInterface {
  constructor(private readonly habit: HabitRowSingleSelect) {}

  wrappingComponent(props: HabitRenderingProps) {
    return this.getWrappingComponent(props, false);
  }

  wrappingDemoComponent(props: HabitRenderingProps) {
    return this.getWrappingComponent(props, true);
  }

  private getWrappingComponent(props: HabitRenderingProps, demo: boolean) {
    const { className, onUpdate, ...headingProps } = props;

    return (
      <HabitHeadingRender
        {...headingProps}
        habitName={this.habit.name}
        ctaUrl={this.habit.ctaUrl}
        onReset={() => onUpdate({ habit: this.habit.name, action: 'clear' })}
        demo={demo}
        className={['mb-4', className].filter(Boolean).join(' ')}
        actions={<SingleSelectActions habit={this.habit} onUpdate={onUpdate} />}
      />
    );
  }
}
