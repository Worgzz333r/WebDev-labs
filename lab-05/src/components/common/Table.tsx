import type { ReactNode } from 'react';

export interface Column<T> {
  header: string;
  render: (row: T) => ReactNode;
  className?: string;
}

interface TableProps<T> {
  columns: Column<T>[];
  rows: T[];
  getKey: (row: T) => string | number;
}

export default function Table<T>({ columns, rows, getKey }: TableProps<T>) {
  return (
    <div className="overflow-x-auto rounded-lg bg-white shadow dark:bg-gray-900">
      <table className="min-w-full">
        <thead className="bg-gray-50 dark:bg-gray-800">
          <tr>
            {columns.map((c) => (
              <th key={c.header} className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
          {rows.map((row) => (
            <tr key={getKey(row)}>
              {columns.map((c) => (
                <td key={c.header} className={`px-6 py-4 ${c.className ?? ''}`}>
                  {c.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}