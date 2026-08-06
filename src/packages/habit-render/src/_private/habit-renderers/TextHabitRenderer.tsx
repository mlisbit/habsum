import { useEffect, useRef, useState } from 'react';
import type { HabitPatch } from '@habsum/types/api-responses/habit-patch';
import type { HabitRowText } from '@habsum/types/common/habit';
import { HabitHeadingRender } from '../heading-renderer-helpers/HabitHeadingRender';
import type HabitRenderingInterface from './HabitRenderingInterface';
import type { HabitRenderingProps } from './HabitRenderingInterface';

const TEXT_AUTOSAVE_DELAY_MS = 600;

function TextHabitActions({
  habit,
  pending,
  onUpdate,
}: {
  habit: HabitRowText;
  pending: boolean;
  onUpdate: (patch: HabitPatch) => Promise<void>;
}) {
  const storedText = habit.details.text ?? '';
  const [draft, setDraft] = useState(storedText);
  const draftRef = useRef(storedText);
  const lastAttemptedDraftRef = useRef(storedText);

  useEffect(() => {
    if (draftRef.current !== lastAttemptedDraftRef.current) return;
    draftRef.current = storedText;
    lastAttemptedDraftRef.current = storedText;
    setDraft((current) => (current === storedText ? current : storedText));
  }, [storedText]);

  useEffect(() => {
    if (pending || draft === storedText || draft === lastAttemptedDraftRef.current) return;

    const timeout = window.setTimeout(() => {
      lastAttemptedDraftRef.current = draft;
      void onUpdate({ habit: habit.name, text: draft });
    }, TEXT_AUTOSAVE_DELAY_MS);

    return () => window.clearTimeout(timeout);
  }, [draft, habit.name, onUpdate, pending, storedText]);

  return (
    <textarea
      className="habit-text__input text-b-m mb-4"
      aria-label={`${habit.name} text for the day`}
      placeholder="Write something for this day…"
      rows={3}
      value={draft}
      aria-busy={pending}
      onChange={(event) => {
        draftRef.current = event.target.value;
        setDraft(event.target.value);
      }}
    />
  );
}

export default class TextHabitRenderer implements HabitRenderingInterface {
  constructor(private readonly habit: HabitRowText) {}

  wrappingComponent(props: HabitRenderingProps) {
    return this.getWrappingComponent(props, false);
  }

  wrappingDemoComponent(props: HabitRenderingProps) {
    return this.getWrappingComponent(props, true);
  }

  private getWrappingComponent(props: HabitRenderingProps, demo: boolean) {
    const { className, viewDate, pending, onUpdate, ...headingProps } = props;

    return (
      <div className={className}>
        <HabitHeadingRender
          {...headingProps}
          viewDate={viewDate}
          pending={pending}
          habitName={this.habit.name}
          onReset={() => onUpdate({ habit: this.habit.name, action: 'clear' })}
          demo={demo}
          className="mb-4"
        />
        <TextHabitActions
          key={`${this.habit.name}:${viewDate}`}
          habit={this.habit}
          pending={pending}
          onUpdate={onUpdate}
        />
      </div>
    );
  }
}
