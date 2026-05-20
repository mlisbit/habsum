// exclusive-bem-block: config-page
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from '@remix-run/react';
import { getUserConfig, putUserConfig } from '~/api.client';
import { ConfigGuiEditor } from './ConfigGuiEditor';
import { ConfigYamlEditor } from './ConfigYamlEditor';
import { SettingsHeader } from '~/components/SettingsHeader';
import { Button } from '~/core-components/Button';
import { useToast } from '~/context/toast';
import {
  habitOrderKey,
  parseConfigHabitCards,
  reorderHabitsInConfigYaml,
} from '~/utils/configYaml';

type ConfigSettingsProps = { user: string };

function isYamlView(search: string): boolean {
  return new URLSearchParams(search).has('yaml');
}

export function ConfigSettings({ user }: ConfigSettingsProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const yamlView = isYamlView(location.search);

  const [text, setText] = useState('');
  const [initialText, setInitialText] = useState('');
  const [habitOrder, setHabitOrder] = useState<string[]>([]);
  const [initialHabitOrderKey, setInitialHabitOrderKey] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    setLoadError(null);
    setSaveError(null);
    getUserConfig(user)
      .then((r) => {
        setText(r.text);
        setInitialText(r.text);
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

  const yamlDirty = text !== initialText;
  const orderDirty = habitOrderKey(habitOrder) !== initialHabitOrderKey;
  const dirty = yamlDirty || orderDirty;

  const toggleView = useCallback(() => {
    if (!yamlView && orderDirty) {
      try {
        setText(reorderHabitsInConfigYaml(text, habitOrder));
      } catch (e) {
        setSaveError(e instanceof Error ? e.message : String(e));
        return;
      }
    }

    const qs = new URLSearchParams(location.search);
    if (yamlView) {
      qs.delete('yaml');
    } else {
      qs.set('yaml', '1');
    }
    const search = qs.toString();
    navigate({
      pathname: location.pathname,
      search: search ? `?${search}` : '',
    });
  }, [habitOrder, location.pathname, location.search, navigate, orderDirty, text, yamlView]);

  useEffect(() => {
    if (yamlView || loading) return;
    try {
      const order = parseConfigHabitCards(text).map((h) => h.name);
      setHabitOrder(order);
    } catch {
      // Keep the last known order when yaml is temporarily invalid in the editor.
    }
  }, [loading, text, yamlView]);

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
      const payload = yamlView ? text : reorderHabitsInConfigYaml(text, habitOrder);
      await putUserConfig(user, payload);
      setText(payload);
      setInitialText(payload);
      const order = parseConfigHabitCards(payload).map((h) => h.name);
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
  }, [dirty, habitOrder, showToast, text, user, yamlView]);

  if (loading) {
    return (
      <div className="config-page">
        <SettingsHeader title="Config" />
        <p className="text-light text-b-m card-padding" aria-busy>
          Loading config…
        </p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="config-page">
        <SettingsHeader title="Config" error={loadError} />
      </div>
    );
  }

  return (
    <div className="config-page">
      <SettingsHeader
        title="Config"
        subtitle={
          <button
            type="button"
            className="config-page__view-toggle text-b-s text-link"
            disabled={saving}
            onClick={toggleView}
          >
            {yamlView ? 'Show GUI' : 'View YAML'}
          </button>
        }
        error={saveError}
        actions={
          <>
            <Button
              type="primary"
              text={saving ? 'Saving…' : 'Save'}
              disabled={!dirty || saving}
              onClick={onSave}
            />
            <Button type="secondary" text="Cancel" disabled={!dirty || saving} onClick={onCancel} />
          </>
        }
      />
      {yamlView ? (
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
          order={habitOrder}
          onOrderChange={setHabitOrder}
          onConfigTextChange={(next) => {
            setText(next);
            if (saveError != null) setSaveError(null);
          }}
        />
      )}
    </div>
  );
}
