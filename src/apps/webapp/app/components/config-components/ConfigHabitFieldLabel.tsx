// exclusive-bem-block: config-habit-field-label
import { Icon } from '~/core-components/Icon';
import { Hoverable } from '~/core-components/Hoverable';

type ConfigHabitFieldLabelProps = {
  htmlFor?: string;
  label: string;
  info: string;
};

export function ConfigHabitFieldLabel({ htmlFor, label, info }: ConfigHabitFieldLabelProps) {
  return (
    <div className="config-habit-field-label">
      <label htmlFor={htmlFor} className="config-habit-field-label__text text-b-m">
        {label}
      </label>
      <Hoverable.Root>
        <Hoverable.Anchor
          className="config-habit-field-label__info-anchor text-light"
          aria-label={`About ${label}`}
        >
          <Icon name="info" size="small" />
        </Hoverable.Anchor>
        <Hoverable.Content className="config-habit-field-label__info-tip text-b-s" side="top">
          {info}
        </Hoverable.Content>
      </Hoverable.Root>
    </div>
  );
}
