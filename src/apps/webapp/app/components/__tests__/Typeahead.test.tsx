import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Typeahead, type TypeaheadOption } from '@habsum/ui/components/Typeahead';

const OPTIONS: TypeaheadOption[] = [
  { id: 'us-fl-tampa', name: 'Tampa, FL, USA' },
  { id: 'ca-on-toronto', name: 'Toronto, ON, Canada' },
];

afterEach(cleanup);

describe('Typeahead', () => {
  it('does not request or show results for empty input', async () => {
    const user = userEvent.setup();
    const onInput = vi.fn(async () => OPTIONS);

    render(<Typeahead aria-label="Hometown" onInput={onInput} onSelect={vi.fn()} />);

    const input = screen.getByRole('combobox', { name: 'Hometown' }) as HTMLInputElement;
    await user.click(input);

    expect(onInput).not.toHaveBeenCalled();
    expect(screen.queryByRole('listbox')).toBeNull();

    await user.type(input, 't');
    await screen.findByRole('listbox');
    await user.clear(input);

    expect(screen.queryByRole('listbox')).toBeNull();
    expect(onInput).not.toHaveBeenCalledWith('');
  });

  it('shows an inline error when forced suggestions have no match', async () => {
    const user = userEvent.setup();
    const onValidityChange = vi.fn();

    render(
      <Typeahead
        aria-label="Hometown"
        forcedSuggestion
        forcedSuggestionMessage="Invalid location."
        onInput={async () => []}
        onSelect={vi.fn()}
        onValidityChange={onValidityChange}
      />,
    );

    const input = screen.getByRole('combobox', { name: 'Hometown' }) as HTMLInputElement;
    await user.type(input, 'Unknown city');

    expect(await screen.findByText('Invalid location.')).toBeTruthy();
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(onValidityChange).toHaveBeenLastCalledWith(false);
  });

  it('requires an available suggestion to be selected before the value is valid', async () => {
    const user = userEvent.setup();
    const onValidityChange = vi.fn();

    render(
      <div>
        <Typeahead
          aria-label="Hometown"
          forcedSuggestion
          forcedSuggestionMessage="Invalid location."
          onInput={async () => OPTIONS}
          onSelect={vi.fn()}
          onValidityChange={onValidityChange}
        />
        <button type="button">Outside</button>
      </div>,
    );

    const input = screen.getByRole('combobox', { name: 'Hometown' }) as HTMLInputElement;
    await user.type(input, 't');
    await screen.findByRole('option', { name: 'Tampa, FL, USA' });
    expect(onValidityChange).toHaveBeenLastCalledWith(false);

    await user.click(screen.getByRole('button', { name: 'Outside' }));
    expect(await screen.findByText('Invalid location.')).toBeTruthy();

    await user.click(input);
    const option = await screen.findByRole('option', { name: 'Tampa, FL, USA' });
    await user.click(option);

    expect(screen.queryByText('Invalid location.')).toBeNull();
    expect(onValidityChange).toHaveBeenLastCalledWith(true);
  });

  it('loads options asynchronously and selects one by click', async () => {
    const user = userEvent.setup();
    const onInput = vi.fn(async (query: string) =>
      OPTIONS.filter((option) => option.name.toLowerCase().includes(query.toLowerCase())),
    );
    const onSelect = vi.fn();

    render(<Typeahead id="hometown" aria-label="Hometown" onInput={onInput} onSelect={onSelect} />);

    const input = screen.getByRole('combobox', { name: 'Hometown' }) as HTMLInputElement;
    expect(input.id).toBe('hometown');
    await user.type(input, 'tor');
    const option = await screen.findByRole('option', { name: 'Toronto, ON, Canada' });
    await user.click(option);

    expect(onInput).toHaveBeenLastCalledWith('tor');
    expect(onSelect).toHaveBeenCalledWith(OPTIONS[1]);
    expect(input.value).toBe('Toronto, ON, Canada');
    expect(input.getAttribute('aria-expanded')).toBe('false');
  });

  it('supports arrow-key navigation and Enter selection', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    render(<Typeahead aria-label="Hometown" onInput={async () => OPTIONS} onSelect={onSelect} />);

    const input = screen.getByRole('combobox', { name: 'Hometown' }) as HTMLInputElement;
    await user.click(input);
    await user.type(input, 't');
    await screen.findByRole('option', { name: 'Tampa, FL, USA' });
    await user.keyboard('{ArrowDown}{Enter}');

    expect(onSelect).toHaveBeenCalledWith(OPTIONS[0]);
    expect(input.value).toBe('Tampa, FL, USA');
  });
});
