// exclusive-bem-block: config-habit-type-picker
import type { ReactNode } from 'react';
import HabitRenderer from '@habsum/habit-render';
import { ModalBody, ModalHeader } from '@habsum/ui/contexts/modal';
import {
  PREVIEW_SINGLE_SELECT_HABIT,
  PREVIEW_CHECKBOX_HABIT,
  PREVIEW_SUMMATION_HABIT,
  PREVIEW_USER,
  PREVIEW_VIEW_DATE,
  previewNoop,
} from './utils';

export type HabitTypeChoice = 'summation' | 'single_select' | 'checkbox';

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
        </div>
      </ModalBody>
    </>
  );
}
