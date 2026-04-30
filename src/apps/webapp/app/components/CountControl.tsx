import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Button } from '~/core-components/Button';
import { ModalActions, ModalBody, useModal } from '~/context/modal';
import { useLongPress } from '~/utils/use-long-press';

export type CountControlProps = {
  /** Default step shown after each action and used when the field is blank, invalid, or zero. */
  interval: number;
  /** Current logged total for the day; `null` means no stored row. */
  displayTotal: number | null;
  habitName: string;
  pending: boolean;
  onAddDelta: (delta: number) => Promise<void>;
  /** Clears the stored total for today (`null`), not zero. */
  onClearTotal: () => Promise<void>;
};

export function CountControl({
  interval,
  displayTotal,
  habitName,
  pending,
  onAddDelta,
  onClearTotal,
}: CountControlProps) {
  const [amountStr, setAmountStr] = useState(() => String(interval));
  const [minusHovered, setMinusHovered] = useState(false);
  const [pulseKind, setPulseKind] = useState<'plus' | 'minus' | null>(null);
  const mirrorRef = useRef<HTMLSpanElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [amountWidthPx, setAmountWidthPx] = useState<number>();
  const { present, closeModal } = useModal();

  useEffect(() => {
    setAmountStr(String(interval));
  }, [interval]);

  useLayoutEffect(() => {
    const m = mirrorRef.current;
    if (!m) return;
    const w = Math.ceil(m.getBoundingClientRect().width);
    setAmountWidthPx(Math.max(w, 1));
  }, [amountStr]);

  const openResetModal = useCallback(() => {
    present({
      content: (
        <>
          <ModalBody>
            <p id="modal-title" className="text-b-m">
              Reset?
            </p>
          </ModalBody>
          <ModalActions>
            <Button type="secondary" size="small" text="Cancel" onClick={closeModal} />
            <Button
              type="secondary"
              size="small"
              text="Reset"
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
      ),
    });
  }, [present, closeModal, onClearTotal]);

  const minusLongPress = useLongPress(openResetModal);
  const plusLongPress = useLongPress(openResetModal);

  const resetInputToInterval = () => {
    setAmountStr(String(interval));
  };

  /** Non‑negative amount from the field for +/- taps; blank or invalid falls back to `interval`. */
  const readMagnitudeFromInput = (): number => {
    const raw = inputRef.current?.value ?? amountStr;
    const trimmed = raw.trim();
    if (trimmed === '') return interval;
    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed)) return interval;
    const n = Math.max(0, Math.trunc(parsed));
    return n > 0 ? n : interval;
  };

  const applyDelta = async (delta: number, opts?: { pulse?: 'plus' | 'minus' }) => {
    const { pulse } = opts ?? {};
    if (pulse) setPulseKind(pulse);
    await onAddDelta(delta);
    resetInputToInterval();
  };

  const submitParsedAmount = async (rawOverride?: string) => {
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
            () => void applyDelta(-readMagnitudeFromInput(), { pulse: 'minus' }),
          )}
          disabled={pending}
          aria-label={`Subtract amount from ${habitName}`}
        />
      ) : null}
      <div
        className={[
          'count-control__amount-slot',
          pulseKind === 'plus' ? 'count-control__amount-slot--pulse-plus' : '',
          pulseKind === 'minus' ? 'count-control__amount-slot--pulse-minus' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        onAnimationEnd={(e) => {
          if (e.target !== e.currentTarget) return;
          setPulseKind(null);
        }}
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
          () => void applyDelta(readMagnitudeFromInput(), { pulse: 'plus' }),
        )}
        disabled={pending}
        aria-label={`Add amount to ${habitName}`}
      />
    </div>
  );
}
