export default function Loading({ label = 'Завантаження...' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-8" role="status">
      <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
      <span>{label}</span>
    </div>
  );
}
