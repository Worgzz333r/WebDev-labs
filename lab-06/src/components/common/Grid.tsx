import { Fragment, type ReactNode } from 'react';

interface GridProps<T> {
  items: T[];
  getKey: (item: T) => string | number;
  renderItem: (item: T) => ReactNode;
}

// Адаптивна сітка: 1 колонка на мобільних, 2 на sm, 3 на lg
export default function Grid<T>({ items, getKey, renderItem }: GridProps<T>) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <Fragment key={getKey(item)}>{renderItem(item)}</Fragment>
      ))}
    </div>
  );
}
