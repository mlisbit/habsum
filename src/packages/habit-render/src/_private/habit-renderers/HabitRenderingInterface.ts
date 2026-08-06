import type { ComponentType, ReactElement, ReactNode } from 'react';
import type { HabitPatch } from '@habsum/types/api-responses/habit-patch';
import type { Day } from '@habsum/types/common/day';

export type HabitRenderingProps = {
  user: string;
  viewDate: Day;
  pending: boolean;
  LinkComponent?: ComponentType<{ to: string; className?: string; children: ReactNode }>;
  onNavigate?: (url: string) => void;
  className?: string;
  onUpdate: (patch: HabitPatch) => Promise<void>;
};

export default interface HabitRenderingInterface {
  wrappingComponent(props: HabitRenderingProps): ReactElement;
  wrappingDemoComponent(props: HabitRenderingProps): ReactElement;
}
