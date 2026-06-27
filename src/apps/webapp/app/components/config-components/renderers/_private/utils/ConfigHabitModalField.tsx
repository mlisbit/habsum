import type { ReactNode } from 'react';
import { ModalFooter } from '@habsum/ui/contexts/modal';
import { Button } from '@habsum/ui/components/Button';
import { ConfigHabitFieldLabel } from '../../../ConfigHabitFieldLabel';

type ConfigHabitModalFieldProps = {
  label: string;
  info?: string | null;
  tooltip?: string | null;
  htmlFor?: string;
  className?: string;
  children: ReactNode;
};

export function ConfigHabitModalField({
  label,
  info,
  tooltip,
  htmlFor,
  className,
  children,
}: ConfigHabitModalFieldProps) {
  return (
    <div className={['config-habit-modal__field', className].filter(Boolean).join(' ')}>
      <ConfigHabitFieldLabel
        htmlFor={htmlFor}
        label={label}
        info={info ?? undefined}
        tooltip={tooltip ?? undefined}
        className="config-habit-modal__label"
      />
      <div className="config-habit-modal__control">{children}</div>
    </div>
  );
}

export function ConfigHabitModalActions({
  dirty,
  saving,
  onCancel,
  onRemoveClick,
  onDoneClick,
}: {
  dirty: boolean;
  saving: boolean;
  onCancel: () => void;
  onRemoveClick: () => void;
  onDoneClick: () => void;
}) {
  return (
    <ModalFooter className="config-habit-modal__actions">
      <Button
        type="secondary"
        color="danger"
        text={saving ? 'Removing…' : 'Remove'}
        onClick={onRemoveClick}
        disabled={saving}
      />
      <div className="config-habit-modal__actions-main">
        <Button type="secondary" text="Cancel" onClick={onCancel} disabled={saving} />
        <Button
          type="primary"
          text={saving ? 'Saving…' : 'Done'}
          onClick={onDoneClick}
          disabled={saving || !dirty}
        />
      </div>
    </ModalFooter>
  );
}
