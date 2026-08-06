import type { HabitRowSummation } from '@habsum/types/common/habit';
import { CountControl } from '../heading-renderer-helpers/CountControl';
import { HabitHeadingRender } from '../heading-renderer-helpers/HabitHeadingRender';
import { isGoalHit } from '@habsum/utils/habit-helpers';
import type HabitRenderingInterface from './HabitRenderingInterface';
import type { HabitRenderingProps } from './HabitRenderingInterface';

export default class SummationHabitRenderer implements HabitRenderingInterface {
  constructor(private readonly habit: HabitRowSummation) {}

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
        actions={
          <CountControl
            summationSteps={this.habit.details.summationOptions}
            displayTotal={this.habit.details.total}
            habitName={this.habit.name}
            onAddDelta={(delta) => onUpdate({ habit: this.habit.name, total: delta })}
          />
        }
      />
    );
  }
}
