import type { ConfigHabitDraft } from '~/api.client';
import { ConfigHabitOptionCards } from '../utils/ConfigHabitOptionCards';
import type { SingleSelectOption } from '@habsum/types/common/habit';

function hasYesNoOptions(options: string[]): boolean {
  return options.length === 2 && options.includes('yes') && options.includes('no');
}

type SingleSelectBaseOptionsProps = {
  draft: ConfigHabitDraft;
  habitOptions: string[];
  patch: (partial: Partial<ConfigHabitDraft>) => void;
};

export function SingleSelectBaseOptions({
  draft,
  habitOptions,
  patch,
}: SingleSelectBaseOptionsProps) {
  const showCheckboxThemeToggle = hasYesNoOptions(habitOptions);

  const setHabitOptions = (options: SingleSelectOption[]) => {
    patch({
      options,
      ...(hasYesNoOptions(options.map((option) => option.label)) ? {} : { theme: '' }),
    });
  };

  return (
    <div className="config-habit-modal__field config-habit-modal__field--option-pills">
      <div className="config-habit-modal__label">
        <label className="text-b-m">Values</label>
        <p className="config-habit-modal__field-info text-b-s text-light">
          Values you can select when recording this habit. “Positive” and “Negative” determine
          streak eligibility and how values are colored.
        </p>
      </div>
      <div className="config-habit-modal__control">
        <div className="config-habit-modal__field-control-stack">
          <ConfigHabitOptionCards options={draft.options} onChange={setHabitOptions} />
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
