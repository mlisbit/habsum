import { useMemo, useState } from 'react';
import { Button } from '@habsum/ui/components/Button';
import { InfoText } from '@habsum/ui/components/InfoText';
import { Input } from '@habsum/ui/components/Input';
import { ModalBody, ModalFooter, ModalHeader } from '@habsum/ui/contexts/modal';

const AMOUNT_INPUT_PLACEHOLDER = 'Enter value';
const NUMBER_REQUIRED_MESSAGE = 'Value must be a number';

/** Parses manual adjust field — blank / invalid → null; otherwise truncated integer (+ or −; 0 is valid). */
function parseManualAdjustDelta(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === '') return null;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) return null;
  return Math.trunc(parsed);
}

type CountControlAddModalProps = {
  habitName: string;
  /** Current logged total for the day; `null` means no stored row. */
  displayTotal: number | null;
  closeModal: () => void;
  onSubmit: (delta: number) => Promise<void>;
};

export function CountControlAddModal({
  habitName,
  displayTotal,
  closeModal,
  onSubmit,
}: CountControlAddModalProps) {
  const [amountStr, setAmountStr] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showNumberRequiredMessage, setShowNumberRequiredMessage] = useState(false);

  const delta = useMemo(() => parseManualAdjustDelta(amountStr), [amountStr]);
  const newTotal = delta != null ? (displayTotal ?? 0) + delta : null;
  const subtracting = delta != null && delta < 0;
  const canSubmit = delta != null && !submitting;
  const ctaLabel = submitting
    ? subtracting
      ? 'Subtracting…'
      : 'Adding…'
    : subtracting
      ? 'Subtract'
      : 'Add';

  const handleAmountChange = (raw: string) => {
    if (raw !== amountStr && parseManualAdjustDelta(raw) != null) {
      setShowNumberRequiredMessage(false);
    }
    setAmountStr(raw);
  };

  const handleSubmit = async () => {
    if (delta == null || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit(delta);
      closeModal();
    } finally {
      setSubmitting(false);
    }
  };

  const inputDescribedBy =
    [
      showNumberRequiredMessage ? 'count-control-add-number-error' : null,
      newTotal != null ? 'count-control-add-new-total' : null,
    ]
      .filter(Boolean)
      .join(' ') || undefined;

  return (
    <>
      <ModalHeader dismissDisabled={submitting}>Add to &quot;{habitName}&quot;</ModalHeader>
      <ModalBody className="count-control__modal">
        <Input
          className="count-control__modal-input"
          size="small"
          type="number"
          allowNegative
          autoFocus
          value={amountStr}
          onChange={handleAmountChange}
          onTypingRejected={() => setShowNumberRequiredMessage(true)}
          placeholder={AMOUNT_INPUT_PLACEHOLDER}
          disabled={submitting}
          aria-label={`Amount for ${habitName}`}
          aria-describedby={inputDescribedBy}
          aria-invalid={showNumberRequiredMessage}
        />
        {showNumberRequiredMessage ? (
          <InfoText
            id="count-control-add-number-error"
            size="small"
            variant="error"
            aria-live="polite"
          >
            {NUMBER_REQUIRED_MESSAGE}
          </InfoText>
        ) : null}
        {newTotal != null ? (
          <p
            id="count-control-add-new-total"
            className="count-control__new-total text-b-m text-light"
          >
            New total: {newTotal}
          </p>
        ) : null}
      </ModalBody>
      <ModalFooter>
        <Button
          type="tertiary"
          size="medium"
          text="Cancel"
          className="mr-2"
          disabled={submitting}
          onClick={closeModal}
        />
        <Button
          type="primary"
          size="medium"
          text={ctaLabel}
          disabled={!canSubmit}
          onClick={() => void handleSubmit()}
        />
      </ModalFooter>
    </>
  );
}
