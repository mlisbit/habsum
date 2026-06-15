import { AlertModal } from '@habsum/ui/contexts/modal';

type UnsavedChangesModalProps = {
  onKeepEditing: () => void;
  onDiscardChanges: () => void;
};

export function UnsavedChangesModal({ onKeepEditing, onDiscardChanges }: UnsavedChangesModalProps) {
  return (
    <AlertModal
      title="Discard unsaved changes?"
      message="Any changes you’ve made will be lost."
      cancelLabel="Keep editing"
      continueLabel="Discard changes"
      onCancel={onKeepEditing}
      onContinueWithoutSaving={onDiscardChanges}
    />
  );
}
