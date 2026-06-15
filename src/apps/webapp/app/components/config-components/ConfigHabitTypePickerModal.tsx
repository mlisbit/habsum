// exclusive-bem-block: config-habit-type-picker
import type { ReactNode } from 'react';
import HabitRenderer from '~/components/habit-renderer/HabitRenderer';
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
      className="card card--clickable config-habit-type-picker__option"
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
      <ModalHeader>How do you want to track this habit?</ModalHeader>
      <ModalBody className="config-habit-type-picker">
        <div className="config-habit-type-picker__options">
          <TypeOption
            title="Count toward a goal"
            description="Great for water, reading, exercise, or anything you measure with numbers."
            preview={<SummationTypePreview />}
            onSelect={() => onSelect('summation')}
          />
          <TypeOption
            title="Choose one option"
            description="Great for mood, alcohol intake, sleep quality, or other ratings."
            preview={<SingleSelectTypePreview />}
            onSelect={() => onSelect('single_select')}
          />
          <TypeOption
            title="Yes / No"
            description="Great for habits that are simply done or not done."
            preview={<CheckboxTypePreview />}
            onSelect={() => onSelect('checkbox')}
          />
        </div>
      </ModalBody>
    </>
  );
}
