import { useState } from 'react';
import { DayPicker } from 'react-day-picker';
import { uk } from 'react-day-picker/locale';
import 'react-day-picker/style.css';

interface DatePickerFieldProps {
  /** Значення у форматі 'yyyy-MM-dd' або '' (не обрано) */
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
  placeholder?: string;
  /** Показувати кнопку «Скинути» (для фільтрів) */
  allowEmpty?: boolean;
}

// Календар вибору дати (завдання 12) на react-day-picker з українською локаллю.
// Значення — 'yyyy-MM-dd' у локальному часі, щоб не сползати на сусідній день через UTC.
export default function DatePickerField({
  value,
  onChange,
  ariaLabel,
  placeholder = 'Оберіть дату',
  allowEmpty = false,
}: DatePickerFieldProps) {
  const [open, setOpen] = useState(false);

  const selected = value ? new Date(`${value}T00:00:00`) : undefined;
  const display = selected
    ? selected.toLocaleDateString('uk-UA', { dateStyle: 'long' })
    : placeholder;

  return (
    <div className="relative">
      <div className="flex gap-2">
        <button
          type="button"
          aria-label={ariaLabel}
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-left focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-800"
        >
          {display}
        </button>
        {allowEmpty && value && (
          <button
            type="button"
            aria-label={`Очистити: ${ariaLabel}`}
            onClick={() => onChange('')}
            className="rounded border border-gray-300 px-2 text-gray-500 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800"
          >
            ✕
          </button>
        )}
      </div>

      {open && (
        <>
          {/* прозорий фон: клік поза календарем закриває його */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden="true" />
          <div
            role="dialog"
            aria-label={ariaLabel}
            className="absolute left-0 z-50 mt-1 rounded-lg border border-gray-200 bg-white p-3 shadow-lg dark:border-gray-700 dark:bg-gray-900"
          >
            <DayPicker
              mode="single"
              locale={uk}
              selected={selected}
              onSelect={(date) => {
                if (!date) return;
                const y = date.getFullYear();
                const m = String(date.getMonth() + 1).padStart(2, '0');
                const d = String(date.getDate()).padStart(2, '0');
                onChange(`${y}-${m}-${d}`);
                setOpen(false);
              }}
            />
          </div>
        </>
      )}
    </div>
  );
}
