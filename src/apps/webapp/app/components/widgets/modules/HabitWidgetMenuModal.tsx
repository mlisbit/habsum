import { useNavigate } from '@remix-run/react';
import { Button } from '~/core-components/Button';
import { ModalActions, ModalBody } from '~/context/modal';
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
      <ModalBody>
        <p id="modal-title" className="text-b-m">
          Reset?
        </p>
      </ModalBody>
      <ModalActions>
        <Button
          type="secondary"
          size="small"
          text="Cancel"
          onClick={closeModal}
          disabled={pending}
        />
        <Button type="secondary" size="small" text="Edit" disabled={pending} onClick={onEdit} />
        <Button
          type="secondary"
          size="small"
          text="Reset"
          disabled={pending}
          onClick={() => {
            void onReset();
          }}
        />
      </ModalActions>
    </>
  );
}
