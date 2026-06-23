// exclusive-bem-block: habit-menu-modal
import { Button } from '@habsum/ui/components/Button';
import { ModalBody, ModalHeader } from '@habsum/ui/contexts/modal';
import { configEditHabitUrl } from '@habsum/utils/habit-id';

type HabitMenuModalProps = {
  user: string;
  habitName: string;
  pending?: boolean;
  onNavigate?: (url: string) => void;
  closeModal: () => void;
  onReset: () => void | Promise<void>;
};

export function HabitMenuModal({
  user,
  habitName,
  pending = false,
  onNavigate,
  closeModal,
  onReset,
}: HabitMenuModalProps) {
  const onEdit = () => {
    const url = configEditHabitUrl(user, habitName);
    closeModal();
    if (onNavigate) {
      onNavigate(url);
    } else {
      window.location.href = url;
    }
  };

  return (
    <>
      <ModalHeader dismissDisabled={pending}>{habitName} options</ModalHeader>
      <ModalBody className="habit-menu-modal__body">
        <Button
          type="secondary"
          size="medium"
          text="Reset data for day"
          className="habit-menu-modal__action"
          disabled={pending}
          onClick={() => {
            void onReset();
          }}
        />
        <Button
          type="secondary"
          size="medium"
          text="Edit widget"
          className="habit-menu-modal__action"
          disabled={pending}
          onClick={onEdit}
        />
      </ModalBody>
    </>
  );
}
