// exclusive-bem-block: config-habit-modal
import { useMemo, useState, type ReactNode } from 'react';
import { ModalActions, ModalBody, ModalTitle } from '~/context/modal';
import { Button } from '~/core-components/Button';
import { InfoText } from '~/core-components/InfoText';
import { CollapsibleCard } from '~/core-components/CollapsibleCard';
import { Input } from '~/core-components/Input';
import { ConfigHabitFieldLabel } from './ConfigHabitFieldLabel';
import { ConfigHabitOptionsPills, ConfigHabitStreakOptionsPills } from './ConfigHabitOptionPills';
import {
  applyHabitDraftToConfigYaml,
  formatOptionLines,
  parseHabitDraftFromText,
  parseOptionLines,
  type ConfigHabitDraft,
  type SummationStepsMode,
} from '~/utils/configHabitDraft';

const FIELD_HELP = {
  name: 'Display name for this habit in config and the app. Must be unique among habits.',
  type: 'Whether this habit tracks a numeric total (summation) or one choice from a list (single select).',
  goal: 'Optional daily or rolling target for the total. Leave blank if you do not use a goal.',
  summationMode:
    'Optional fixed amounts for the − and + buttons. “Editable middle” lets users type a custom + amount.',
  summationSub: 'How much the − button subtracts from the total each time it is pressed.',
  summationAdd: 'How much the + button adds to the total each time it is pressed.',
  options: 'Allowed choices for this habit. Use + to add each option.',
  streakEnabled: 'Track consecutive days where the selected option is one of the tracking options.',
  streakOptionsInfo: 'Tap options to include them in consecutive-day tracking.',
  historyEnabled: 'Show a history chart for this habit over a configured time window.',
  historyPeriod: 'Length of the history window, e.g. 1w for one week or 4w for four weeks.',
} as const;

type ConfigHabitModalFieldProps = {
  label: string;
  info: string;
  htmlFor?: string;
  className?: string;
  children: ReactNode;
};

function ConfigHabitModalField({
  label,
  info,
  htmlFor,
  className,
  children,
}: ConfigHabitModalFieldProps) {
  return (
    <div className={['config-habit-modal__field', className].filter(Boolean).join(' ')}>
      <div className="config-habit-modal__label">
        <ConfigHabitFieldLabel htmlFor={htmlFor} label={label} info={info} />
      </div>
      <div className="config-habit-modal__control">{children}</div>
    </div>
  );
}

export type ConfigCardModalProps = {
  configText: string;
  habitName: string;
  onDone: (nextConfigText: string) => void;
  onCancel: () => void;
};

export function ConfigCardModal({ configText, habitName, onDone, onCancel }: ConfigCardModalProps) {
  const initial = useMemo(
    () => parseHabitDraftFromText(configText, habitName),
    [configText, habitName],
  );
  const [draft, setDraft] = useState<ConfigHabitDraft>(initial);
  const [streakExpanded, setStreakExpanded] = useState(() => initial.streakEnabled);
  const [historyExpanded, setHistoryExpanded] = useState(() => initial.historyEnabled);
  const [error, setError] = useState<string | null>(null);

  const patch = (partial: Partial<ConfigHabitDraft>) => {
    setDraft((prev) => ({ ...prev, ...partial }));
    setError(null);
  };

  const onTypeChange = (type: ConfigHabitDraft['type']) => {
    setDraft((prev) => ({
      ...prev,
      type,
      ...(type === 'summation'
        ? { optionsText: '', streakEnabled: false, streakOptionsText: '' }
        : { summationMode: 'none' as SummationStepsMode, goal: '' }),
    }));
    setError(null);
  };

  const handleDone = () => {
    try {
      onDone(applyHabitDraftToConfigYaml(configText, draft, habitName));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const habitOptions = parseOptionLines(draft.optionsText);
  const streakOptions = parseOptionLines(draft.streakOptionsText);

  const setHabitOptions = (options: string[]) => {
    const allowed = new Set(options);
    patch({
      optionsText: formatOptionLines(options),
      streakOptionsText: formatOptionLines(streakOptions.filter((opt) => allowed.has(opt))),
    });
  };

  const setStreakOptions = (selected: string[]) => {
    const selectedSet = new Set(selected);
    patch({
      streakOptionsText: formatOptionLines(habitOptions.filter((opt) => selectedSet.has(opt))),
    });
  };

  const editingHabitName = draft.name.trim() || habitName;

  return (
    <>
      <ModalTitle className="config-habit-modal__title">
        Editing habit: {editingHabitName}
      </ModalTitle>
      <ModalBody className="config-habit-modal">
        <ConfigHabitModalField label="Name" info={FIELD_HELP.name} htmlFor="habit-name">
          <Input
            id="habit-name"
            className="config-habit-modal__name"
            value={draft.name}
            size="small"
            onChange={(name) => patch({ name })}
            placeholder="Habit name"
          />
        </ConfigHabitModalField>

        <ConfigHabitModalField label="Type" info={FIELD_HELP.type} htmlFor="habit-type">
          <select
            id="habit-type"
            className="config-habit-modal__select text-b-m"
            value={draft.type}
            onChange={(e) =>
              onTypeChange(e.target.value === 'single_select' ? 'single_select' : 'summation')
            }
          >
            <option value="summation">Summation</option>
            <option value="single_select">Single select</option>
          </select>
        </ConfigHabitModalField>

        {draft.type === 'summation' ? (
          <>
            <ConfigHabitModalField label="Goal" info={FIELD_HELP.goal} htmlFor="habit-goal">
              <Input
                id="habit-goal"
                type="number"
                size="small"
                className="config-habit-modal__input"
                value={draft.goal}
                onChange={(goal) => patch({ goal })}
                placeholder="Optional"
              />
            </ConfigHabitModalField>

            <ConfigHabitModalField
              label="Fixed +/- steps"
              info={FIELD_HELP.summationMode}
              htmlFor="habit-summation-mode"
            >
              <select
                id="habit-summation-mode"
                className="config-habit-modal__select text-b-m"
                value={draft.summationMode}
                onChange={(e) => patch({ summationMode: e.target.value as SummationStepsMode })}
              >
                <option value="none">None</option>
                <option value="fixed">Fixed − / +</option>
                <option value="fixed-input">Fixed − / editable / +</option>
              </select>
            </ConfigHabitModalField>

            {draft.summationMode !== 'none' ? (
              <div className="config-habit-modal__field-row">
                <ConfigHabitModalField
                  label="Subtract step"
                  info={FIELD_HELP.summationSub}
                  htmlFor="habit-summation-sub"
                >
                  <Input
                    id="habit-summation-sub"
                    type="number"
                    size="small"
                    className="config-habit-modal__input"
                    value={draft.summationSub}
                    onChange={(summationSub) => patch({ summationSub })}
                  />
                </ConfigHabitModalField>
                <ConfigHabitModalField
                  label="Add step"
                  info={FIELD_HELP.summationAdd}
                  htmlFor="habit-summation-add"
                >
                  <Input
                    id="habit-summation-add"
                    type="number"
                    size="small"
                    className="config-habit-modal__input"
                    value={draft.summationAdd}
                    onChange={(summationAdd) => patch({ summationAdd })}
                  />
                </ConfigHabitModalField>
              </div>
            ) : null}
          </>
        ) : (
          <>
            <ConfigHabitModalField
              label="Options"
              info={FIELD_HELP.options}
              className="config-habit-modal__field--option-pills"
            >
              <ConfigHabitOptionsPills options={habitOptions} onChange={setHabitOptions} />
            </ConfigHabitModalField>

            <CollapsibleCard
              expanded={streakExpanded}
              collapsible={draft.streakEnabled}
              onExpandedChange={setStreakExpanded}
            >
              <CollapsibleCard.Header>
                <div className="collapsible-card__header-main">
                  <input
                    id="habit-tracking-enabled"
                    className="config-habit-modal__checkbox"
                    type="checkbox"
                    checked={draft.streakEnabled}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => {
                      const streakEnabled = e.target.checked;
                      patch({ streakEnabled });
                      setStreakExpanded(streakEnabled);
                    }}
                  />
                  <div
                    className="config-habit-modal__collapsible-header-label"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ConfigHabitFieldLabel
                      htmlFor="habit-tracking-enabled"
                      label="Streak tracking"
                      info={FIELD_HELP.streakEnabled}
                    />
                  </div>
                </div>
                <CollapsibleCard.Toggle ariaLabel="Toggle tracking options" />
              </CollapsibleCard.Header>
              <CollapsibleCard.Content>
                <ConfigHabitModalField
                  label="Streak options"
                  info={FIELD_HELP.streakOptionsInfo}
                  className="config-habit-modal__field--option-pills"
                >
                  <ConfigHabitStreakOptionsPills
                    options={habitOptions}
                    selected={streakOptions}
                    onChange={setStreakOptions}
                  />
                </ConfigHabitModalField>
              </CollapsibleCard.Content>
            </CollapsibleCard>
          </>
        )}

        <CollapsibleCard
          expanded={historyExpanded}
          collapsible={draft.historyEnabled}
          onExpandedChange={setHistoryExpanded}
        >
          <CollapsibleCard.Header>
            <div className="collapsible-card__header-main">
              <input
                id="habit-history-enabled"
                className="config-habit-modal__checkbox"
                type="checkbox"
                checked={draft.historyEnabled}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => {
                  const historyEnabled = e.target.checked;
                  patch({ historyEnabled });
                  setHistoryExpanded(historyEnabled);
                }}
              />
              <div
                className="config-habit-modal__collapsible-header-label"
                onClick={(e) => e.stopPropagation()}
              >
                <ConfigHabitFieldLabel
                  htmlFor="habit-history-enabled"
                  label="History"
                  info={FIELD_HELP.historyEnabled}
                />
              </div>
            </div>
            <CollapsibleCard.Toggle ariaLabel="Toggle history options" />
          </CollapsibleCard.Header>
          <CollapsibleCard.Content>
            <p className="config-habit-modal__placeholder text-b-m text-light">todo</p>
          </CollapsibleCard.Content>
        </CollapsibleCard>

        {error != null ? (
          <InfoText variant="error" className="config-habit-modal__error">
            {error}
          </InfoText>
        ) : null}
      </ModalBody>
      <ModalActions>
        <Button type="secondary" text="Cancel" onClick={onCancel} />
        <Button type="primary" text="Done" onClick={handleDone} />
      </ModalActions>
    </>
  );
}
