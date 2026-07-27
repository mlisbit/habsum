import { useCallback } from 'react';
import type { SummationOptions } from '@habsum/types/common/habit';
import { Button } from '@habsum/ui/components/Button';
import { useModal } from '@habsum/ui/contexts/modal';
import { CountControlAddModal } from './CountControlAddModal';
import { formatIncrementLabel, hasSummationOptions } from '@habsum/utils/habit-helpers';

export type CountControlProps = {
  /** Manual entry + quick-add increments from habit config. */
  summationSteps?: SummationOptions;
  /** Current logged total for the day; `null` means no stored row. */
  displayTotal: number | null;
  habitName: string;
  onAddDelta: (delta: number) => Promise<void>;
};

function AddAmountTrigger({ habitName, onClick }: { habitName: string; onClick: () => void }) {
  return (
    <Button
      type="tertiary"
      size="medium"
      icon="plus"
      className="count-control__amount-trigger text-b-m"
      onClick={onClick}
      aria-label={`Enter custom amount for ${habitName}`}
    />
  );
}

export function CountControl({
  summationSteps,
  displayTotal,
  habitName,
  onAddDelta,
}: CountControlProps) {
  const manualMode = hasSummationOptions(summationSteps);
  const increments = manualMode ? summationSteps.increments : [];
  const { present, closeModal } = useModal();

  const openAddModal = useCallback(() => {
    present({
      content: (
        <CountControlAddModal
          habitName={habitName}
          displayTotal={displayTotal}
          closeModal={closeModal}
          onSubmit={onAddDelta}
        />
      ),
    });
  }, [present, closeModal, habitName, displayTotal, onAddDelta]);

  const applyDelta = async (delta: number) => {
    await onAddDelta(delta);
  };

  if (manualMode) {
    return (
      <div className="count-control">
        <div className="count-control__manual-row">
          <AddAmountTrigger habitName={habitName} onClick={openAddModal} />
          <div className="count-control__increments" role="group" aria-label="Quick add amounts">
            {increments.map((delta, index) => (
              <Button
                key={`${delta}-${index}`}
                type="secondary"
                size="medium"
                text={formatIncrementLabel(delta)}
                className={delta < 0 ? 'text-error' : undefined}
                onClick={() => void applyDelta(delta)}
                aria-label={
                  delta < 0
                    ? `Subtract ${Math.abs(delta)} from ${habitName}`
                    : `Add ${delta} to ${habitName}`
                }
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="count-control">
      <AddAmountTrigger habitName={habitName} onClick={openAddModal} />
    </div>
  );
}
