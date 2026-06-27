import { useMemo, useState, type ReactNode } from 'react';
import type { ConfigHabitDraft } from '~/api.client';
import { ModalFooter } from '@habsum/ui/contexts/modal';
import { Button } from '@habsum/ui/components/Button';
import { ConfigHabitFieldLabel } from './ConfigHabitFieldLabel';
import { isHabitDraftDirty, parseOptionLines } from '~/utils/configHabitDraft';

type ConfigHabitModalFieldProps = {
  label: string;
  info?: string | null;
  tooltip?: string | null;
  htmlFor?: string;
  className?: string;
  children: ReactNode;
};

export function ConfigHabitModalField({
  label,
  info,
  tooltip,
  htmlFor,
  className,
  children,
}: ConfigHabitModalFieldProps) {
  return (
    <div className={['config-habit-modal__field', className].filter(Boolean).join(' ')}>
      <ConfigHabitFieldLabel
        htmlFor={htmlFor}
        label={label}
        info={info ?? undefined}
        tooltip={tooltip ?? undefined}
        className="config-habit-modal__label"
      />
      <div className="config-habit-modal__control">{children}</div>
    </div>
  );
}

export type ConfigHabitModalProps = {
  habitName: string;
  initialDraft: ConfigHabitDraft;
  isNewHabit?: boolean;
  onDoneClick: (habitName: string, draft: ConfigHabitDraft) => void | Promise<void>;
  onRemoveClick: (habitName: string) => void | Promise<void>;
  onCancel: () => void;
};

export function useConfigHabitModalDraft({
  habitName,
  initialDraft,
  isNewHabit = false,
  onDoneClick,
  onRemoveClick,
}: Omit<ConfigHabitModalProps, 'onCancel'>) {
  const initial = useMemo(() => initialDraft, [initialDraft]);
  const [draft, setDraft] = useState<ConfigHabitDraft>(initial);
  const dirty = useMemo(
    () => isHabitDraftDirty(initial, draft) || isNewHabit,
    [draft, initial, isNewHabit],
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const patch = (partial: Partial<ConfigHabitDraft>) => {
    setDraft((prev) => ({ ...prev, ...partial }));
    setError(null);
  };

  const handleRemoveClick = async () => {
    try {
      setSaving(true);
      setError(null);
      await onRemoveClick(habitName);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const handleDoneClick = async () => {
    try {
      setSaving(true);
      setError(null);
      await onDoneClick(habitName, draft);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const habitOptions = parseOptionLines(draft.optionsText);
  const streakOptions = parseOptionLines(draft.streakOptionsText);
  const editingHabitName = draft.name.trim() || habitName;

  return {
    draft,
    dirty,
    editingHabitName,
    error,
    habitOptions,
    handleDoneClick,
    handleRemoveClick,
    patch,
    saving,
    streakOptions,
  };
}

export function ConfigHabitModalActions({
  dirty,
  saving,
  onCancel,
  onRemoveClick,
  onDoneClick,
}: {
  dirty: boolean;
  saving: boolean;
  onCancel: () => void;
  onRemoveClick: () => void;
  onDoneClick: () => void;
}) {
  return (
    <ModalFooter className="config-habit-modal__actions">
      <Button
        type="secondary"
        color="danger"
        text={saving ? 'Removing…' : 'Remove'}
        onClick={onRemoveClick}
        disabled={saving}
      />
      <div className="config-habit-modal__actions-main">
        <Button type="secondary" text="Cancel" onClick={onCancel} disabled={saving} />
        <Button
          type="primary"
          text={saving ? 'Saving…' : 'Done'}
          onClick={onDoneClick}
          disabled={saving || !dirty}
        />
      </div>
    </ModalFooter>
  );
}
