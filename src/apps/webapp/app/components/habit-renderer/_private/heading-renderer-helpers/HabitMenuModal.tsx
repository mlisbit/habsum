// exclusive-bem-block: habit-menu-modal
import { useNavigate } from '@remix-run/react';
import { Button } from '@habsum/ui/components/Button';
import { ModalBody, ModalHeader } from '@habsum/ui/contexts/modal';
import { configEditHabitUrl } from '~/utils/habit-id';

type HabitMenuModalProps = {
  user: string;
  habitName: string;
  pending?: boolean;
  closeModal: () => void;
  onReset: () => void | Promise<void>;
};

export function HabitMenuModal({
  user,
  habitName,
  pending = false,
  closeModal,
  onReset,
}: HabitMenuModalProps) {
  const navigate = useNavigate();

  const onEdit = () => {
    closeModal();
    navigate(configEditHabitUrl(user, habitName));
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
