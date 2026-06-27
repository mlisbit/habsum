import type { ConfigHabitDraft } from '~/api.client';
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
    <div className="config-habit-modal__field config-habit-modal__field--option-pills">
      <div className="config-habit-modal__label">
        <label className="text-b-m">Values</label>
        <p className="config-habit-modal__field-info text-b-s text-light">
          Values that can be selected when recording this habit.
        </p>
      </div>
      <div className="config-habit-modal__control">
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
              <label htmlFor="habit-theme-checkbox" className="text-b-m">
                Show as checkbox
              </label>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
