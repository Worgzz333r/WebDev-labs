interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
}

// Базовий компонент для відображення помилок (запити, форми, сторінки)
export default function ErrorMessage({ message, onRetry }: ErrorMessageProps) {
  return (
    <div
      role="alert"
      className="flex items-center justify-between gap-4 rounded border border-red-300 bg-red-50 p-4 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200"
    >
      <span>{message}</span>
      {onRetry && (
        <button type="button" onClick={onRetry} className="text-sm font-medium underline">
          Спробувати знову
        </button>
      )}
    </div>
  );
}
