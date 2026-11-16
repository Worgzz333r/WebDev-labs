import { useState } from 'react';
import {
  Combobox,
  ComboboxButton,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions,
} from '@headlessui/react';

export interface SelectOption {
  id: number | string;
  label: string;
}

interface SearchableSelectProps {
  options: SelectOption[];
  value: SelectOption | null;
  onChange: (value: SelectOption | null) => void;
  placeholder?: string;
  'aria-label'?: string;
}

// Випадне меню з пошуком: список фільтрується за введеним текстом
export default function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Оберіть...',
  'aria-label': ariaLabel,
}: SearchableSelectProps) {
  const [query, setQuery] = useState('');

  const filtered =
    query === ''
      ? options
      : options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()));

  return (
    <Combobox value={value} onChange={onChange} onClose={() => setQuery('')}>
      <div className="relative">
        <ComboboxInput
          aria-label={ariaLabel}
          placeholder={placeholder}
          displayValue={(o: SelectOption | null) => o?.label ?? ''}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full rounded border border-gray-300 bg-white py-2 pl-3 pr-10 dark:border-gray-700 dark:bg-gray-900"
        />
        <ComboboxButton
          className="absolute inset-y-0 right-0 px-3 text-gray-500"
          aria-label="Відкрити список"
        >
          ▾
        </ComboboxButton>
        <ComboboxOptions
          anchor="bottom"
          transition
          className="z-50 mt-1 max-h-60 w-(--input-width) overflow-auto rounded border bg-white py-1 shadow-lg empty:invisible data-closed:opacity-0 dark:border-gray-700 dark:bg-gray-900"
        >
          {filtered.length === 0 && query !== '' && (
            <div className="px-3 py-2 text-sm text-gray-500">Нічого не знайдено</div>
          )}
          {filtered.map((o) => (
            <ComboboxOption
              key={o.id}
              value={o}
              className="cursor-pointer px-3 py-2 data-focus:bg-primary-50 data-selected:font-semibold dark:data-focus:bg-gray-800"
            >
              {o.label}
            </ComboboxOption>
          ))}
        </ComboboxOptions>
      </div>
    </Combobox>
  );
}
