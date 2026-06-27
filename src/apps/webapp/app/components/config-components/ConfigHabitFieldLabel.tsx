// exclusive-bem-block: config-habit-field-label
import { classBuilder } from '~/utils/class-builder';

type ConfigHabitFieldLabelProps = {
  htmlFor?: string;
  label: string;
  info?: string;
  className?: string;
};

export function ConfigHabitFieldLabel({
  htmlFor,
  label,
  info,
  className,
}: ConfigHabitFieldLabelProps) {
  return (
    <div
      className={classBuilder(
        {},
        ['config-habit-field-label', className].filter(Boolean).join(' '),
      )}
    >
      <div className="config-habit-field-label__heading">
        <label htmlFor={htmlFor} className="config-habit-field-label__text text-b-m">
          {label}
        </label>
      </div>
      {info ? <p className="config-habit-field-label__info text-b-s text-light">{info}</p> : null}
    </div>
  );
}
