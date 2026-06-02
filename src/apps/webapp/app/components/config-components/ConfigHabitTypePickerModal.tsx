// exclusive-bem-block: config-habit-type-picker
import type { ReactNode } from 'react';
import { SingleSelectWidget, SummationWidget } from '~/components/widgets';
import { ModalBody, ModalHeader } from '~/context/modal';
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
    <SummationWidget
      user={PREVIEW_USER}
      habit={PREVIEW_SUMMATION_HABIT}
      dayKey={PREVIEW_VIEW_DATE}
      onAddAmount={previewNoop}
      onClearTotal={previewNoop}
      onDeleteSummationEvent={previewNoop}
    />
  );
}

function SingleSelectTypePreview() {
  return (
    <SingleSelectWidget
      user={PREVIEW_USER}
      habit={PREVIEW_SINGLE_SELECT_HABIT}
      dayKey={PREVIEW_VIEW_DATE}
      onSelectOption={previewNoop}
      onClearSelection={previewNoop}
    />
  );
}

function CheckboxTypePreview() {
  return (
    <SingleSelectWidget
      user={PREVIEW_USER}
      habit={PREVIEW_CHECKBOX_HABIT}
      dayKey={PREVIEW_VIEW_DATE}
      onSelectOption={previewNoop}
      onClearSelection={previewNoop}
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
      <span className="text-h-m">{title}</span>
      <p className="text-b-s text-light">{description}</p>
      <div className="config-habit-type-picker__preview">
        <div className="config-habit-type-picker__preview-sample">{preview}</div>
      </div>
    </button>
  );
}

export function ConfigHabitTypePickerModal({ onSelect }: ConfigHabitTypePickerModalProps) {
  return (
    <>
      <ModalHeader>Choose your habit style</ModalHeader>
      <ModalBody className="config-habit-type-picker">
        <div className="config-habit-type-picker__options">
          <TypeOption
            title="Summation"
            description="Track a numeric total for the day, with an optional goal."
            preview={<SummationTypePreview />}
            onSelect={() => onSelect('summation')}
          />
          <TypeOption
            title="Single select"
            description="Pick one option from a list, with optional streak tracking."
            preview={<SingleSelectTypePreview />}
            onSelect={() => onSelect('single_select')}
          />
          <TypeOption
            title="Checkbox"
            description="Track yes, no, or empty with a compact tri-state checkbox."
            preview={<CheckboxTypePreview />}
            onSelect={() => onSelect('checkbox')}
          />
        </div>
      </ModalBody>
    </>
  );
}
