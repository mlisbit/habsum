import type { ConfigHabitDraft } from '~/api.client';
import { ConfigHabitFieldLabel } from '../../../ConfigHabitFieldLabel';
import { ConfigHabitModalField } from '../utils/ConfigHabitModalField';
import { ConfigHabitOptionsPills } from '../utils/ConfigHabitOptionPills';
import { formatOptionLines } from '~/utils/configHabitDraft';

function hasYesNoOptions(options: string[]): boolean {
  return options.length === 2 && options.includes('yes') && options.includes('no');
}

type SingleSelectBaseOptionsProps = {
  draft: ConfigHabitDraft;
  habitOptions: string[];
  patch: (partial: Partial<ConfigHabitDraft>) => void;
  streakOptions: string[];
};

export function SingleSelectBaseOptions({
  draft,
  habitOptions,
  patch,
  streakOptions,
}: SingleSelectBaseOptionsProps) {
  const showCheckboxThemeToggle = hasYesNoOptions(habitOptions);

  const setHabitOptions = (options: string[]) => {
    const allowed = new Set(options);
    patch({
      optionsText: formatOptionLines(options),
      streakOptionsText: formatOptionLines(streakOptions.filter((opt) => allowed.has(opt))),
      ...(hasYesNoOptions(options) ? {} : { theme: '' }),
    });
  };

  return (
    <ConfigHabitModalField
      label="Values"
      info="Values that can be selected when recording this habit."
      tooltip="The available choices when recording this habit. For example, a mood habit might use values such as “great”, “good”, “okay”, and “bad”."
      className="config-habit-modal__field--option-pills"
    >
      <div className="config-habit-modal__field-control-stack">
        <ConfigHabitOptionsPills options={habitOptions} onChange={setHabitOptions} />
        {showCheckboxThemeToggle ? (
          <div className="config-habit-modal__checkbox-field">
            <input
              id="habit-theme-checkbox"
              className="config-habit-modal__checkbox"
              type="checkbox"
              checked={draft.theme === 'checkbox'}
              onChange={(e) => patch({ theme: e.target.checked ? 'checkbox' : '' })}
            />
            <ConfigHabitFieldLabel
              htmlFor="habit-theme-checkbox"
              label="Show as checkbox"
              tooltip="Render yes, no, and empty values as a tri-state checkbox on the habit page."
            />
          </div>
        ) : null}
      </div>
    </ConfigHabitModalField>
  );
}
