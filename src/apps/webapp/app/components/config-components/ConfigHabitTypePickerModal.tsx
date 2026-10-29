// exclusive-bem-block: config-habit-type-picker
import type { ReactNode } from 'react';
import HabitRenderer from '@habsum/habit-render';
import { dayFromString } from '@habsum/types/common/day';
import { ModalBody, ModalHeader } from '@habsum/ui/contexts/modal';
import { build } from '@habsum/utils/model-builders/habit';

const PREVIEW_USER = '_preview';
const PREVIEW_VIEW_DATE = dayFromString('2025-05-21');
const previewNoop = async (): Promise<void> => {};

const PREVIEW_SUMMATION_HABIT = build()
  .withName('Pages read')
  .withType('summation')
  .withGoal(25)
  .withTotal(6)
  .withSummationOptions({ manualInput: true, increments: [25, 50] })
  .model();

const PREVIEW_SINGLE_SELECT_HABIT = build()
  .withName('Reading')
  .withType('single_select')
  .withOptions([
    { label: 'None', sentiment: 'positive' },
    { label: 'not much', sentiment: 'positive' },
    { label: 'a lot', sentiment: 'positive' },
  ])
  .model();

const PREVIEW_CHECKBOX_HABIT = build().withName('Reading').withType('checkbox').model();

const PREVIEW_TEXT_HABIT = build()
  .withName('Daily reflection')
  .withType('text')
  .withText('A thought from today')
  .model();

export type HabitTypeChoice = 'summation' | 'single_select' | 'checkbox' | 'text';

type ConfigHabitTypePickerModalProps = {
  onSelect: (type: HabitTypeChoice) => void;
};

function SummationTypePreview() {
  return (
    <HabitRenderer
      user={PREVIEW_USER}
      habit={PREVIEW_SUMMATION_HABIT}
      viewDate={PREVIEW_VIEW_DATE}
      onUpdate={previewNoop}
      demo
    />
  );
}

function SingleSelectTypePreview() {
  return (
    <HabitRenderer
      user={PREVIEW_USER}
      habit={PREVIEW_SINGLE_SELECT_HABIT}
      viewDate={PREVIEW_VIEW_DATE}
      onUpdate={previewNoop}
      demo
    />
  );
}

function CheckboxTypePreview() {
  return (
    <HabitRenderer
      user={PREVIEW_USER}
      habit={PREVIEW_CHECKBOX_HABIT}
      viewDate={PREVIEW_VIEW_DATE}
      onUpdate={previewNoop}
      demo
    />
  );
}

function TextTypePreview() {
  return (
    <HabitRenderer
      user={PREVIEW_USER}
      habit={PREVIEW_TEXT_HABIT}
      viewDate={PREVIEW_VIEW_DATE}
      onUpdate={previewNoop}
      demo
    />
  );
}

type TypeOptionProps = {
  title: string;
  description: string;
  onSelect: () => void;
  preview: ReactNode;
};

function TypeOption({ title, description, onSelect, preview }: TypeOptionProps) {
  return (
    <button
      type="button"
      className="card card--transparent card--clickable config-habit-type-picker__option"
      onClick={onSelect}
    >
      <div className="config-habit-type-picker__option-copy">
        <span className="text-h-m">{title}</span>
        <p className="config-habit-type-picker__description text-b-s text-light">{description}</p>
      </div>
      <div className="config-habit-type-picker__preview">
        <div className="config-habit-type-picker__preview-sample">{preview}</div>
      </div>
    </button>
  );
}

export function ConfigHabitTypePickerModal({ onSelect }: ConfigHabitTypePickerModalProps) {
  return (
    <>
      <ModalHeader>Choose a tracking type</ModalHeader>
      <ModalBody className="config-habit-type-picker">
        <div className="config-habit-type-picker__options">
          <TypeOption
            title="Count toward a goal"
            description="Track numbers like pages, minutes, miles, etc."
            preview={<SummationTypePreview />}
            onSelect={() => onSelect('summation')}
          />
          <TypeOption
            title="Pick from options"
            description="Choose one value from a predefined list."
            preview={<SingleSelectTypePreview />}
            onSelect={() => onSelect('single_select')}
          />
          <TypeOption
            title="Yes / No"
            description="Simply mark it done or not done."
            preview={<CheckboxTypePreview />}
            onSelect={() => onSelect('checkbox')}
          />
          <TypeOption
            title="Write text"
            description="Save a different plain-text entry each day."
            preview={<TextTypePreview />}
            onSelect={() => onSelect('text')}
          />
        </div>
      </ModalBody>
    </>
  );
}
