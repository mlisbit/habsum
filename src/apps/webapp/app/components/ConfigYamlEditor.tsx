import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { autocompletion, type Completion, type CompletionContext } from '@codemirror/autocomplete';
import { yaml } from '@codemirror/lang-yaml';
import { oneDark } from '@codemirror/theme-one-dark';
import { getUserConfig, putUserConfig } from '~/api.client';
import { Button } from '~/core-components/Button';
import { InfoText } from '~/core-components/InfoText';

const HABIT_TYPE_COMPLETIONS: Completion[] = [
  {
    label: 'summation',
    type: 'constant',
    detail: 'numeric habit',
    info: 'Tracks a numeric total. Optional summation_options can configure fixed subtract/add steps.',
  },
  {
    label: 'single_select',
    type: 'constant',
    detail: 'choice habit',
    info: 'Tracks one selected option. Use options to define the allowed choices.',
  },
];

function habitTypeCompletion(context: CompletionContext) {
  const line = context.state.doc.lineAt(context.pos);
  const cursorInLine = context.pos - line.from;
  const beforeCursor = line.text.slice(0, cursorInLine);
  const match = beforeCursor.match(/^(\s*type:\s*)([\w-]*)$/);

  if (!match) return null;

  return {
    from: line.from + match[1].length,
    options: HABIT_TYPE_COMPLETIONS,
    validFor: /^[\w-]*$/,
  };
}

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
      <p className="text-light text-b-m" aria-busy>
        Loading config…
      </p>
    );
  }

  if (loadError) {
    return <InfoText variant="error">{loadError}</InfoText>;
  }

  return (
    <div className="config-page">
      <div className="config-page__header">
        <h2 className="config-page__title text-h-m">Config</h2>
        <p className="text-light text-b-m config-page__lead">
          Edit the YAML for this user on the server. Save writes the file; invalid YAML is rejected.
        </p>
        {dirty ? <p className="text-light text-b-m config-page__dirty">Unsaved changes</p> : null}
        <Button
          type="primary"
          text={saving ? 'Saving…' : 'Save'}
          disabled={!dirty || saving}
          onClick={onSave}
        />
        {saveError ? (
          <InfoText variant="error" className="config-page__error">
            {saveError}
          </InfoText>
        ) : null}
      </div>
      <div className="config-page__editor">
        <CodeMirror
          value={text}
          onChange={setText}
          extensions={[yaml(), autocompletion({ override: [habitTypeCompletion] })]}
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
