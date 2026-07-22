// exclusive-bem-block: typeahead
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { Input, type InputProps } from './Input';
import { InfoText } from './InfoText';

export type TypeaheadOption = {
  name: string;
  id: string;
};

export type TypeaheadProps = Omit<
  InputProps,
  'type' | 'value' | 'onChange' | 'onInput' | 'onSelect' | 'onSubmit' | 'submittable' | 'role'
> & {
  /** Current input text. When omitted, the typeahead manages its own value. */
  value?: string;
  defaultValue?: string;
  /** Called whenever the visible input text changes. */
  onChange?: (value: string) => void;
  /** Async option provider called for non-empty input as the user types or refocuses the field. */
  onInput: (value: string) => Promise<TypeaheadOption[]>;
  /** Called when an option is chosen by click, Enter, or keyboard navigation. */
  onSelect: (option: TypeaheadOption) => void;
  /** Optional custom option renderer; selection behavior remains owned by Typeahead. */
  renderOption?: (option: TypeaheadOption, active: boolean) => ReactNode;
  loadingMessage?: ReactNode;
  emptyMessage?: ReactNode;
  /** Require non-empty values to come from an option selected in the dropdown. */
  forcedSuggestion?: boolean;
  forcedSuggestionMessage?: ReactNode;
  /** Reports whether the current value satisfies `forcedSuggestion`. */
  onValidityChange?: (valid: boolean) => void;
  containerClassName?: string;
};

export function Typeahead({
  value,
  defaultValue = '',
  onChange,
  onInput,
  onSelect,
  renderOption,
  loadingMessage = 'Loading…',
  emptyMessage = 'No matches found.',
  forcedSuggestion = false,
  forcedSuggestionMessage = 'Invalid selection.',
  onValidityChange,
  containerClassName,
  className,
  disabled = false,
  onFocus,
  onBlur,
  onKeyDown,
  'aria-describedby': ariaDescribedBy,
  'aria-invalid': ariaInvalid,
  ...inputProps
}: TypeaheadProps) {
  const initialQuery = value ?? defaultValue;
  const [query, setQuery] = useState(initialQuery);
  const [options, setOptions] = useState<TypeaheadOption[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [selectionValid, setSelectionValid] = useState(true);
  const [forcedInvalid, setForcedInvalid] = useState(false);
  const requestIdRef = useRef(0);
  const selectedValueRef = useRef<string | null>(initialQuery.trim() === '' ? null : initialQuery);
  const lastEmittedValueRef = useRef<string | null>(null);
  const listboxId = useId();
  const forcedErrorId = useId();

  useEffect(() => {
    if (value === undefined) return;
    setQuery(value);
    if (lastEmittedValueRef.current === value) {
      lastEmittedValueRef.current = null;
      return;
    }
    selectedValueRef.current = value.trim() === '' ? null : value;
    setSelectionValid(true);
    setForcedInvalid(false);
  }, [value]);

  const isValid = !forcedSuggestion || query.trim() === '' || selectionValid;
  useEffect(() => {
    onValidityChange?.(isValid);
  }, [isValid, onValidityChange]);

  useEffect(
    () => () => {
      requestIdRef.current += 1;
    },
    [],
  );

  const loadOptions = useCallback(
    async (nextQuery: string) => {
      if (nextQuery.trim() === '') {
        requestIdRef.current += 1;
        setOptions([]);
        setOpen(false);
        setLoading(false);
        setActiveIndex(-1);
        setSelectionValid(true);
        setForcedInvalid(false);
        return;
      }

      const requestId = ++requestIdRef.current;
      setLoading(true);
      setOpen(true);
      try {
        const nextOptions = await onInput(nextQuery);
        if (requestId !== requestIdRef.current) return;
        setOptions(nextOptions);
        setOpen(!forcedSuggestion || nextOptions.length > 0);
        setActiveIndex(-1);
        setForcedInvalid(
          forcedSuggestion && nextOptions.length === 0 && selectedValueRef.current !== nextQuery,
        );
      } catch {
        if (requestId !== requestIdRef.current) return;
        setOptions([]);
        setActiveIndex(-1);
      } finally {
        if (requestId === requestIdRef.current) setLoading(false);
      }
    },
    [forcedSuggestion, onInput],
  );

  const selectOption = useCallback(
    (option: TypeaheadOption) => {
      requestIdRef.current += 1;
      setQuery(option.name);
      setOptions([]);
      setOpen(false);
      setLoading(false);
      setActiveIndex(-1);
      selectedValueRef.current = option.name;
      setSelectionValid(true);
      setForcedInvalid(false);
      lastEmittedValueRef.current = option.name;
      onChange?.(option.name);
      onSelect(option);
    },
    [onChange, onSelect],
  );

  const handleChange = (nextQuery: string) => {
    setQuery(nextQuery);
    const retainsSelection = selectedValueRef.current === nextQuery;
    if (!retainsSelection) selectedValueRef.current = null;
    setSelectionValid(nextQuery.trim() === '' || retainsSelection);
    setForcedInvalid(false);
    lastEmittedValueRef.current = nextQuery;
    onChange?.(nextQuery);
    void loadOptions(nextQuery);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;

    if (event.key === 'ArrowDown') {
      if (query.trim() === '') return;
      event.preventDefault();
      if (!open) {
        void loadOptions(query);
        return;
      }
      setActiveIndex((current) => Math.min(current + 1, options.length - 1));
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((current) => Math.max(current - 1, 0));
      return;
    }

    if (event.key === 'Enter' && open && activeIndex >= 0) {
      const option = options[activeIndex];
      if (option) {
        event.preventDefault();
        selectOption(option);
      }
      return;
    }

    if (event.key === 'Escape' && open) {
      event.preventDefault();
      requestIdRef.current += 1;
      setOpen(false);
      setLoading(false);
      setActiveIndex(-1);
    }
  };

  const handleRootBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (event.relatedTarget && event.currentTarget.contains(event.relatedTarget)) return;
    requestIdRef.current += 1;
    setOpen(false);
    setLoading(false);
    setActiveIndex(-1);
    setForcedInvalid(forcedSuggestion && query.trim() !== '' && !selectionValid);
  };

  const showListbox = open && !disabled && query.trim() !== '';
  const showForcedError = forcedSuggestion && forcedInvalid;
  const activeOption = activeIndex >= 0 ? options[activeIndex] : undefined;
  const describedBy = [ariaDescribedBy, showForcedError ? forcedErrorId : undefined]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={['typeahead', showListbox && 'typeahead--open', containerClassName]
        .filter(Boolean)
        .join(' ')}
      onBlur={handleRootBlur}
    >
      <Input
        {...inputProps}
        className={['typeahead__input', className].filter(Boolean).join(' ')}
        value={query}
        onChange={handleChange}
        disabled={disabled}
        submittable={false}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={showListbox}
        aria-controls={listboxId}
        aria-activedescendant={activeOption ? `${listboxId}-${activeOption.id}` : undefined}
        aria-describedby={describedBy || undefined}
        aria-invalid={showForcedError ? true : ariaInvalid}
        onFocus={(event) => {
          onFocus?.(event);
          if (!event.defaultPrevented && query.trim() !== '') void loadOptions(query);
        }}
        onBlur={onBlur}
        onKeyDown={handleKeyDown}
      />

      {showListbox ? (
        <div id={listboxId} className="typeahead__list" role="listbox">
          {loading ? (
            <div className="typeahead__status text-b-s text-light" role="status">
              {loadingMessage}
            </div>
          ) : options.length === 0 ? (
            <div className="typeahead__status text-b-s text-light">{emptyMessage}</div>
          ) : (
            options.map((option, index) => {
              const active = index === activeIndex;
              return (
                <button
                  key={option.id}
                  id={`${listboxId}-${option.id}`}
                  type="button"
                  className={[
                    'typeahead__option',
                    'text-b-m',
                    active && 'typeahead__option--active',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  role="option"
                  aria-selected={active}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => selectOption(option)}
                >
                  {renderOption ? renderOption(option, active) : option.name}
                </button>
              );
            })
          )}
        </div>
      ) : null}
      {showForcedError ? (
        <InfoText
          id={forcedErrorId}
          className="typeahead__error"
          size="small"
          variant="error"
          aria-live="polite"
        >
          {forcedSuggestionMessage}
        </InfoText>
      ) : null}
    </div>
  );
}
