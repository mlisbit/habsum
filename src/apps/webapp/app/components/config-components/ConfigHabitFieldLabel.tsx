// exclusive-bem-block: config-habit-field-label
import { Icon } from '@habsum/ui/components/Icon';
import { Hoverable } from '@habsum/ui/components/Hoverable';
import { classBuilder } from '~/utils/class-builder';

type ConfigHabitFieldLabelProps = {
  htmlFor?: string;
  label: string;
  info?: string;
  tooltip?: string;
  className?: string;
};

export function ConfigHabitFieldLabel({
  htmlFor,
  label,
  info,
  tooltip,
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
        {tooltip ? (
          <Hoverable.Root>
            <Hoverable.Anchor
              className="config-habit-field-label__info-anchor text-light"
              aria-label={`About ${label}`}
            >
              <Icon name="info" size="medium" />
            </Hoverable.Anchor>
            <Hoverable.Content className="config-habit-field-label__info-tip text-b-s" side="top">
              {tooltip}
            </Hoverable.Content>
          </Hoverable.Root>
        ) : null}
      </div>
      {info ? <p className="config-habit-field-label__info text-b-s text-light">{info}</p> : null}
    </div>
  );
}
