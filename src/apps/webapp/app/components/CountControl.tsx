import { useCallback, useEffect, useState } from 'react';
import type { AnimationEvent } from 'react';
import type { SummationOptions } from '@habsum/api-types';
import { Button } from '~/core-components/Button';
import { Input } from '~/core-components/Input';
import { ModalActions, ModalBody, useModal } from '~/context/modal';
import { useLongPress } from '~/utils/use-long-press';

/** Parses amount text the same way + / − taps do (blank / invalid → fallback). */
function parseAmountToNumber(raw: string, fallback: number): number {
  const trimmed = raw.trim();
  if (trimmed === '') return fallback;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) return fallback;
  const n = Math.max(0, Math.trunc(parsed));
  return n > 0 ? n : fallback;
}

/** Parses manual adjust field — blank / invalid / zero → null; otherwise truncated integer (+ or −). */
function parseManualAdjustDelta(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === '') return null;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) return null;
  const n = Math.trunc(parsed);
  return n !== 0 ? n : null;
}

function validSummationPair(s: SummationOptions | undefined): s is SummationOptions {
  return s != null && s.add >= 1 && s.sub >= 1 && Number.isFinite(s.add) && Number.isFinite(s.sub);
}

function getCountControlModes(summationSteps: SummationOptions | undefined): {
  simpleStepsMode: boolean;
  inputBetweenStepsMode: boolean;
} {
  const summationOk = validSummationPair(summationSteps);
  if (!summationOk || summationSteps == null) {
    return { simpleStepsMode: false, inputBetweenStepsMode: false };
  }
  return {
    simpleStepsMode: !summationSteps.inputBetween,
    inputBetweenStepsMode: summationSteps.inputBetween === true,
  };
}

function hideSummationStepLabels(sub: number, add: number): boolean {
  return sub === add;
}

function amountStrDiffersBaseline(amountStr: string, baseline: string): boolean {
  return amountStr.trim() !== baseline.trim();
}

export type CountControlProps = {
  /** Default step shown after each action and used when the field is blank, invalid, or zero (free-form mode only). */
  interval: number;
  /** Fixed +/− steps from habit config; omit for numeric input between +/- . */
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
};

/** Long-press: enter a manual delta (+ or −); does not change configured tap steps */
function SummationAdjustModalContent({
  habitName,
  pending,
  closeModal,
  onClearTotal,
  onManualAdd,
}: SummationAdjustModalProps) {
  return (
    <>
      <ModalBody className="count-control__modal">
        <p id="modal-title" className="text-b-m">
          Adjust
        </p>

        <Input
          type="number"
          value=""
          placeholder="e.g. 12 or −3"
          disabled={pending}
          submittable
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
  const { simpleStepsMode, inputBetweenStepsMode } = getCountControlModes(summationSteps);

  const [amountStr, setAmountStr] = useState(() =>
    summationSteps?.inputBetween ? String(summationSteps.add) : String(interval),
  );
  const [minusHovered, setMinusHovered] = useState(false);
  const [pulseKind, setPulseKind] = useState<'plus' | 'minus' | null>(null);
  const [amountEditorOpen, setAmountEditorOpen] = useState(false);
  const { present, closeModal } = useModal();

  useEffect(() => {
    if (simpleStepsMode || inputBetweenStepsMode) return;
    setAmountStr(String(interval));
    setAmountEditorOpen(false);
  }, [interval, simpleStepsMode, inputBetweenStepsMode]);

  useEffect(() => {
    if (!inputBetweenStepsMode || !summationSteps) return;
    setAmountStr(String(summationSteps.add));
    setAmountEditorOpen(false);
  }, [inputBetweenStepsMode, summationSteps?.add]);

  const openAmountEditor = useCallback(() => {
    setAmountStr('');
    setAmountEditorOpen(true);
  }, []);

  const openAdjustModal = useCallback(() => {
    present({
      content: (
        <SummationAdjustModalContent
          habitName={habitName}
          pending={pending}
          closeModal={closeModal}
          onClearTotal={onClearTotal}
          onManualAdd={onAddDelta}
        />
      ),
    });
  }, [
    present,
    closeModal,
    onClearTotal,
    onAddDelta,
    simpleStepsMode,
    summationSteps,
    habitName,
    pending,
  ]);

  const minusLongPress = useLongPress(openAdjustModal);
  const plusLongPress = useLongPress(openAdjustModal);

  const resetInputToInterval = () => {
    setAmountStr(String(interval));
  };

  const closeAmountEditor = () => {
    if (inputBetweenStepsMode && summationSteps) {
      setAmountStr(String(summationSteps.add));
    } else {
      resetInputToInterval();
    }
    setAmountEditorOpen(false);
  };

  const readAmountMagnitude = (fallback: number): number =>
    parseAmountToNumber(amountStr, fallback);

  const applyDelta = async (delta: number, opts?: { pulse?: 'plus' | 'minus' }) => {
    const { pulse } = opts ?? {};
    if (pulse) setPulseKind(pulse);
    await onAddDelta(delta);
    if (simpleStepsMode) return;
    if (inputBetweenStepsMode && summationSteps) {
      setAmountStr(String(summationSteps.add));
      return;
    }
    resetInputToInterval();
  };

  const submitParsedAmount = async (rawOverride?: string) => {
    if (simpleStepsMode) return;
    const raw = rawOverride ?? amountStr;
    const trimmed = raw.trim();
    if (trimmed === '') return;
    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed)) return;
    const delta = Math.max(0, Math.trunc(parsed));
    await applyDelta(delta);
    setAmountEditorOpen(false);
  };

  const effectiveTotal = displayTotal ?? 0;
  const showMinus = effectiveTotal > 0;

  useEffect(() => {
    if (!showMinus) setMinusHovered(false);
  }, [showMinus]);

  const amountInputClassName = ['text-b-m', minusHovered && showMinus ? 'text-error' : '']
    .filter(Boolean)
    .join(' ');

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

  if (simpleStepsMode && summationSteps) {
    const { add: addStep, sub: subStep } = summationSteps;
    const hideStepNumbers = hideSummationStepLabels(subStep, addStep);
    return (
      <div className="count-control">
        <div
          className={['count-control__steps', pulseClasses].filter(Boolean).join(' ')}
          onAnimationEnd={onPulseEnd}
        >
          {showMinus ? (
            <span className="habit-summation__step-minus-wrap">
              <Button
                type="secondary"
                size="small"
                {...(hideStepNumbers
                  ? { icon: 'minus' as const, circle: true, text: '' }
                  : { text: `−${subStep}` })}
                className={minusHovered && showMinus ? 'text-error' : undefined}
                {...minusLongPress.pointerProps}
                onMouseEnter={() => setMinusHovered(true)}
                onMouseLeave={() => setMinusHovered(false)}
                onClick={minusLongPress.wrapOnClick(
                  () => void applyDelta(-subStep, { pulse: 'minus' }),
                )}
                disabled={pending}
                aria-label={`Subtract ${subStep} from ${habitName}`}
              />
            </span>
          ) : null}
          <Button
            type="secondary"
            size="small"
            {...(hideStepNumbers
              ? { icon: 'plus' as const, circle: true, text: '' }
              : { text: `+${addStep}` })}
            {...plusLongPress.pointerProps}
            onClick={plusLongPress.wrapOnClick(() => void applyDelta(addStep, { pulse: 'plus' }))}
            disabled={pending}
            aria-label={`Add ${addStep} to ${habitName}`}
          />
        </div>
      </div>
    );
  }

  if (inputBetweenStepsMode && summationSteps) {
    const { add: addStep, sub: subStep } = summationSteps;
    const hideStepNumbers = hideSummationStepLabels(subStep, addStep);
    const baselineAmountStr = String(addStep);
    const amountDirty = amountStrDiffersBaseline(amountStr, baselineAmountStr);
    const plusMag = readAmountMagnitude(addStep);
    const plusUsesDefaultStepLabel = plusMag === addStep;

    return (
      <div className="count-control">
        <div
          className={['count-control__steps', pulseClasses].filter(Boolean).join(' ')}
          onAnimationEnd={onPulseEnd}
        >
          {showMinus && !amountEditorOpen && !amountDirty ? (
            <span className="habit-summation__step-minus-wrap">
              <Button
                type="secondary"
                size="small"
                {...(hideStepNumbers
                  ? { icon: 'minus' as const, circle: true, text: '' }
                  : { text: `−${subStep}` })}
                className={minusHovered && showMinus ? 'text-error' : undefined}
                {...minusLongPress.pointerProps}
                onMouseEnter={() => setMinusHovered(true)}
                onMouseLeave={() => setMinusHovered(false)}
                onClick={minusLongPress.wrapOnClick(
                  () => void applyDelta(-subStep, { pulse: 'minus' }),
                )}
                disabled={pending}
                aria-label={`Subtract ${subStep} from ${habitName}`}
              />
            </span>
          ) : null}
          <div className="count-control__amount-slot">
            {amountEditorOpen ? (
              <Input
                type="number"
                value={amountStr}
                dismissable
                alwaysDismissable
                submittable
                onSubmit={(raw) => void submitParsedAmount(raw)}
                onReject={closeAmountEditor}
                disabled={pending}
                inputClassName={amountInputClassName}
                applyAriaLabel={`Apply amount for ${habitName}`}
                revertAriaLabel={`Discard amount edit for ${habitName}`}
              />
            ) : (
              <Button
                type="tertiary"
                size="small"
                text={amountStr}
                disabled={pending}
                className="count-control__amount-trigger text-b-m"
                aria-expanded={false}
                aria-label={`Edit amount to add for ${habitName}`}
                onClick={openAmountEditor}
              />
            )}
          </div>
          {!amountDirty && !amountEditorOpen ? (
            <Button
              type="secondary"
              size="small"
              icon="plus"
              circle
              text=""
              {...plusLongPress.pointerProps}
              onClick={plusLongPress.wrapOnClick(() => void applyDelta(plusMag, { pulse: 'plus' }))}
              disabled={pending}
              aria-label={
                plusUsesDefaultStepLabel
                  ? `Add ${addStep} to ${habitName}`
                  : `Add ${plusMag} to ${habitName}`
              }
            />
          ) : null}
        </div>
      </div>
    );
  }

  const baselineAmountStrFree = String(interval);
  const amountDirtyFree = amountStrDiffersBaseline(amountStr, baselineAmountStrFree);

  return (
    <div className="count-control">
      {showMinus && !amountEditorOpen && !amountDirtyFree ? (
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
            type="number"
            value={amountStr}
            dismissable
            submittable
            onSubmit={(raw) => void submitParsedAmount(raw)}
            onReject={closeAmountEditor}
            disabled={pending}
            inputClassName={amountInputClassName}
            applyAriaLabel={`Apply amount for ${habitName}`}
            revertAriaLabel={`Discard amount edit for ${habitName}`}
          />
        ) : (
          <Button
            type="tertiary"
            size="small"
            text={amountStr}
            disabled={pending}
            className="count-control__amount-trigger text-b-m"
            aria-expanded={false}
            aria-label={`Edit amount to add for ${habitName}`}
            onClick={openAmountEditor}
          />
        )}
      </div>
      {!amountDirtyFree && !amountEditorOpen ? (
        <Button
          type="secondary"
          size="small"
          icon="plus"
          circle
          text=""
          {...plusLongPress.pointerProps}
          onClick={plusLongPress.wrapOnClick(
            () => void applyDelta(readAmountMagnitude(interval), { pulse: 'plus' }),
          )}
          disabled={pending}
          aria-label={`Add amount to ${habitName}`}
        />
      ) : null}
    </div>
  );
}
