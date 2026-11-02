// exclusive-bem-block: config-page
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useBlocker } from 'react-router';
import {
  yamlString,
  type UserConfigJson,
  type UserConfigVersion,
  type YAMLString,
} from '@habsum/types/common/misc';
import { getUserConfig, putUserConfig } from '~/api.client';
import { ConfigGuiEditor } from './ConfigGuiEditor';
import { ConfigYamlEditor } from './ConfigYamlEditor';
import { ConfigVersionDropdown } from './ConfigVersionDropdown';
import { UnsavedChangesModal } from '~/components/UnsavedChangesModal';
import { Button } from '@habsum/ui/components/Button';
import { InfoText } from '@habsum/ui/components/InfoText';
import { Loader } from '@habsum/ui/components/Loader';
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
};

type ConfigSettingsProps = {
  user: string;
  mode: 'habits' | 'yaml';
  version?: string;
  renderCard: (props: ConfigSettingsCardProps) => ReactNode;
};

export function ConfigSettings({ user, mode, version, renderCard }: ConfigSettingsProps) {
  const [text, setText] = useState<YAMLString>(() => yamlString(''));
  const [initialText, setInitialText] = useState<YAMLString>(() => yamlString(''));
  const [config, setConfig] = useState<UserConfigJson | null>(null);
  const [initialConfig, setInitialConfig] = useState<UserConfigJson | null>(null);
  const [versions, setVersions] = useState<UserConfigVersion[]>([]);
  const [habitOrder, setHabitOrder] = useState<string[]>([]);
  const [initialHabitOrderKey, setInitialHabitOrderKey] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const addHabitRef = useRef<(() => void) | null>(null);
  const { showToast } = useToast();
  const { present, closeModal } = useModal();
  const configCardHeader = mode === 'habits' ? 'Habits' : 'Config';
  const readOnly = mode === 'yaml' && version != null;
  const configCardSubtitle = readOnly ? `Version ${version} (read only)` : undefined;

  useEffect(() => {
    if (!user) return;
    let active = true;
    setLoading(true);
    setLoadFailed(false);
    getUserConfig(user, version)
      .then((r) => {
        if (!active) return;
        setText(r.text);
        setInitialText(r.text);
        setConfig(r.config);
        setInitialConfig(r.config);
        setVersions(r.versions);
        const order = r.config.habits.map((h) => h.name);
        setHabitOrder(order);
        setInitialHabitOrderKey(habitOrderKey(order));
      })
      .catch((e) => {
        if (!active) return;
        setLoadFailed(true);
        showToast({ type: 'error', message: e instanceof Error ? e.message : String(e) });
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [showToast, user, version]);

  const yamlDirty = text !== initialText;
  const orderDirty = habitOrderKey(habitOrder) !== initialHabitOrderKey;
  const configDirty = configKey(config) !== configKey(initialConfig);
  const dirty = !readOnly && (mode === 'yaml' ? yamlDirty : configDirty || orderDirty);
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      dirty &&
      (currentLocation.pathname !== nextLocation.pathname ||
        new URLSearchParams(currentLocation.search).get('v') !==
          new URLSearchParams(nextLocation.search).get('v')),
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
    const order = initialConfig?.habits.map((h) => h.name) ?? [];
    setHabitOrder(order);
    setInitialHabitOrderKey(habitOrderKey(order));
  }, [initialConfig, initialText]);

  const onSave = useCallback(async () => {
    if (!user || !dirty) return;
    setSaving(true);
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
      setVersions(refreshed.versions);
      const order = refreshed.config.habits.map((h) => h.name);
      setHabitOrder(order);
      setInitialHabitOrderKey(habitOrderKey(order));
      showToast({ type: 'success', message: 'Saved.' });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      showToast({ type: 'error', message: msg });
    } finally {
      setSaving(false);
    }
  }, [config, dirty, habitOrder, mode, showToast, text, user]);

  const versionDropdown =
    mode === 'yaml' ? (
      <ConfigVersionDropdown versions={versions} version={version} disabled={loading || saving} />
    ) : null;

  if (loading) {
    return (
      <div className="config-page">
        {renderCard({
          headerText: configCardHeader,
          subtitle: configCardSubtitle,
          actions: versionDropdown,
          children: <Loader className="config-page__loader" label="Loading config" size="medium" />,
        })}
      </div>
    );
  }

  if (loadFailed) {
    return (
      <div className="config-page">
        {renderCard({
          headerText: configCardHeader,
          subtitle: configCardSubtitle,
          actions: versionDropdown,
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
        subtitle: configCardSubtitle,
        actions:
          mode === 'habits' ? (
            <Button
              type="primary"
              icon="plus"
              text="Add"
              disabled={saving}
              onClick={() => addHabitRef.current?.()}
            />
          ) : (
            versionDropdown
          ),
        children:
          mode === 'yaml' ? (
            <ConfigYamlEditor text={text} onChange={setText} readOnly={readOnly} />
          ) : (
            <ConfigGuiEditor
              config={config}
              habits={config?.habits ?? []}
              order={habitOrder}
              onOrderChange={setHabitOrder}
              onConfigChange={(nextConfig) => {
                setConfig(nextConfig);
                setHabitOrder(nextConfig.habits.map((h) => h.name));
              }}
              registerAddHabit={(fn) => {
                addHabitRef.current = fn;
              }}
            />
          ),
      })}

      {mode === 'habits'
        ? renderCard({
            headerText: 'YAML config',
            subtitle: 'View and edit the raw YAML file associated with this user.',
            actions: (
              <Link
                to={`/users/${encodeURIComponent(user)}/settings/habits/config`}
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
