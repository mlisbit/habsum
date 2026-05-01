import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { AnimationEvent, CSSProperties } from 'react';
import type { SummationOptions } from '@habsum/api-types';
import { Button } from '~/core-components/Button';
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

function inputBetweenPlusShowsStepText(sub: number, add: number, plusMagnitude: number): boolean {
  return plusMagnitude === add && sub !== add;
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
  /** Fixed-step habits only — informational */
  tapHint?: { sub: number; add: number };
};

const summationAdjustModalInputStyle: CSSProperties = {
  width: '100%',
  marginTop: '8px',
  boxSizing: 'border-box',
};

/** Long-press: enter a manual delta (+ or −); does not change configured tap steps */
function SummationAdjustModalContent({
  habitName,
  pending,
  closeModal,
  onClearTotal,
  onManualAdd,
  tapHint,
}: SummationAdjustModalProps) {
  const [draft, setDraft] = useState('');
  const manualDelta = parseManualAdjustDelta(draft);
  const canApply = manualDelta != null;

  return (
    <>
      <ModalBody>
        <p id="modal-title" className="text-b-m">
          Adjust
        </p>
        <p className="text-light text-b-m">{habitName}</p>
        {tapHint ? (
          <p className="text-light text-b-s">
            Taps: −{tapHint.sub} / +{tapHint.add}
          </p>
        ) : null}
        <label htmlFor="count-control-manual-add" className="text-b-s">
          Amount (+ / −)
        </label>
        <input
          id="count-control-manual-add"
          type="number"
          step={1}
          className="count-control__amount text-b-m"
          style={summationAdjustModalInputStyle}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          disabled={pending}
          inputMode="numeric"
          placeholder="e.g. 12 or −3"
          aria-label={`Manual change for ${habitName}`}
        />
      </ModalBody>
      <ModalActions>
        <Button
          type="secondary"
          size="small"
          text="Cancel"
          onClick={closeModal}
          disabled={pending}
        />
        <Button
          type="secondary"
          size="small"
          text="Apply"
          disabled={pending || !canApply}
          onClick={() => {
            if (manualDelta == null) return;
            void (async () => {
              try {
                await onManualAdd(manualDelta);
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
      </ModalActions>
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
  const showsAmountField = !simpleStepsMode;

  const [amountStr, setAmountStr] = useState(() =>
    summationSteps?.inputBetween ? String(summationSteps.add) : String(interval),
  );
  const [minusHovered, setMinusHovered] = useState(false);
  const [pulseKind, setPulseKind] = useState<'plus' | 'minus' | null>(null);
  const mirrorRef = useRef<HTMLSpanElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [amountWidthPx, setAmountWidthPx] = useState<number>();
  const { present, closeModal } = useModal();

  useEffect(() => {
    if (simpleStepsMode || inputBetweenStepsMode) return;
    setAmountStr(String(interval));
  }, [interval, simpleStepsMode, inputBetweenStepsMode]);

  useEffect(() => {
    if (!inputBetweenStepsMode || !summationSteps) return;
    setAmountStr(String(summationSteps.add));
  }, [inputBetweenStepsMode, summationSteps?.add]);

  useLayoutEffect(() => {
    if (!showsAmountField) return;
    const m = mirrorRef.current;
    if (!m) return;
    const w = Math.ceil(m.getBoundingClientRect().width);
    setAmountWidthPx(Math.max(w, 1));
  }, [amountStr, showsAmountField]);

  const openAdjustModal = useCallback(() => {
    const tapHint =
      simpleStepsMode && summationSteps
        ? { sub: summationSteps.sub, add: summationSteps.add }
        : undefined;

    present({
      content: (
        <SummationAdjustModalContent
          habitName={habitName}
          pending={pending}
          closeModal={closeModal}
          onClearTotal={onClearTotal}
          onManualAdd={onAddDelta}
          tapHint={tapHint}
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

  const readAmountMagnitude = (fallback: number): number =>
    parseAmountToNumber(inputRef.current?.value ?? amountStr, fallback);

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
  };

  const effectiveTotal = displayTotal ?? 0;
  const showMinus = effectiveTotal > 0;

  useEffect(() => {
    if (!showMinus) setMinusHovered(false);
  }, [showMinus]);

  const amountClass = [
    'count-control__amount',
    'text-b-m',
    minusHovered && showMinus ? 'text-error' : '',
  ]
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
    const plusMag = readAmountMagnitude(addStep);
    const plusUsesDefaultStepLabel = plusMag === addStep;
    const plusShowsStepText = inputBetweenPlusShowsStepText(subStep, addStep, plusMag);

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
          <div className="count-control__amount-slot">
            <span ref={mirrorRef} className="count-control__mirror text-b-m">
              {amountStr === '' ? '\u00a0' : amountStr}
            </span>
            <input
              ref={inputRef}
              type="number"
              min={0}
              step={1}
              className={amountClass}
              style={amountWidthPx != null ? { width: `${amountWidthPx}px` } : undefined}
              value={amountStr}
              onChange={(e) => setAmountStr(e.target.value)}
              disabled={pending}
              inputMode="numeric"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void submitParsedAmount(e.currentTarget.value);
                }
              }}
              aria-label={`Amount to add to ${habitName}`}
            />
          </div>
          {plusShowsStepText ? (
            <Button
              type="secondary"
              size="small"
              text={`+${addStep}`}
              {...plusLongPress.pointerProps}
              onClick={plusLongPress.wrapOnClick(() => void applyDelta(plusMag, { pulse: 'plus' }))}
              disabled={pending}
              aria-label={`Add ${addStep} to ${habitName}`}
            />
          ) : (
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
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="count-control">
      {showMinus ? (
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
        <span ref={mirrorRef} className="count-control__mirror text-b-m">
          {amountStr === '' ? '\u00a0' : amountStr}
        </span>
        <input
          ref={inputRef}
          type="number"
          min={0}
          step={1}
          className={amountClass}
          style={amountWidthPx != null ? { width: `${amountWidthPx}px` } : undefined}
          value={amountStr}
          onChange={(e) => setAmountStr(e.target.value)}
          disabled={pending}
          inputMode="numeric"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              void submitParsedAmount(e.currentTarget.value);
            }
          }}
          aria-label={`Amount to add to ${habitName}`}
        />
      </div>
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
    </div>
  );
}
