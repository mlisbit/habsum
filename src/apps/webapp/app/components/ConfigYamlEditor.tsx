import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { yaml } from '@codemirror/lang-yaml';
import { oneDark } from '@codemirror/theme-one-dark';
import { getUserConfig, putUserConfig } from '~/api.client';
import { Button } from '~/components/Button';

function usePrefersDark() {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      mq.addEventListener('change', onChange);
      return () => mq.removeEventListener('change', onChange);
    },
    () => window.matchMedia('(prefers-color-scheme: dark)').matches,
    () => false,
  );
}

type ConfigYamlEditorProps = { user: string };

export function ConfigYamlEditor({ user }: ConfigYamlEditorProps) {
  const [text, setText] = useState('');
  const [initial, setInitial] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const prefersDark = usePrefersDark();
  const dirty = text !== initial;

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    setLoadError(null);
    setSaveError(null);
    getUserConfig(user)
      .then((r) => {
        setText(r.text);
        setInitial(r.text);
      })
      .catch((e) => setLoadError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, [user]);

  const onSave = useCallback(async () => {
    if (!user || !dirty) return;
    setSaving(true);
    setSaveError(null);
    try {
      await putUserConfig(user, text);
      setInitial(text);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }, [user, dirty, text]);

  if (loading) {
    return (
      <p className="muted" aria-busy>
        Loading config…
      </p>
    );
  }

  if (loadError) {
    return <p className="warn">{loadError}</p>;
  }

  return (
    <div className="config-page">
      <div className="config-page__header">
        <h2>Config</h2>
        <p className="muted config-page__lead">
          Edit the YAML for this user on the server. Save writes the file; invalid YAML is rejected.
        </p>
        {dirty ? <p className="muted config-page__dirty">Unsaved changes</p> : null}
        <Button
          type="primary"
          text={saving ? 'Saving…' : 'Save'}
          disabled={!dirty || saving}
          onClick={onSave}
        />
        {saveError ? <p className="warn config-page__error">{saveError}</p> : null}
      </div>
      <div className="config-page__editor">
        <CodeMirror
          value={text}
          onChange={setText}
          extensions={[yaml()]}
          height="100%"
          minHeight="min(60vh, 640px)"
          theme={prefersDark ? oneDark : 'light'}
          basicSetup={{
            lineNumbers: true,
            foldGutter: true,
            defaultKeymap: true,
          }}
        />
      </div>
    </div>
  );
}
