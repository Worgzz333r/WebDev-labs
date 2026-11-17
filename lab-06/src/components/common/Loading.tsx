export default function Loading({ label = 'Завантаження...' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-8" role="status">
      <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
      <span>{label}</span>
    </div>
  );
}

// Компактний спінер для підвантаження сторінок у нескінченному прокручуванні
export function LoadingSpinner({ label = 'Завантаження...' }: { label?: string }) {
  return (
    <div className="flex items-center gap-3" role="status">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
      <span className="text-sm text-gray-500">{label}</span>
    </div>
  );
}
