// exclusive-bem-block: config-yaml-editor
import { useSyncExternalStore } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { autocompletion, type Completion, type CompletionContext } from '@codemirror/autocomplete';
import { yaml } from '@codemirror/lang-yaml';
import { oneDark } from '@codemirror/theme-one-dark';
import { yamlString, type YAMLString } from '@habsum/types/common/misc';

const HABIT_TYPE_COMPLETIONS: Completion[] = [
  {
    label: 'summation',
    type: 'constant',
    detail: 'numeric habit',
    info: 'Tracks a numeric total. Optional summation_options lists quick-add amounts beside the manual entry field.',
  },
  {
    label: 'single_select',
    type: 'constant',
    detail: 'choice habit',
    info: 'Tracks one selected option. Use options to define the allowed choices.',
  },
  {
    label: 'text',
    type: 'constant',
    detail: 'daily text habit',
    info: 'Tracks one plain-text entry per day. The entry is stored in the database, not in YAML.',
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

function subscribeToTheme(onStoreChange: () => void) {
  const observer = new MutationObserver(onStoreChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  });
  return () => observer.disconnect();
}

type ConfigYamlEditorProps = {
  text: YAMLString;
  onChange: (text: YAMLString) => void;
};

export function ConfigYamlEditor({ text, onChange }: ConfigYamlEditorProps) {
  const isDarkTheme = useSyncExternalStore(
    subscribeToTheme,
    () => document.documentElement.dataset.theme === 'dark',
    () => false,
  );

  return (
    <div className="config-yaml-editor">
      <CodeMirror
        value={text}
        onChange={(next) => onChange(yamlString(next))}
        extensions={[yaml(), autocompletion({ override: [habitTypeCompletion] })]}
        height="100%"
        minHeight="min(60vh, 640px)"
        theme={isDarkTheme ? oneDark : 'light'}
        basicSetup={{
          lineNumbers: true,
          foldGutter: true,
          defaultKeymap: true,
        }}
      />
    </div>
  );
}
