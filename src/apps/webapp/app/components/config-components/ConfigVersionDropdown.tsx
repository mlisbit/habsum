// exclusive-bem-block: config-version-dropdown
import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { dateFromDayWithTimeUtc } from '@habsum/types/common/day';
import type { UserConfigVersion } from '@habsum/types/common/misc';
import { Dropdown } from '@habsum/ui/components/Dropdown';

type ConfigVersionDropdownProps = {
  versions: UserConfigVersion[];
  version?: string;
  disabled?: boolean;
};

export function ConfigVersionDropdown({
  versions,
  version,
  disabled = false,
}: ConfigVersionDropdownProps) {
  const [open, setOpen] = useState(false);
  const [, setSearchParams] = useSearchParams();
  const selected = versions.find((saved) =>
    version == null ? saved.isCurrent : String(saved.version) === version,
  );

  const selectVersion = (saved: UserConfigVersion) => {
    setOpen(false);
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous);
      if (saved.isCurrent) next.delete('v');
      else next.set('v', String(saved.version));
      return next;
    });
  };

  return (
    <Dropdown open={open} onOpenChange={setOpen}>
      <Dropdown.Trigger aria-label="Config version" disabled={disabled || versions.length === 0}>
        {selected == null
          ? 'Versions'
          : `Version ${selected.version}${selected.isCurrent ? ' (current)' : ''}`}
      </Dropdown.Trigger>
      <Dropdown.Content
        className="config-version-dropdown__menu"
        role="group"
        aria-label="Config versions"
      >
        {versions.map((saved) => (
          <button
            key={saved.version}
            type="button"
            aria-pressed={selected?.version === saved.version}
            className="config-version-dropdown__item text-b-m"
            onClick={() => selectVersion(saved)}
          >
            <span>{`Version ${saved.version}${saved.isCurrent ? ' (current)' : ''}`}</span>{' '}
            <time
              className="config-version-dropdown__date text-b-s text-light"
              dateTime={`${saved.savedAt.replace(' ', 'T')}Z`}
            >
              {new Intl.DateTimeFormat(undefined, {
                dateStyle: 'medium',
                timeStyle: 'short',
              }).format(dateFromDayWithTimeUtc(saved.savedAt))}
            </time>
          </button>
        ))}
      </Dropdown.Content>
    </Dropdown>
  );
}
