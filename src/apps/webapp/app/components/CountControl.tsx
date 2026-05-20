import { useCallback, useState } from 'react';
import type { AnimationEvent } from 'react';
import type { SummationOptions } from '@habsum/types/common/habit';
import { Button } from '~/core-components/Button';
import { Input } from '~/core-components/Input';
import { ModalBody, useModal } from '~/context/modal';
import {
  defaultManualIncrementPlaceholder,
  formatIncrementLabel,
  hasSummationOptions,
} from '~/utils/summationOptions';
import { useLongPress } from '~/utils/use-long-press';

/** Parses manual adjust field — blank / invalid / zero → null; otherwise truncated integer (+ or −). */
function parseManualAdjustDelta(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === '') return null;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) return null;
  const n = Math.trunc(parsed);
  return n !== 0 ? n : null;
}

/** Parses amount text for free-form mode (blank / invalid → fallback). */
function parseAmountToNumber(raw: string, fallback: number): number {
  const trimmed = raw.trim();
  if (trimmed === '') return fallback;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) return fallback;
  const n = Math.max(0, Math.trunc(parsed));
  return n > 0 ? n : fallback;
}

export type CountControlProps = {
  /** Default step shown after each action and used when the field is blank, invalid, or zero (free-form mode only). */
  interval: number;
  /** Manual entry + quick-add increments from habit config. */
  summationSteps?: SummationOptions;
  /** Current logged total for the day; `null` means no stored row. */
  displayTotal: number | null;
  habitName: string;
  pending: boolean;
  onAddDelta: (delta: number) => Promise<void>;
  /** Clears the stored total for today (`null`), not zero. */
  onClearTotal: () => Promise<void>;
};

type SummationAdjustModalProps = {
  habitName: string;
  pending: boolean;
  closeModal: () => void;
  onClearTotal: () => Promise<void>;
  onManualAdd: (delta: number) => Promise<void>;
  increments?: number[];
};

function SummationAdjustModalContent({
  habitName,
  pending,
  closeModal,
  onClearTotal,
  onManualAdd,
  increments,
}: SummationAdjustModalProps) {
  return (
    <>
      <ModalBody className="count-control__modal">
        <p id="modal-title" className="text-b-m">
          Adjust
        </p>
        {increments != null && increments.length > 0 ? (
          <p className="text-b-s">Quick add: {increments.map(formatIncrementLabel).join(' ')}</p>
        ) : null}

        <Input
          type="number"
          value=""
          placeholder="e.g. 12 or −3"
          disabled={pending}
          submittable
          allowNegative
          aria-label={`Manual change for ${habitName}`}
          applyAriaLabel={`Apply manual change for ${habitName}`}
          onSubmit={(raw) => {
            const delta = parseManualAdjustDelta(raw);
            if (delta == null) return;
            void (async () => {
              try {
                await onManualAdd(delta);
                closeModal();
              } catch {
                /* Parent surfaces error via SummationWidget */
              }
            })();
          }}
          className="count-control__modal-input"
        />
        <Button
          type="secondary"
          size="small"
          text="Reset"
          disabled={pending}
          onClick={() => {
            void (async () => {
              try {
                await onClearTotal();
                closeModal();
              } catch {
                /* Parent surfaces error via SummationWidget */
              }
            })();
          }}
        />
        <Button
          type="secondary"
          size="small"
          text="Cancel"
          onClick={closeModal}
          disabled={pending}
        />
      </ModalBody>
    </>
  );
}

export function CountControl({
  interval,
  summationSteps,
  displayTotal,
  habitName,
  pending,
  onAddDelta,
  onClearTotal,
}: CountControlProps) {
  const manualMode = hasSummationOptions(summationSteps);
  const increments = manualMode ? summationSteps.increments : [];

  const [amountStr, setAmountStr] = useState('');
  const [minusHovered, setMinusHovered] = useState(false);
  const [pulseKind, setPulseKind] = useState<'plus' | 'minus' | null>(null);
  const [amountEditorOpen, setAmountEditorOpen] = useState(false);
  const { present, closeModal } = useModal();

  const openAdjustModal = useCallback(() => {
    present({
      content: (
        <SummationAdjustModalContent
          habitName={habitName}
          pending={pending}
          closeModal={closeModal}
          onClearTotal={onClearTotal}
          onManualAdd={onAddDelta}
          increments={manualMode ? increments : undefined}
        />
      ),
    });
  }, [present, closeModal, onClearTotal, onAddDelta, manualMode, increments, habitName, pending]);

  const inputLongPress = useLongPress(openAdjustModal);
  const minusLongPress = useLongPress(openAdjustModal);

  const applyDelta = async (delta: number, opts?: { pulse?: 'plus' | 'minus' }) => {
    const { pulse } = opts ?? {};
    if (pulse) setPulseKind(pulse);
    await onAddDelta(delta);
    if (manualMode) {
      setAmountStr('');
      setAmountEditorOpen(false);
      return;
    }
    setAmountStr('');
    setAmountEditorOpen(false);
  };

  const closeAmountEditor = () => {
    setAmountStr('');
    setAmountEditorOpen(false);
  };

  const openAmountEditor = () => {
    setAmountStr('');
    setAmountEditorOpen(true);
  };

  const submitCustomAmount = async (raw: string) => {
    const delta = parseManualAdjustDelta(raw);
    if (delta == null) return;
    await applyDelta(delta, { pulse: delta < 0 ? 'minus' : 'plus' });
    closeAmountEditor();
  };

  const effectiveTotal = displayTotal ?? 0;
  const showMinus = !manualMode && effectiveTotal > 0;

  const pulseClasses = [
    pulseKind === 'plus' ? 'count-control__pulse-plus' : '',
    pulseKind === 'minus' ? 'count-control__pulse-minus' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const onPulseEnd = (e: AnimationEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    setPulseKind(null);
  };

  if (manualMode) {
    const placeholder = defaultManualIncrementPlaceholder(summationSteps);
    return (
      <div className="count-control">
        <div
          className={['count-control__manual-row', pulseClasses].filter(Boolean).join(' ')}
          onAnimationEnd={onPulseEnd}
        >
          <div className="count-control__manual-entry">
            {amountEditorOpen ? (
              <Input
                className="count-control__manual-input"
                size="small"
                type="number"
                allowNegative
                submittable
                dismissable
                alwaysDismissable
                value={amountStr}
                onChange={setAmountStr}
                onSubmit={(raw) => void submitCustomAmount(raw)}
                onReject={closeAmountEditor}
                placeholder={placeholder || 'Amount'}
                disabled={pending}
                applyAriaLabel={`Apply amount for ${habitName}`}
                revertAriaLabel={`Discard amount edit for ${habitName}`}
                aria-label={`Amount for ${habitName}`}
              />
            ) : (
              <Button
                type="tertiary"
                size="small"
                text="+"
                disabled={pending}
                className="count-control__amount-trigger text-b-m"
                {...inputLongPress.pointerProps}
                onClick={inputLongPress.wrapOnClick(openAmountEditor)}
                aria-label={`Enter custom amount for ${habitName}`}
              />
            )}
          </div>
          <div className="count-control__increments" role="group" aria-label="Quick add amounts">
            {increments.map((delta, index) => (
              <Button
                key={`${delta}-${index}`}
                type="secondary"
                size="small"
                text={formatIncrementLabel(delta)}
                disabled={pending}
                className={delta < 0 ? 'text-error' : undefined}
                onClick={() => void applyDelta(delta, { pulse: delta < 0 ? 'minus' : 'plus' })}
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

  const readAmountMagnitude = (fallback: number): number =>
    parseAmountToNumber(amountStr, fallback);

  const amountInputClassName = ['text-b-m', minusHovered && showMinus ? 'text-error' : '']
    .filter(Boolean)
    .join(' ');

  return (
    <div className="count-control">
      {showMinus && !amountEditorOpen ? (
        <Button
          type="secondary"
          size="small"
          icon="minus"
          circle
          text=""
          {...minusLongPress.pointerProps}
          onMouseEnter={() => setMinusHovered(true)}
          onMouseLeave={() => setMinusHovered(false)}
          onClick={minusLongPress.wrapOnClick(
            () => void applyDelta(-readAmountMagnitude(interval), { pulse: 'minus' }),
          )}
          disabled={pending}
          aria-label={`Subtract amount from ${habitName}`}
        />
      ) : null}
      <div
        className={['count-control__amount-slot', pulseClasses].filter(Boolean).join(' ')}
        onAnimationEnd={onPulseEnd}
      >
        {amountEditorOpen ? (
          <Input
            className="count-control__manual-input"
            size="small"
            type="number"
            allowNegative
            value={amountStr}
            dismissable
            alwaysDismissable
            submittable
            onChange={setAmountStr}
            onSubmit={(raw) => void submitCustomAmount(raw)}
            onReject={closeAmountEditor}
            disabled={pending}
            placeholder={String(interval)}
            inputClassName={amountInputClassName}
            applyAriaLabel={`Apply amount for ${habitName}`}
            revertAriaLabel={`Discard amount edit for ${habitName}`}
            aria-label={`Amount for ${habitName}`}
          />
        ) : (
          <Button
            type="tertiary"
            size="small"
            text="+"
            disabled={pending}
            className="count-control__amount-trigger text-b-m"
            {...inputLongPress.pointerProps}
            onClick={inputLongPress.wrapOnClick(openAmountEditor)}
            aria-label={`Enter custom amount for ${habitName}`}
          />
        )}
      </div>
    </div>
  );
}
