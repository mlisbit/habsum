import { useCallback, useState } from 'react';
import type { AnimationEvent } from 'react';
import type { SummationOptions } from '@habsum/types/common/habit';
import { Button } from '@habsum/ui/components/Button';
import { Input } from '@habsum/ui/components/Input';
import { classBuilder } from '~/utils/class-builder';
import {
  defaultManualIncrementPlaceholder,
  formatIncrementLabel,
  hasSummationOptions,
} from '~/utils/summationOptions';

/** Parses manual adjust field — blank / invalid → null; otherwise truncated integer (+ or −; 0 is valid). */
function parseManualAdjustDelta(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === '') return null;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) return null;
  return Math.trunc(parsed);
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
};

export function CountControl({
  interval,
  summationSteps,
  displayTotal,
  habitName,
  pending,
  onAddDelta,
}: CountControlProps) {
  const manualMode = hasSummationOptions(summationSteps);
  const increments = manualMode ? summationSteps.increments : [];

  const [amountStr, setAmountStr] = useState('');
  const [minusHovered, setMinusHovered] = useState(false);
  const [pulseKind, setPulseKind] = useState<'plus' | 'minus' | null>(null);
  const [amountEditorOpen, setAmountEditorOpen] = useState(false);

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
    await applyDelta(delta);
    closeAmountEditor();
  };

  const effectiveTotal = displayTotal ?? 0;
  const showMinus = !manualMode && effectiveTotal > 0;

  const onPulseEnd = (e: AnimationEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    setPulseKind(null);
  };

  if (manualMode) {
    const placeholder = defaultManualIncrementPlaceholder(summationSteps);
    return (
      <div className="count-control">
        <div
          className={['count-control__manual-row'].filter(Boolean).join(' ')}
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
                size="medium"
                text="+"
                disabled={pending}
                className="count-control__amount-trigger text-b-m"
                onClick={openAmountEditor}
                aria-label={`Enter custom amount for ${habitName}`}
              />
            )}
          </div>
          <div className="count-control__increments" role="group" aria-label="Quick add amounts">
            {increments.map((delta, index) => (
              <Button
                key={`${delta}-${index}`}
                type="secondary"
                size="medium"
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

  const amountInputClassName = classBuilder(
    { 'text-error': minusHovered && showMinus },
    'text-b-m',
  );

  return (
    <div className="count-control">
      {showMinus && !amountEditorOpen ? (
        <Button
          type="secondary"
          size="medium"
          icon="minus"
          circle
          text=""
          onMouseEnter={() => setMinusHovered(true)}
          onMouseLeave={() => setMinusHovered(false)}
          onClick={() => void applyDelta(-readAmountMagnitude(interval), { pulse: 'minus' })}
          disabled={pending}
          aria-label={`Subtract amount from ${habitName}`}
        />
      ) : null}
      <div
        className={['count-control__amount-slot'].filter(Boolean).join(' ')}
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
            size="medium"
            text="+"
            disabled={pending}
            className="count-control__amount-trigger text-b-m"
            onClick={openAmountEditor}
            aria-label={`Enter custom amount for ${habitName}`}
          />
        )}
      </div>
    </div>
  );
}
