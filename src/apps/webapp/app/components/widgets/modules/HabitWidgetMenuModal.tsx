import { useNavigate } from '@remix-run/react';
import { Button } from '~/core-components/Button';
import { ModalBody, ModalHeader } from '~/context/modal';
import { configEditHabitUrl } from '~/utils/habit-id';

type HabitWidgetMenuModalProps = {
  user: string;
  habitName: string;
  pending?: boolean;
  closeModal: () => void;
  onReset: () => void | Promise<void>;
};

export function HabitWidgetMenuModal({
  user,
  habitName,
  pending = false,
  closeModal,
  onReset,
}: HabitWidgetMenuModalProps) {
  const navigate = useNavigate();

  const onEdit = () => {
    closeModal();
    navigate(configEditHabitUrl(user, habitName));
  };

  return (
    <>
      <ModalHeader dismissDisabled={pending}>{habitName} options</ModalHeader>
      <ModalBody className="habit-widget-menu-modal__body">
        <Button
          type="secondary"
          size="small"
          text="Reset data for day"
          className="habit-widget-menu-modal__action"
          disabled={pending}
          onClick={() => {
            void onReset();
          }}
        />
        <Button
          type="secondary"
          size="small"
          text="Edit widget"
          className="habit-widget-menu-modal__action"
          disabled={pending}
          onClick={onEdit}
        />
      </ModalBody>
    </>
  );
}
