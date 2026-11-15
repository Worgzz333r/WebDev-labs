import type { ReactNode } from 'react';

interface ListProps<T> {
  items: T[];
  getKey: (item: T) => string | number;
  renderItem: (item: T) => ReactNode;
}

// Вертикальний список записів у картці з розділювачами
export default function List<T>({ items, getKey, renderItem }: ListProps<T>) {
  return (
    <ul className="divide-y divide-gray-200 overflow-hidden rounded-lg bg-white shadow dark:divide-gray-700 dark:bg-gray-900">
      {items.map((item) => (
        <li key={getKey(item)} className="px-6 py-4">
          {renderItem(item)}
        </li>
      ))}
    </ul>
  );
}