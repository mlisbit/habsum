import { useCallback } from 'react';
import type { HabitRowSingleSelect } from '@habsum/types/common/habit';
import type { HabitPatch } from '@habsum/types/api-responses/habit-patch';
import { HabitHeadingRender } from '../heading-renderer-helpers/HabitHeadingRender';
import { TogglePill } from '@habsum/ui/components/Pill';
import { TernaryCheckbox, type TernaryCheckboxValue } from '@habsum/ui/components/TernaryCheckbox';
import { isGoalHit } from '@habsum/utils/habit-helpers';
import type HabitRenderingInterface from './HabitRenderingInterface';
import type { HabitRenderingProps } from './HabitRenderingInterface';

function isCheckboxTheme(habit: HabitRowSingleSelect): boolean {
  return (
    habit.details.theme === 'checkbox' &&
    habit.details.options.length === 2 &&
    habit.details.options.includes('yes') &&
    habit.details.options.includes('no')
  );
}

function toTernaryCheckboxValue(value: string | null): TernaryCheckboxValue {
  return value === 'yes' || value === 'no' ? value : null;
}

function SingleSelectActions({
  habit,
  onUpdate,
}: {
  habit: HabitRowSingleSelect;
  onUpdate: (patch: HabitPatch) => Promise<void>;
}) {
  const checkboxTheme = isCheckboxTheme(habit);

  const handleSelectChange = useCallback(
    async (nextValue: TernaryCheckboxValue) => {
      if (nextValue == null) {
        await onUpdate({ habit: habit.name, action: 'clear' });
      } else {
        await onUpdate({ habit: habit.name, value: nextValue });
      }
    },
    [habit.name, onUpdate],
  );

  if (checkboxTheme) {
    return (
      <TernaryCheckbox
        value={toTernaryCheckboxValue(habit.details.value)}
        aria-label={`${habit.name}: ${habit.details.value ?? 'not set'}`}
        onChange={(nextValue) => {
          void handleSelectChange(nextValue);
        }}
      />
    );
  }

  return (
    <div className="habit-select__options">
      {habit.details.options.map((option) => {
        const selected = habit.details.value === option;
        const dim = habit.details.value != null && !selected;
        return (
          <TogglePill
            key={option}
            selected={selected}
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
        goalHit={isGoalHit(this.habit)}
        onReset={() => onUpdate({ habit: this.habit.name, action: 'clear' })}
        demo={demo}
        className={['mb-4', className].filter(Boolean).join(' ')}
        actions={<SingleSelectActions habit={this.habit} onUpdate={onUpdate} />}
      />
    );
  }
}
