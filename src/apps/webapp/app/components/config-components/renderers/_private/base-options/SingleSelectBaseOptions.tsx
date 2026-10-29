import type { ConfigHabitDraft } from '~/api.client';
import { ConfigHabitOptionCards } from '../utils/ConfigHabitOptionCards';
import { isCheckboxThemeCompatible } from '@habsum/types/common/habit';

type SingleSelectBaseOptionsProps = {
  draft: ConfigHabitDraft;
  patch: (partial: Partial<ConfigHabitDraft>) => void;
};

export function SingleSelectBaseOptions({ draft, patch }: SingleSelectBaseOptionsProps) {
  const showCheckboxThemeToggle =
    draft.theme === 'checkbox' || isCheckboxThemeCompatible(draft.options);

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
          <ConfigHabitOptionCards
            options={draft.options}
            onChange={(options) => patch({ options })}
          />
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
