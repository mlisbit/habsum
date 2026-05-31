import { useMemo, useState, type ReactNode } from 'react';
import type { UserConfigHabitInsight } from '~/api.client';
import { ModalActions } from '~/context/modal';
import { Button } from '~/core-components/Button';
import { ConfigHabitFieldLabel } from './ConfigHabitFieldLabel';
import {
  applyHabitDraftToConfigYaml,
  isHabitDraftDirty,
  parseHabitDraftFromText,
  parseOptionLines,
  type ConfigHabitDraft,
} from '~/utils/configHabitDraft';

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
  configText: string;
  habitName: string;
  insight: UserConfigHabitInsight;
  isNewHabit?: boolean;
  onDoneClick: (nextConfigText: string, appliedHabitName: string) => void | Promise<void>;
  onRemoveClick: (habitName: string) => void | Promise<void>;
  onCancel: () => void;
};

export function useConfigHabitModalDraft({
  configText,
  habitName,
  isNewHabit = false,
  onDoneClick,
  onRemoveClick,
}: Omit<ConfigHabitModalProps, 'onCancel'>) {
  const initial = useMemo(
    () => parseHabitDraftFromText(configText, habitName),
    [configText, habitName],
  );
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
      const appliedHabitName = draft.name.trim() || habitName;
      const next = applyHabitDraftToConfigYaml(configText, draft, habitName);
      setSaving(true);
      setError(null);
      await onDoneClick(next, appliedHabitName);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const habitOptions = parseOptionLines(draft.optionsText);
  const initialHabitOptions = parseOptionLines(initial.optionsText);
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
    initialHabitOptions,
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
    <ModalActions>
      <div className="config-habit-modal__actions">
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
      </div>
    </ModalActions>
  );
}
