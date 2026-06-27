import { Button } from '@habsum/ui/components/Button';
import { ModalFooter } from '@habsum/ui/contexts/modal';

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
