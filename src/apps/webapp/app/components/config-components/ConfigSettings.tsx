// exclusive-bem-block: config-page
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useBlocker } from 'react-router';
import { yamlString, type UserConfigJson, type YAMLString } from '@habsum/types/common/misc';
import { getUserConfig, putUserConfig } from '~/api.client';
import { ConfigGuiEditor } from './ConfigGuiEditor';
import { ConfigYamlEditor } from './ConfigYamlEditor';
import { UnsavedChangesModal } from '~/components/UnsavedChangesModal';
import { Button } from '@habsum/ui/components/Button';
import { InfoText } from '@habsum/ui/components/InfoText';
import { useModal } from '@habsum/ui/contexts/modal';
import { useToast } from '@habsum/ui/contexts/toast';
import { reorderConfigHabits } from '~/utils/configHabitDraft';

function habitOrderKey(names: string[]): string {
  return names.join('\0');
}

function configKey(config: UserConfigJson | null): string {
  return config == null ? '' : JSON.stringify(config);
}

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
  const [text, setText] = useState<YAMLString>(() => yamlString(''));
  const [initialText, setInitialText] = useState<YAMLString>(() => yamlString(''));
  const [config, setConfig] = useState<UserConfigJson | null>(null);
  const [initialConfig, setInitialConfig] = useState<UserConfigJson | null>(null);
  const [habitOrder, setHabitOrder] = useState<string[]>([]);
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
        setConfig(r.config);
        setInitialConfig(r.config);
        const order = r.config.habits.map((h) => h.name);
        setHabitOrder(order);
        setInitialHabitOrderKey(habitOrderKey(order));
      })
      .catch((e) => setLoadError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, [user]);

  const includeAbsentDaysInAverage = config?.includeAbsentDaysInAverage ?? false;

  const yamlDirty = text !== initialText;
  const orderDirty = habitOrderKey(habitOrder) !== initialHabitOrderKey;
  const configDirty = configKey(config) !== configKey(initialConfig);
  const dirty = mode === 'yaml' ? yamlDirty : configDirty || orderDirty;
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

  const onCancel = useCallback(() => {
    setText(initialText);
    setConfig(initialConfig);
    setSaveError(null);
    const order = initialConfig?.habits.map((h) => h.name) ?? [];
    setHabitOrder(order);
    setInitialHabitOrderKey(habitOrderKey(order));
  }, [initialConfig, initialText]);

  const onSave = useCallback(async () => {
    if (!user || !dirty) return;
    setSaving(true);
    setSaveError(null);
    try {
      if (mode === 'habits') {
        if (config == null) throw new Error('config is not loaded');
        await putUserConfig(user, { config: reorderConfigHabits(config, habitOrder) });
      } else {
        await putUserConfig(user, { text });
      }
      const refreshed = await getUserConfig(user);
      setText(refreshed.text);
      setInitialText(refreshed.text);
      setConfig(refreshed.config);
      setInitialConfig(refreshed.config);
      const order = refreshed.config.habits.map((h) => h.name);
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
  }, [config, dirty, habitOrder, mode, showToast, text, user]);

  const onIncludeAbsentDaysInAverageChange = useCallback(
    (value: boolean) => {
      try {
        const nextConfig = config == null ? null : { ...config, includeAbsentDaysInAverage: value };
        setConfig(nextConfig);
        if (saveError != null) setSaveError(null);
      } catch (e) {
        setSaveError(e instanceof Error ? e.message : String(e));
      }
    },
    [config, saveError],
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
              config={config}
              habits={config?.habits ?? []}
              order={habitOrder}
              onOrderChange={setHabitOrder}
              onConfigChange={(nextConfig) => {
                setConfig(nextConfig);
                setHabitOrder(nextConfig.habits.map((h) => h.name));
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
