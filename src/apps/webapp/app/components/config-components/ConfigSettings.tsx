// exclusive-bem-block: config-page
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useBlocker } from '@remix-run/react';
import { getUserConfig, putUserConfig, type UserConfigInsights } from '~/api.client';
import { ConfigGuiEditor } from './ConfigGuiEditor';
import { ConfigYamlEditor } from './ConfigYamlEditor';
import { UnsavedChangesModal } from '~/components/UnsavedChangesModal';
import { Button } from '@habsum/ui/components/Button';
import { InfoText } from '@habsum/ui/components/InfoText';
import { useModal } from '@habsum/ui/contexts/modal';
import { useToast } from '@habsum/ui/contexts/toast';
import {
  buildConfigDeletions,
  buildConfigMigrations,
  habitOrderKey,
  parseConfigHabitCards,
  readIncludeAbsentDaysInAverage,
  reorderHabitsInConfigYaml,
  setIncludeAbsentDaysInAverage,
} from '~/utils/configYaml';

type ConfigSettingsCardProps = {
  headerText: string;
  children?: ReactNode;
  actions?: ReactNode;
  subtitle?: ReactNode;
  error?: string | null;
};

type ConfigSettingsProps = {
  user: string;
  mode: 'habits' | 'yaml';
  renderCard: (props: ConfigSettingsCardProps) => ReactNode;
};

export function ConfigSettings({ user, mode, renderCard }: ConfigSettingsProps) {
  const [text, setText] = useState('');
  const [initialText, setInitialText] = useState('');
  const [habitOrder, setHabitOrder] = useState<string[]>([]);
  const [insights, setInsights] = useState<UserConfigInsights>({});
  const [initialHabitOrderKey, setInitialHabitOrderKey] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const addHabitRef = useRef<(() => void) | null>(null);
  const { showToast } = useToast();
  const { present, closeModal } = useModal();
  const configCardHeader = mode === 'habits' ? 'Habits' : 'Config';

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    setLoadError(null);
    setSaveError(null);
    getUserConfig(user)
      .then((r) => {
        setText(r.text);
        setInitialText(r.text);
        setInsights(r.insights);
        try {
          const cards = parseConfigHabitCards(r.text);
          const order = cards.map((h) => h.name);
          setHabitOrder(order);
          setInitialHabitOrderKey(habitOrderKey(order));
        } catch (e) {
          setHabitOrder([]);
          setInitialHabitOrderKey('');
          setLoadError(e instanceof Error ? e.message : String(e));
        }
      })
      .catch((e) => setLoadError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, [user]);

  const habitCards = useMemo(() => {
    try {
      return parseConfigHabitCards(text);
    } catch {
      return [];
    }
  }, [text]);
  const includeAbsentDaysInAverage = useMemo(() => {
    try {
      return readIncludeAbsentDaysInAverage(text);
    } catch {
      return false;
    }
  }, [text]);

  const yamlDirty = text !== initialText;
  const orderDirty = habitOrderKey(habitOrder) !== initialHabitOrderKey;
  const dirty = yamlDirty || (mode === 'habits' && orderDirty);
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      dirty && currentLocation.pathname !== nextLocation.pathname,
  );
  const blockerRef = useRef(blocker);
  blockerRef.current = blocker;
  const presentRef = useRef(present);
  presentRef.current = present;
  const closeModalRef = useRef(closeModal);
  closeModalRef.current = closeModal;

  useEffect(() => {
    if (blocker.state !== 'blocked') return;
    const dismiss = presentRef.current({
      onRequestClose: () => {
        const b = blockerRef.current;
        if (b.state === 'blocked') b.reset();
      },
      content: (
        <UnsavedChangesModal
          onKeepEditing={() => closeModalRef.current()}
          onDiscardChanges={() => {
            dismiss();
            const b = blockerRef.current;
            if (b.state === 'blocked') b.proceed();
          }}
        />
      ),
    });
    return dismiss;
  }, [blocker.state]);

  useEffect(() => {
    if (mode !== 'habits' || loading) return;
    try {
      const order = parseConfigHabitCards(text).map((h) => h.name);
      setHabitOrder(order);
    } catch {
      // Keep the last known order when yaml is temporarily invalid in the editor.
    }
  }, [loading, mode, text]);

  const onCancel = useCallback(() => {
    setText(initialText);
    setSaveError(null);
    try {
      const order = parseConfigHabitCards(initialText).map((h) => h.name);
      setHabitOrder(order);
    } catch {
      setHabitOrder([]);
    }
  }, [initialText]);

  const onSave = useCallback(async () => {
    if (!user || !dirty) return;
    setSaving(true);
    setSaveError(null);
    try {
      const payload = mode === 'yaml' ? text : reorderHabitsInConfigYaml(text, habitOrder);
      const migrations = buildConfigMigrations(initialText, payload);
      const deletions = buildConfigDeletions(initialText, payload);
      await putUserConfig(user, payload, migrations, deletions);
      setText(payload);
      setInitialText(payload);
      const cards = parseConfigHabitCards(payload);
      setInsights((prev) =>
        Object.fromEntries(
          cards.map((habit) => [
            habit.name,
            prev[habit.name] ?? (habit.type === 'single_select' ? { optionsWithData: [] } : {}),
          ]),
        ),
      );
      const order = cards.map((h) => h.name);
      setHabitOrder(order);
      setInitialHabitOrderKey(habitOrderKey(order));
      showToast({ type: 'success', message: 'Saved.' });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setSaveError(msg);
      showToast({ type: 'error', message: msg });
    } finally {
      setSaving(false);
    }
  }, [dirty, habitOrder, initialText, mode, showToast, text, user]);

  const onIncludeAbsentDaysInAverageChange = useCallback(
    (next: boolean) => {
      try {
        setText(setIncludeAbsentDaysInAverage(text, next));
        if (saveError != null) setSaveError(null);
      } catch (e) {
        setSaveError(e instanceof Error ? e.message : String(e));
      }
    },
    [saveError, text],
  );

  if (loading) {
    return (
      <div className="config-page">
        {renderCard({
          headerText: configCardHeader,
          children: (
            <p className="text-light text-b-m card-padding" aria-busy>
              Loading config…
            </p>
          ),
        })}
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="config-page">
        {renderCard({
          headerText: configCardHeader,
          error: loadError,
        })}
      </div>
    );
  }

  return (
    <div className="config-page">
      {dirty ? (
        <div className="flex justify-space-between">
          <InfoText size="medium" variant="warning" className="config-page__info">
            You have unsaved changes.
          </InfoText>
          <div className="config-page__actions">
            <Button type="tertiary" text="Cancel" disabled={saving} onClick={onCancel} />
            <Button
              type="primary"
              text={saving ? 'Saving…' : 'Save'}
              disabled={saving}
              onClick={onSave}
            />
          </div>
        </div>
      ) : null}

      {renderCard({
        headerText: configCardHeader,
        error: saveError,
        actions:
          mode === 'habits' ? (
            <Button
              type="secondary"
              icon="plus"
              text="Add"
              disabled={saving}
              onClick={() => addHabitRef.current?.()}
            />
          ) : null,
        children:
          mode === 'yaml' ? (
            <ConfigYamlEditor
              text={text}
              onChange={(next) => {
                setText(next);
                if (saveError != null) setSaveError(null);
              }}
            />
          ) : (
            <ConfigGuiEditor
              configText={text}
              habits={habitCards}
              insights={insights}
              order={habitOrder}
              onOrderChange={setHabitOrder}
              onConfigTextChange={(next) => {
                setText(next);
                if (saveError != null) setSaveError(null);
              }}
              registerAddHabit={(fn) => {
                addHabitRef.current = fn;
              }}
            />
          ),
      })}

      {mode === 'habits'
        ? renderCard({
            headerText: 'Statistics',
            children: (
              <div className="card-padding config-page__statistics">
                <div className="config-page__statistics-row">
                  <label
                    htmlFor="config-include-absent-days-average"
                    className="config-page__statistics-label text-b-m"
                  >
                    Missing days in averages
                  </label>
                  <select
                    id="config-include-absent-days-average"
                    className="config-page__statistics-select text-b-m"
                    value={includeAbsentDaysInAverage ? 'include' : 'ignore'}
                    onChange={(e) =>
                      onIncludeAbsentDaysInAverageChange(e.target.value === 'include')
                    }
                  >
                    <option value="ignore">Ignore missing days</option>
                    <option value="include">Include missing days</option>
                  </select>
                </div>
                <p className="config-page__statistics-copy text-light text-b-m">
                  Controls how averages are calculated when a habit has no entry for a day.
                </p>
              </div>
            ),
          })
        : null}

      {mode === 'habits'
        ? renderCard({
            headerText: 'YAML config',
            subtitle: 'View and edit the raw YAML file associated with this user.',
            actions: (
              <Link
                to={`/users/${encodeURIComponent(user)}/settings/config`}
                className="button button--secondary button--medium"
              >
                View YAML
              </Link>
            ),
          })
        : null}
    </div>
  );
}
